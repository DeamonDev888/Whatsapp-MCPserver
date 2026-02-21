import { FastMCP } from "fastmcp";
import { z } from "zod";
import { WhatsappService } from "../services/whatsappService.js";

export class ListChatsTool {
  private service: WhatsappService;
  private server: FastMCP;

  constructor(server: FastMCP) {
    this.server = server;
    this.service = WhatsappService.getInstance();
  }

  register(): void {
    this.server.addTool({
      name: "list_chats",
      description: "List recent chats from WhatsApp Web.",
      parameters: z.object({
        limit: z.number().default(10).describe("Maximum number of chats to return.")
      }),
      execute: async (args: { limit?: number }) => {
        try {
          const limit = typeof args.limit === 'number' ? args.limit : 10;
          const p = await this.service.getPage();
          
          // Attendre que WhatsApp soit chargé (sidebar présente)
          await p.waitForSelector('#side', { timeout: 15000 });
          await this.service.delay(1000, 3000); 
          
          const chats = await p.evaluate((limit: number) => {
             // Sélecteurs alternatifs pour la liste des chats
             const possible = [
               'div[aria-label="Chat list"] > div[role="listitem"]',
               'div[aria-label="Liste de discussions"] > div[role="listitem"]',
               '#pane-side div[role="listitem"]',
               '#pane-side [data-testid="cell-frame-container"]',
             ];
             
             let chatElements: NodeListOf<Element> | null = null;
             for (const sel of possible) {
               const found = document.querySelectorAll(sel);
               if (found.length > 0) { chatElements = found; break; }
             }
             
             if (!chatElements || chatElements.length === 0) {
               return [{ title: "Aucune discussion trouvée", lastMsg: "Vérifiez que des chats sont chargés dans WhatsApp Web" }];
             }
             
             const result = [];
             for(let i=0; i<chatElements.length && i<limit; i++) {
                 const el = chatElements[i];
                 const titleEl = el.querySelector('span[title], [data-testid="cell-frame-title"] span');
                 const title = titleEl ? (titleEl.getAttribute('title') || titleEl.textContent?.trim() || 'Unknown') : 'Unknown';
                 
                 let lastMsg = "";
                 const msgContainers = el.querySelectorAll('div[dir="auto"], span[dir="ltr"], [data-testid="last-msg-status"] + span');
                 if (msgContainers.length > 0) {
                     msgContainers.forEach(mc => {
                          const t = mc.textContent?.trim();
                          if (t && t !== title && t.length > 0 && t.length < 200) {
                              lastMsg = t;
                          }
                     })
                 }
                 result.push({ title, lastMsg });
             }
             return result;
          }, limit);

          return JSON.stringify(chats, null, 2);
        } catch (error: any) {
          return `Error listing chats: ${error.message || String(error)}. Ensure you are logged in and 'connect_whatsapp' has been called.`;
        }
      },
    });
  }
}
