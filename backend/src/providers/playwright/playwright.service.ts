import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, Page, BrowserContext } from 'playwright';

@Injectable()
export class PlaywrightService implements OnModuleDestroy {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  async initializeBrowser() {
    // Força browser visível para debug
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const forceVisible = this.configService.get('BROWSER_VISIBLE') === 'true';
    
    this.browser = await chromium.launch({
      headless: isProduction && !forceVisible, // Browser visível em desenvolvimento ou quando BROWSER_VISIBLE=true
      slowMo: 50, // Reduzir delay para melhor performance
      devtools: false, // DevTools sempre fechado
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-javascript-harmony-shipping',
        '--disable-component-extensions-with-background-pages',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      ],
    });

    console.log(`🤖 Playwright browser initialized - Headless: ${isProduction && !forceVisible}`);
    console.log(`👀 Browser visível para debug!`);
  }

  async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    this.context = await this.browser!.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
      // Persistir dados para manter sessão
      storageState: this.getStorageStatePath(),
    });

    // Anti-detection
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
    });

    return this.context;
  }

  async createPage(browserSettings?: any): Promise<Page | { page: Page; browser: any }> {
    const settings = browserSettings || {};
    
    // If browser settings are provided, create a new browser instance with those settings
    if (Object.keys(settings).length > 0) {
      const browser = await chromium.launch({
        headless: settings.headless,
        slowMo: 50,
        devtools: false,
        args: this.getBrowserArgs(settings.stealth !== false),
      });

      const contextOptions: any = {
        viewport: settings.viewport || { width: 1280, height: 720 },
        userAgent: settings.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        javaScriptEnabled: true,
        ignoreHTTPSErrors: true,
      };

      const context = await browser.newContext(contextOptions);

      // Apply stealth mode if enabled (default)
      if (settings.stealth !== false) {
        await context.addInitScript(() => {
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
          Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
        });
      }

      const page = await context.newPage();
      
      // Stealth configurations
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      });

      // Store the browser and context for cleanup if not keeping open
      if (!settings.keepOpen) {
        page.on('close', async () => {
          await context.close();
          await browser.close();
        });
      }

      return { page, browser };
    }

    // Use default shared context if no settings provided
    if (!this.context) {
      await this.createContext();
    }

    const page = await this.context!.newPage();
    
    // Stealth configurations
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    return page;
  }

  async closeBrowser() {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private getBrowserArgs(stealth: boolean = true): string[] {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-javascript-harmony-shipping',
      '--disable-component-extensions-with-background-pages',
    ];

    if (stealth) {
      args.push(
        '--disable-blink-features=AutomationControlled',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );
    }

    return args;
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  private getStorageStatePath(): string | undefined {
    const fs = require('fs');
    const path = require('path');
    
    const storageDir = path.join(process.cwd(), '.storage');
    const storageFile = path.join(storageDir, 'betano-session.json');
    
    // Criar diretório se não existir
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    
    // Retornar arquivo se existir
    if (fs.existsSync(storageFile)) {
      console.log('🔄 Restaurando sessão anterior...');
      return storageFile;
    }
    
    return undefined;
  }

  async saveSessionState(): Promise<void> {
    if (!this.context) return;
    
    const fs = require('fs');
    const path = require('path');
    
    const storageDir = path.join(process.cwd(), '.storage');
    const storageFile = path.join(storageDir, 'betano-session.json');
    
    try {
      const state = await this.context.storageState();
      fs.writeFileSync(storageFile, JSON.stringify(state, null, 2));
      console.log('💾 Sessão salva com sucesso');
    } catch (error) {
      console.error('❌ Erro ao salvar sessão:', error);
    }
  }

  async clearSessionState(): Promise<void> {
    const fs = require('fs');
    const path = require('path');
    
    const storageFile = path.join(process.cwd(), '.storage', 'betano-session.json');
    
    try {
      if (fs.existsSync(storageFile)) {
        fs.unlinkSync(storageFile);
        console.log('🗑️ Sessão anterior removida');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar sessão:', error);
    }
  }
}