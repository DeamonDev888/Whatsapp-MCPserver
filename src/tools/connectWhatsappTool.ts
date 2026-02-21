import { FastMCP } from "fastmcp";
import { z } from "zod";
import { WhatsappService } from "../services/whatsappService.js";

export class ConnectWhatsappTool {
  private service: WhatsappService;
  private server: FastMCP;

  constructor(server: FastMCP) {
    this.server = server;
    this.service = WhatsappService.getInstance();
  }

  register(): void {
    this.server.addTool({
      name: "connect_whatsapp",
      description: "Launch browser and connect to WhatsApp Web. Use this to login or verify if you are already logged in.",
      parameters: z.object({
        headless: z.boolean().default(false).describe("Run browser in headless mode. Set to false to scan QR code initially.")
      }),
      execute: async (args: { headless?: boolean }) => {
        try {
          const headless = args.headless !== undefined ? args.headless : false;
          const msg = await this.service.connect(headless);
          return msg;
        } catch (error: any) {
          return `Error connecting: ${error.message || String(error)}`;
        }
      },
    });
  }
}
