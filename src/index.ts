#!/usr/bin/env node

import { FastMCP } from "fastmcp";

// Tools
import { ConnectWhatsappTool } from "./tools/connectWhatsappTool.js";
import { ListChatsTool } from "./tools/listChatsTool.js";
import { SendMessageTool } from "./tools/sendMessageTool.js";
import { ReadMessageTool } from "./tools/readMessageTool.js";

console.log = (...args: any[]) => {
  process.stderr.write(`${args.join(" ")}\n`);
};
console.error = (...args: any[]) => {
  process.stderr.write(`ERROR: ${args.join(" ")}\n`);
};
console.warn = (...args: any[]) => {
  process.stderr.write(`WARN: ${args.join(" ")}\n`);
};

const server = new FastMCP({
  name: "whatsapp-mcp-server",
  version: "1.0.0",
});

new ConnectWhatsappTool(server).register();
new ListChatsTool(server).register();
new SendMessageTool(server).register();
new ReadMessageTool(server).register();

async function cleanup() {
  console.log("Cleaning up Whatsapp MCP Server...");
}

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(0);
});

async function main() {
  console.log(`Starting whatsapp-mcp-server v1.0.0...`);
  try {
    await server.start();
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
}

main();
