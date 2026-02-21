import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { Browser, Page } from "puppeteer";

puppeteer.use(StealthPlugin());

export class WhatsappService {
  private static instance: WhatsappService;
  private browser: Browser | null = null;
  private page: Page | null = null;

  private constructor() {}

  public static getInstance(): WhatsappService {
    if (!WhatsappService.instance) {
      WhatsappService.instance = new WhatsappService();
    }
    return WhatsappService.instance;
  }

  public async delay(min: number, max: number): Promise<void> {
    return new Promise((resolve) =>
      setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min)
    );
  }

  public async connect(headless: boolean = false): Promise<string> {
    // Close existing browser to avoid "WhatsApp ouvert dans une autre fenêtre" conflict
    if (this.browser) {
      try { await this.browser.close(); } catch {}
      this.browser = null;
      this.page = null;
    }

    this.browser = await puppeteer.launch({
      headless: headless,
      userDataDir: "./whatsapp_session",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const pages = await this.browser.pages();
    this.page = pages.length > 0 ? pages[0] : await this.browser.newPage();
    await this.page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    await this.page.goto("https://web.whatsapp.com/", {
      waitUntil: "networkidle2",
    });
    await this.delay(2000, 4000);

    // Auto-dismiss "WhatsApp ouvert dans une autre fenêtre" dialog
    try {
      await this.page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
        const useHere = buttons.find(b =>
          b.textContent?.includes('Utiliser ici') ||
          b.textContent?.includes('Use Here') ||
          b.textContent?.includes('Use here')
        );
        if (useHere) (useHere as HTMLElement).click();
      });
      await this.delay(1500, 2500);
    } catch {
      // Dialog not present — that's fine
    }

    return `Browser launched. Session restored from ./whatsapp_session/. URL: ${this.page.url()}`;
  }

  public async getPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call connect_whatsapp first.");
    }
    if (!this.page) {
      throw new Error("Page not initialized.");
    }
    return this.page;
  }
}
