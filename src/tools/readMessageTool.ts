import { FastMCP } from "fastmcp";
import { z } from "zod";
import { WhatsappService } from "../services/whatsappService.js";

export class ReadMessageTool {
  private service: WhatsappService;
  private server: FastMCP;

  constructor(server: FastMCP) {
    this.server = server;
    this.service = WhatsappService.getInstance();
  }

  register(): void {
    this.server.addTool({
      name: "read_messages",
      description: "Read recent messages from a specific chat by its name.",
      parameters: z.object({
        chatName: z.string().describe("Exact name of the chat or contact."),
        limit: z.number().default(10).describe("Number of recent messages to retrieve (max visible)."),
      }),
      execute: async (args: { chatName: string; limit: number }) => {
        try {
          const { chatName, limit } = args;
          const p = await this.service.getPage();

          // Wait for sidebar to be ready
          await p.waitForSelector('#side', { timeout: 15000 });
          await this.service.delay(500, 1200);

          // Check if the chat is already open (avoid searching if not needed)
          const currentChat = await p.evaluate(() => {
            const header = document.querySelector('header span[title], header [data-testid="conversation-info-header"] span');
            return header ? (header.getAttribute('title') || header.textContent?.trim()) : null;
          });

          let clicked = false;
          if (currentChat && currentChat.toLowerCase().includes(chatName.toLowerCase())) {
            clicked = true;
          } else {
            // Find and click the chat (logic consistent with SendMessageTool)
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
              } catch { continue; }
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
            await p.type(searchInput, chatName, { delay: Math.floor(Math.random() * 100) + 50 });
            
            await this.service.delay(2000, 3500);

            // Try clicking on the result
            const resultSelectors = [
              `span[title="${chatName}"]`,
              `[aria-label="${chatName}"]`,
              `div[role="listitem"] span[title]`,
              `#search-results div[role="listitem"]`,
            ];

            for (const sel of resultSelectors) {
              try {
                const elements = await p.$$(sel);
                for (const el of elements) {
                  const text = await p.evaluate(e => e.getAttribute('title') || e.textContent, el);
                  if (String(text).toLowerCase() === chatName.toLowerCase()) {
                    await el.click();
                    clicked = true;
                    break;
                  }
                }
                if (clicked) break;
              } catch { continue; }
            }

            if (!clicked) {
              await p.keyboard.press('Enter');
              clicked = true; // Assume Enter opened something
            }
          }

          await this.service.delay(1500, 3000);

          // Extract messages
          const messages = await p.evaluate((limit: number) => {
            const main = document.querySelector('#main');
            if (!main) return [];

            // Selectors for message containers
            const msgSelectors = [
              'div[role="row"]',
              'div.message-in',
              'div.message-out',
              '[data-testid="msg-container"]'
            ];

            let rows: Element[] = [];
            for (const sel of msgSelectors) {
              const found = Array.from(main.querySelectorAll(sel));
              if (found.length > rows.length) rows = found;
            }

            // Filter rows that have text content
            const filteredRows = rows.filter(row => {
              const hasText = row.querySelector('.selectable-text, [data-testid="selectable-text"], span');
              return !!hasText && row.textContent?.trim() !== "";
            });

            const recentRows = filteredRows.slice(-limit);

            return recentRows.map(row => {
              // Try to find the specific text element
              const textEl = row.querySelector('.selectable-text, [data-testid="selectable-text"]');
              const content = textEl ? textEl.textContent?.trim() : row.querySelector('span')?.textContent?.trim() || "";
              
              const metaEl = row.querySelector('[data-pre-plain-text]'); 
              let timestamp = "";
              let sender = "";

              if (metaEl) {
                const meta = metaEl.getAttribute('data-pre-plain-text');
                if (meta) {
                  const matches = meta.match(/\[(.*?)\]\s*(.*?):/);
                  if (matches) {
                    timestamp = matches[1];
                    sender = matches[2];
                  }
                }
              }

              if (!sender) {
                const isIncoming = row.className.includes('message-in') || !!row.querySelector('.message-in');
                const isOutgoing = row.className.includes('message-out') || !!row.querySelector('.message-out');
                sender = isOutgoing ? "Me" : (isIncoming ? "Contact" : "Unknown");
              }
              
              // If still no content but it's a valid row, use the whole text (might include time)
              const finalContent = content || row.textContent?.trim() || "";

              return {
                sender,
                content: finalContent,
                timestamp
              };
            });
          }, limit);

          if (messages.length === 0) {
            return `No messages found in chat "${chatName}". If the chat is empty or just opened, try waiting a few seconds.`;
          }

          return JSON.stringify({
            chat: chatName,
            messages: messages
          }, null, 2);

        } catch (error: any) {
          return `❌ Error reading messages: ${error.message || String(error)}`;
        }
      },
    });
  }
}
