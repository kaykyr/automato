import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, Browser, Page, BrowserContext, Cookie } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PlaywrightStealthService implements OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightStealthService.name);
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private readonly storageDir: string;
  private readonly sessionFile: string;
  private readonly cookiesFile: string;

  constructor(private readonly configService: ConfigService) {
    this.storageDir = path.join(process.cwd(), '.storage');
    this.sessionFile = path.join(this.storageDir, 'betano-session.json');
    this.cookiesFile = path.join(this.storageDir, 'betano-cookies.json');
    
    // Criar diretório se não existir
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  async onModuleDestroy() {
    await this.closeBrowser();
  }

  async initializeBrowser() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const forceVisible = this.configService.get('BROWSER_VISIBLE') === 'true';
    
    this.logger.log('🚀 Iniciando browser com modo stealth avançado...');
    
    // Configurações de stealth máximas
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--flag-switches-begin',
      '--disable-site-isolation-trials',
      '--flag-switches-end',
      '--disable-features=TranslateUI',
      '--disable-features=BlinkGenPropertyTrees',
      '--disable-features=ImprovedCookieControls,LaxSameSiteCookiesAreEnabled,SameSiteByDefaultCookies',
      '--disable-features=AudioServiceOutOfProcess',
      '--disable-features=CrossSiteDocumentBlockingAlways',
      '--disable-features=CrossSiteDocumentBlockingIfIsolating',
      '--disable-features=IsolateOrigins',
      '--disable-features=site-per-process',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--disable-features=RendererCodeIntegrity',
      '--disable-features=RendererCodeIntegrityEnabled',
      '--disable-features=PaintHolding',
      '--disable-features=InterestCohortAPI',
      '--disable-features=PrivacySandboxSettings',
      '--disable-features=TextFragmentAnchor',
      '--disable-features=IdleDetection',
      '--disable-features=FederatedLearningOfCohorts',
      '--disable-features=TrustTokens',
      '--disable-features=ReducedReferrerGranularity',
      '--disable-features=ConversionMeasurement',
      '--disable-features=AutofillEnableAccountWalletStorage',
      '--disable-features=AutofillServerCommunication',
      '--disable-features=SignedHTTPExchange',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=UserAgentClientHint',
      '--disable-features=MediaDevicesSystemMonitoringOnLinux',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--force-webrtc-ip-handling-policy=default_public_interface_only',
      '--disable-features=WebRtcHideLocalIpsWithMdns',
      '--disable-features=WebRTC-H264WithOpenH264FFmpeg',
      '--disable-features=OptimizationGuideModelDownloading',
      '--disable-features=ChromeWhatsNewUI',
      '--disable-features=DownloadBubble',
      '--disable-features=DownloadBubbleV2',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      '--disable-sync',
      '--disable-features=GlobalMediaControls',
      '--disable-features=DestroyProfileOnBrowserClose',
      '--disable-features=Translate',
      '--metrics-recording-only',
      '--no-pings',
      '--password-store=basic',
      '--use-mock-keychain',
      '--disable-component-update',
      '--disable-features=OptimizationHints',
      '--disable-features=OptimizationHintsFetching',
      '--disable-features=OptimizationTargetPrediction',
      '--disable-features=OptimizationHintsFetchingAnonymousDataConsent',
      '--disable-features=NetworkTimeServiceQuerying',
      '--disable-background-networking',
      '--disable-breakpad',
      '--disable-component-cloud-policy',
      '--disable-cloud-policy-on-signin',
      '--disable-features=CrashReporterEnabled',
      '--disable-features=CertificateTransparencyComponentUpdater',
      '--disable-features=AutofillAssistantChromeEntry',
      '--disable-features=CalculateNativeWinOcclusion',
      '--disable-domain-reliability',
      '--disable-features=EnterpriseRealtimeExtensionRequest',
      '--disable-features=MediaRouter',
      '--disable-features=DialMediaRouteProvider',
      '--disable-features=AcceptCHFrame',
      '--disable-features=AllowPopupsDuringPageUnload',
      '--disable-features=AutofillEnableOfferToSaveInChromeSyncTransportMode',
      '--disable-features=CastMediaRouteProvider',
      '--disable-features=ComputePressure',
      '--disable-features=CrashReporting',
      '--disable-features=CustomJumpList',
      '--disable-features=DirectSockets',
      '--disable-features=EnableStructuredMetrics',
      '--disable-features=EnterpriseRealtimeExtensionRequest',
      '--disable-features=FedCm',
      '--disable-features=Fledge',
      '--disable-features=HandwritingRecognitionWebPlatformApiFinch',
      '--disable-features=HappinessTrackingSurveysForDesktopDevTools',
      '--disable-features=HeavyAdIntervention',
      '--disable-features=HeavyAdPrivacyMitigations',
      '--disable-features=IPH_DesktopPwaInstallView',
      '--disable-features=IPH_DesktopSnoozeFeature',
      '--disable-features=ImprovedCookieControls',
      '--disable-features=InterestCohortFeaturePolicy',
      '--disable-features=LensStandalone',
      '--disable-features=LightweightNoStatePrefetch',
      '--disable-features=MediaDrmPreprovisioning',
      '--disable-features=NavigationRequestPreconnect',
      '--disable-features=NetworkTimeServiceQuerying',
      '--disable-features=NotificationPermissionRevocationEnabled',
      '--disable-features=NotificationScheduleService',
      '--disable-features=NotificationTriggers',
      '--disable-features=OfflineContentOnNetworkError',
      '--disable-features=OptimizationGuideForNavigationStartup',
      '--disable-features=OptimizationGuideModelExecution',
      '--disable-features=OptimizationGuideModelPush',
      '--disable-features=OptimizationGuidePageContentFetching',
      '--disable-features=OptimizationGuidePageExperience',
      '--disable-features=OptimizationGuidePersonalizedFetching',
      '--disable-features=PasswordStrengthIndicator',
      '--disable-features=PermissionPredictions',
      '--disable-features=PreconnectToSearchEngineOnOmniboxFocus',
      '--disable-features=PreloadMediaEngagementData',
      '--disable-features=PreloadTopSites',
      '--disable-features=Privacy',
      '--disable-features=PrivacyGuide2',
      '--disable-features=PrivacySandboxAdsAPIsOverride',
      '--disable-features=PrivacySandboxSettings2',
      '--disable-features=ProcessPerSiteUpToMainFrameThreshold',
      '--disable-features=Recycle',
      '--disable-features=SCTAuditing',
      '--disable-features=SafeBrowsingBetterTelemetryAcrossReports',
      '--disable-features=SafetyCheck',
      '--disable-features=SafetyTip',
      '--disable-features=SegmentationPlatformFeature',
      '--disable-features=ServiceWorkerUpdateDelay',
      '--disable-features=SharedArrayBuffer',
      '--disable-features=SignedHTTPExchangeOriginTrial',
      '--disable-features=SubresourceWebBundles',
      '--disable-features=TabSearch',
      '--disable-features=TextFragmentColorChange',
      '--disable-features=TopicsAPI',
      '--disable-features=WinRetrieveSuggestionsOnlyOnDemand',
      '--disable-features=WinUseBrowserSpellChecker',
      '--disable-features=UsernameFirstFlow',
      '--disable-features=UmaStorageDimensions',
      '--disable-features=UnexpectedKeyboardAccessoryMetricsReporter',
      '--disable-features=UnsafeWebGPU',
      '--disable-features=UseGroupNamesInPasswordManagerUI',
      '--disable-features=WebAppInstallation',
      '--disable-features=WebAppManifestDisplayOverride',
      '--disable-features=WebAppShortcutsMenu',
      '--disable-features=WebUI',
      '--disable-features=WebUIBubblePerProfilePersistence',
      '--disable-features=WebUICodeCache',
      '--disable-notifications',
      '--disable-popup-blocking',
      '--disable-features=AutoExpandDetailsElement',
      '--disable-features=CookiesWithoutSameSiteMustBeSecure',
      '--disable-features=SameSiteDefaultChecksMethodRigorously',
      '--disable-features=StandardCompliantNonSpecialSchemeURLParsing',
      '--disable-infobars',
      '--exclude-switches=enable-automation',
      '--disable-features=UserAgentClientHint',
      '--disable-features=WebAuthnConditionalUI',
    ];
    
    // User agents mais realistas e variados
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    ];
    
    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
    args.push(`--user-agent=${randomUserAgent}`);
    
    this.browser = await chromium.launch({
      headless: isProduction && !forceVisible,
      args,
      ignoreDefaultArgs: [
        '--enable-automation',
        '--enable-blink-features=AutomationControlled',
      ],
    });

    this.logger.log(`🎭 Browser iniciado com user agent: ${randomUserAgent}`);
    this.logger.log(`👁️ Modo headless: ${isProduction && !forceVisible}`);
  }

  async createContext(): Promise<BrowserContext> {
    if (!this.browser) {
      await this.initializeBrowser();
    }

    // Configurações de contexto com stealth
    const contextOptions: any = {
      viewport: { width: 1920, height: 1080 }, // Resolução mais comum
      screen: { width: 1920, height: 1080 },
      hasTouch: false,
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
      bypassCSP: true,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      permissions: ['geolocation', 'notifications'],
      geolocation: { longitude: -46.6333, latitude: -23.5505 }, // São Paulo
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      forcedColors: 'none',
      extraHTTPHeaders: {
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,es;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    };

    // Tentar carregar sessão anterior
    const existingState = await this.loadStorageState();
    if (existingState) {
      contextOptions.storageState = existingState;
      this.logger.log('📂 Sessão anterior carregada com sucesso');
    }

    this.context = await this.browser!.newContext(contextOptions);

    // Scripts de stealth extremo
    await this.context.addInitScript(() => {
      // Remove webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });
      
      // Mock plugins realistas
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          const pluginData = [
            {
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 2,
              name: "Chrome PDF Plugin"
            },
            {
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 2,
              name: "Chrome PDF Viewer"
            },
            {
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 2,
              name: "Microsoft Edge PDF Plugin"
            },
            {
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 2,
              name: "Microsoft Edge PDF Viewer"
            },
            {
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 2,
              name: "PDF Viewer"
            },
            {
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 2,
              name: "WebKit built-in PDF"
            }
          ];
          return Object.create(PluginArray.prototype, {
            length: { value: pluginData.length },
            ...pluginData.reduce((acc, plugin, index) => {
              acc[index] = { value: plugin };
              return acc;
            }, {})
          });
        }
      });
      
      // Mock mimeTypes
      Object.defineProperty(navigator, 'mimeTypes', {
        get: () => {
          const mimeData = [
            {
              type: "application/pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: navigator.plugins[0]
            },
            {
              type: "text/pdf",
              suffixes: "pdf",
              description: "Portable Document Format",
              enabledPlugin: navigator.plugins[0]
            }
          ];
          return Object.create(MimeTypeArray.prototype, {
            length: { value: mimeData.length },
            ...mimeData.reduce((acc, mime, index) => {
              acc[index] = { value: mime };
              return acc;
            }, {})
          });
        }
      });
      
      // Mock languages mais realista
      Object.defineProperty(navigator, 'languages', {
        get: () => ['pt-BR', 'pt', 'en-US', 'en']
      });
      
      // Mock vendor
      Object.defineProperty(navigator, 'vendor', {
        get: () => 'Google Inc.'
      });
      
      // Mock platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32'
      });
      
      // Mock hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });
      
      // Mock device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });
      
      // Mock connection
      Object.defineProperty(navigator, 'connection', {
        get: () => ({
          effectiveType: '4g',
          rtt: 50,
          downlink: 10,
          saveData: false
        })
      });
      
      // Chrome específico
      (window as any).chrome = {
        app: {
          isInstalled: false,
          InstallState: {
            DISABLED: 'disabled',
            INSTALLED: 'installed',
            NOT_INSTALLED: 'not_installed'
          },
          RunningState: {
            CANNOT_RUN: 'cannot_run',
            READY_TO_RUN: 'ready_to_run',
            RUNNING: 'running'
          }
        },
        runtime: {
          OnInstalledReason: {
            CHROME_UPDATE: 'chrome_update',
            INSTALL: 'install',
            SHARED_MODULE_UPDATE: 'shared_module_update',
            UPDATE: 'update'
          },
          OnRestartRequiredReason: {
            APP_UPDATE: 'app_update',
            OS_UPDATE: 'os_update',
            PERIODIC: 'periodic'
          },
          PlatformArch: {
            ARM: 'arm',
            ARM64: 'arm64',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          },
          PlatformNaclArch: {
            ARM: 'arm',
            MIPS: 'mips',
            MIPS64: 'mips64',
            X86_32: 'x86-32',
            X86_64: 'x86-64'
          },
          PlatformOs: {
            ANDROID: 'android',
            CROS: 'cros',
            FUCHSIA: 'fuchsia',
            LINUX: 'linux',
            MAC: 'mac',
            OPENBSD: 'openbsd',
            WIN: 'win'
          },
          RequestUpdateCheckStatus: {
            NO_UPDATE: 'no_update',
            THROTTLED: 'throttled',
            UPDATE_AVAILABLE: 'update_available'
          },
          connect: () => {},
          sendMessage: () => {}
        }
      };
      
      // WebGL vendor
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter.apply(this, arguments);
      };
      
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel Iris OpenGL Engine';
        }
        return getParameter2.apply(this, arguments);
      };
      
      // Permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = function(parameters: any) {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'default' } as any);
        }
        return originalQuery(parameters);
      } as any;
      
      // Battery API
      (navigator as any).getBattery = () => {
        return Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1.0,
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => true
        });
      };
      
      // Remove automation indicators
      delete (window.navigator as any).__proto__.webdriver;
      
      // Canvas fingerprint protection
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = function(...args) {
        const context = this.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] ^= Math.floor(Math.random() * 10);
            imageData.data[i + 1] ^= Math.floor(Math.random() * 10);
            imageData.data[i + 2] ^= Math.floor(Math.random() * 10);
          }
          context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, args);
      };
      
      // Audio fingerprint protection
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContext();
      const originalCreateAnalyser = audioContext.createAnalyser;
      audioContext.__proto__.createAnalyser = function() {
        const analyser = originalCreateAnalyser.apply(this, arguments);
        const originalGetFloatFrequencyData = analyser.getFloatFrequencyData;
        analyser.getFloatFrequencyData = function(array) {
          originalGetFloatFrequencyData.apply(this, arguments);
          for (let i = 0; i < array.length; i++) {
            array[i] = array[i] + Math.random() * 0.1;
          }
        };
        return analyser;
      };
      
      // WebRTC protection
      const originalRTCPeerConnection = window.RTCPeerConnection;
      window.RTCPeerConnection = new Proxy(originalRTCPeerConnection, {
        construct: function(target, args) {
          const pc = new target(...args);
          pc.addEventListener('icecandidate', function(event) {
            if (event.candidate && event.candidate.candidate) {
              const parts = event.candidate.candidate.split(' ');
              if (parts[7] === 'host') {
                return;
              }
            }
          });
          return pc;
        }
      });
      
      // Timezone mock
      Date.prototype.getTimezoneOffset = function() { return -180; }; // Brasil
      
      // Console protection
      const originalConsoleDebug = console.debug;
      console.debug = function(...args) {
        if (args[0] && args[0].includes('HeadlessChrome')) {
          return;
        }
        return originalConsoleDebug.apply(console, args);
      };
    });

    // Configurar interceptação de requests
    await this.context.route('**/*', async (route) => {
      const request = route.request();
      const headers = await request.allHeaders();
      
      // Remover headers suspeitos
      delete headers['sec-ch-ua-full-version'];
      delete headers['sec-ch-ua-full-version-list'];
      delete headers['sec-ch-ua-model'];
      delete headers['sec-ch-ua-platform-version'];
      delete headers['sec-ch-ua-arch'];
      delete headers['sec-ch-ua-bitness'];
      
      await route.continue({ headers });
    });

    return this.context;
  }

  async createPage(): Promise<Page> {
    if (!this.context) {
      await this.createContext();
    }

    const page = await this.context!.newPage();
    
    // Configurações extras de página
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8,es;q=0.7',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Cache-Control': 'max-age=0',
    });
    
    // Simular comportamento humano
    await this.addHumanBehavior(page);
    
    return page;
  }

  private async addHumanBehavior(page: Page) {
    // Mouse movements aleatórios
    page.on('load', async () => {
      try {
        const width = await page.evaluate(() => window.innerWidth);
        const height = await page.evaluate(() => window.innerHeight);
        
        // Movimento inicial do mouse
        for (let i = 0; i < 3; i++) {
          const x = Math.random() * width;
          const y = Math.random() * height;
          await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 });
          await this.delay(Math.random() * 500 + 200);
        }
      } catch (error) {
        // Ignorar erros de movimento do mouse
      }
    });
    
    // Interceptar chamadas suspeitas - adicionar ao contexto, não à página
    await page.addInitScript(() => {
      // Override de funções que podem detectar automação
      const originalElementFromPoint = document.elementFromPoint;
      document.elementFromPoint = function(...args) {
        if (args[0] === 0 && args[1] === 0) {
          return null;
        }
        return originalElementFromPoint.apply(document, args);
      };
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async closeBrowser() {
    // Salvar estado antes de fechar
    await this.saveStorageState();
    
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  getBrowser(): Browser | null {
    return this.browser;
  }

  async saveStorageState(): Promise<void> {
    if (!this.context) return;
    
    try {
      // Salvar estado completo
      const state = await this.context.storageState();
      fs.writeFileSync(this.sessionFile, JSON.stringify(state, null, 2));
      
      // Salvar cookies separadamente para análise
      if (state.cookies && state.cookies.length > 0) {
        fs.writeFileSync(this.cookiesFile, JSON.stringify(state.cookies, null, 2));
      }
      
      this.logger.log('💾 Sessão e cookies salvos com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao salvar sessão:', error);
    }
  }

  private async loadStorageState(): Promise<any> {
    try {
      if (fs.existsSync(this.sessionFile)) {
        const state = JSON.parse(fs.readFileSync(this.sessionFile, 'utf-8'));
        this.logger.log('📁 Estado da sessão carregado do arquivo');
        return state;
      }
    } catch (error) {
      this.logger.error('❌ Erro ao carregar sessão:', error);
    }
    return null;
  }

  async clearSessionState(): Promise<void> {
    try {
      if (fs.existsSync(this.sessionFile)) {
        fs.unlinkSync(this.sessionFile);
      }
      if (fs.existsSync(this.cookiesFile)) {
        fs.unlinkSync(this.cookiesFile);
      }
      this.logger.log('🗑️ Sessão e cookies removidos');
    } catch (error) {
      this.logger.error('❌ Erro ao limpar sessão:', error);
    }
  }

  async injectCookies(cookies: Cookie[]): Promise<void> {
    if (!this.context) return;
    
    try {
      await this.context.addCookies(cookies);
      this.logger.log('🍪 Cookies injetados com sucesso');
    } catch (error) {
      this.logger.error('❌ Erro ao injetar cookies:', error);
    }
  }

  async getCookies(): Promise<Cookie[]> {
    if (!this.context) return [];
    
    try {
      const cookies = await this.context.cookies();
      return cookies;
    } catch (error) {
      this.logger.error('❌ Erro ao obter cookies:', error);
      return [];
    }
  }
}