import { FastMCP } from "fastmcp";
import { z } from "zod";
import { WhatsappService } from "../services/whatsappService.js";

export class SendMessageTool {
  private service: WhatsappService;
  private server: FastMCP;

  constructor(server: FastMCP) {
    this.server = server;
    this.service = WhatsappService.getInstance();
  }

  register(): void {
    this.server.addTool({
      name: "send_message",
      description: "Select a chat by its exact name and send a message.",
      parameters: z.object({
        chatName: z.string().describe("Exact name of the chat or contact."),
        message: z.string().describe("Message content to send."),
      }),
      execute: async (args: { chatName: string; message: string }) => {
        try {
          const { chatName, message } = args;
          const p = await this.service.getPage();
          
          // Wait for sidebar to be ready
          await p.waitForSelector('#side', { timeout: 15000 });
          await this.service.delay(500, 1200);

          // Try multiple selectors for the search input (FR/EN WhatsApp)
          const searchSelectors = [
            "div[contenteditable='true'][data-tab='3']",
            "div[role='textbox'][title='Champ de recherche']",
            "div[role='textbox'][aria-label='Champ de recherche']",
            "#side div[contenteditable='true']",
          ];
          
          let searchInput = null;
          for (const sel of searchSelectors) {
            try {
              await p.waitForSelector(sel, { timeout: 3000 });
              searchInput = sel;
              break;
            } catch (_) { continue; }
          }
          
          if (!searchInput) throw new Error("Search input not found. Make sure WhatsApp Web is loaded.");

          await this.service.delay(400, 900);
          await p.click(searchInput);
          await this.service.delay(300, 700);
          
          // Clear and type contact name
          await p.keyboard.down('Control');
          await p.keyboard.press('A');
          await p.keyboard.up('Control');
          await this.service.delay(200, 400);
          await p.keyboard.press('Backspace');
          await this.service.delay(300, 800);
          await p.type(searchInput, chatName, { delay: Math.floor(Math.random() * 200) + 100 });
          
          // Wait for search results — try span[title] or any visible result
          await this.service.delay(1500, 3000);
          
          // Try clicking on the result
          const resultSelectors = [
            `span[title="${chatName}"]`,
            `[aria-label="${chatName}"]`,
            `div[role="listitem"] span[title]`,
            `#search-results div[role="listitem"]`,
          ];
          
          let clicked = false;
          for (const sel of resultSelectors) {
            try {
              const el = await p.$(sel);
              if (el) {
                const text = await p.evaluate(e => e.getAttribute('title') || e.textContent, el);
                if (!chatName || String(text).includes(chatName) || sel.includes(chatName)) {
                  await el.click();
                  clicked = true;
                  break;
                }
              }
            } catch (_) { continue; }
          }
          
          if (!clicked) {
            // Fallback: press Enter to open first result
            await p.keyboard.press('Enter');
          }
          
          await this.service.delay(1000, 2500);
          
          // Message input selectors
          const msgSelectors = [
            "div[contenteditable='true'][data-tab='10']",
            "div[contenteditable='true'][data-tab='11']",
            "div[contenteditable='true'][data-tab='6']",
            "footer div[contenteditable='true']",
            "div[role='textbox'][aria-label*='message']",
            "div[role='textbox'][title='Entrez du texte']",
            "div[role='textbox']",
          ];

          let msgInput = null;
          for (const sel of msgSelectors) {
            try {
              await p.waitForSelector(sel, { timeout: 3000 });
              msgInput = sel;
              break;
            } catch (_) { continue; }
          }
          
          if (!msgInput) throw new Error("Message input not found after opening chat.");
          
          await p.click(msgInput);
          await this.service.delay(600, 1500);
          await p.type(msgInput, message, { delay: Math.floor(Math.random() * 150) + 50 });
          await this.service.delay(400, 1000);
          await p.keyboard.press('Enter');
          
          return `✅ Message sent to "${chatName}" successfully.`;
        } catch (error: any) {
          return `❌ Error sending message: ${error.message || String(error)}`;
        }
      },
    });
  }
}
