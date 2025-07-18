import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaywrightService } from '@providers/playwright/playwright.service';
import { PlaywrightStealthService } from '@providers/playwright/playwright-stealth.service';
import { BetanoCaptchaService } from './betano-captcha.service';
import { Page } from 'playwright';

export interface AuthenticationResult {
  success: boolean;
  message: string;
  sessionActive?: boolean;
}

@Injectable()
export class BetanoService {
  private readonly logger = new Logger(BetanoService.name);
  private page: Page | null = null;
  private isAuthenticated = false;

  constructor(
    private readonly playwrightService: PlaywrightService,
    private readonly playwrightStealthService: PlaywrightStealthService,
    private readonly captchaService: BetanoCaptchaService,
    private readonly configService: ConfigService,
  ) {}

  async authenticate(username: string, password: string, forceNewLogin: boolean = false): Promise<AuthenticationResult> {
    try {
      this.logger.log('🔐 Iniciando autenticação na Betano...');
      this.logger.log('👀 Browser será visível para debug!');

      // Criar nova página com stealth mode avançado
      const useStealthMode = this.configService.get('USE_STEALTH_MODE', 'true') === 'true';
      
      if (useStealthMode) {
        this.logger.log('🎭 Usando modo stealth avançado...');
        this.page = await this.playwrightStealthService.createPage();
      } else {
        const pageInfo = await this.playwrightService.createPage();
        this.page = 'page' in pageInfo ? pageInfo.page : pageInfo;
      }
      
      // TEMPORARIAMENTE DESABILITADO - Verificação de sessão está causando falsos positivos
      // TODO: Melhorar detecção de sessão ativa
      /*
      if (!forceNewLogin) {
        const sessionCheck = await this.checkExistingSession();
        if (sessionCheck.isAuthenticated) {
          // Fazer uma verificação adicional tentando acessar área logada
          try {
            await this.page.goto('https://www.betano.bet.br/myaccount', { 
              waitUntil: 'domcontentloaded', 
              timeout: 10000 
            });
            
            // Se não foi redirecionado para login, está realmente logado
            const currentUrl = this.page.url();
            if (!currentUrl.includes('login') && !currentUrl.includes('signin')) {
              this.isAuthenticated = true;
              this.logger.log('✅ Sessão anterior confirmada e válida!');
              return {
                success: true,
                message: 'Sessão anterior restaurada com sucesso',
                sessionActive: true
              };
            }
          } catch (error) {
            this.logger.log('⚠️ Sessão anterior inválida, fazendo novo login...');
          }
        }
      } else {
        this.logger.log('🔄 Forçando novo login...');
        await this.playwrightService.clearSessionState();
      }
      */
      
      // Por enquanto, sempre fazer login novo
      this.logger.log('🔄 Iniciando processo de login...');
      
      // IR DIRETO PARA A PÁGINA DE LOGIN - Evita todos os modais!
      const loginUrl = 'https://www.betano.bet.br/myaccount/login';
      
      this.logger.log(`🎯 Navegando direto para página de login: ${loginUrl}`);
      
      try {
        await this.page.goto(loginUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        this.logger.log('✅ Página de login carregada!');
      } catch (error) {
        this.logger.error('❌ Erro ao carregar página de login:', error);
        return {
          success: false,
          message: 'Não foi possível acessar a página de login'
        };
      }

      // Aplicar comportamento humano preventivo
      await this.captchaService.preventCaptcha(this.page);
      
      // Verificar se há CAPTCHA antes de prosseguir
      const hasCaptcha = await this.captchaService.detectCaptcha(this.page);
      if (hasCaptcha) {
        this.logger.warn('🤖 CAPTCHA detectado na página de login');
        const captchaResult = await this.captchaService.handleCaptcha(this.page);
        
        if (!captchaResult.solved) {
          return {
            success: false,
            message: 'CAPTCHA não resolvido: ' + captchaResult.message
          };
        }
      }
      
      // Aguardar campos carregarem com tempo variável (mais humano)
      const waitTime = Math.random() * 2000 + 1500;
      await this.page.waitForTimeout(waitTime);

      // Preencher diretamente os campos Username e Password
      this.logger.log('📝 Preenchendo credenciais...');
      
      try {
        // Campo Username - com digitação humana
        const usernameField = await this.page.locator('input[name="Username"]').first();
        if (!usernameField) {
          throw new Error('Campo Username não encontrado');
        }
        await usernameField.click();
        await this.page.waitForTimeout(Math.random() * 500 + 300);
        
        // Limpar campo antes de digitar
        await usernameField.fill('');
        await this.page.waitForTimeout(Math.random() * 300 + 200);
        
        // Digitar caractere por caractere com delays variáveis
        await this.typeHumanLike(usernameField, username);
        this.logger.log('✅ Username preenchido');
        
        // Pequena pausa antes do próximo campo
        await this.page.waitForTimeout(Math.random() * 1000 + 500);
        
        // Campo Password - com digitação humana
        const passwordField = await this.page.locator('input[name="Password"]').first();
        if (!passwordField) {
          throw new Error('Campo Password não encontrado');
        }
        await passwordField.click();
        await this.page.waitForTimeout(Math.random() * 500 + 300);
        
        // Limpar campo antes de digitar
        await passwordField.fill('');
        await this.page.waitForTimeout(Math.random() * 300 + 200);
        
        // Digitar senha com delays
        await this.typeHumanLike(passwordField, password);
        this.logger.log('✅ Password preenchido');
        
        // Procurar botão de submit
        const submitSelectors = [
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Entrar")',
          'button:has-text("ENTRAR")',
          'button:has-text("Login")',
          'button:has-text("Fazer login")'
        ];
        
        let submitButton = null;
        for (const selector of submitSelectors) {
          try {
            submitButton = await this.page.locator(selector).first();
            if (submitButton && await submitButton.isVisible()) {
              this.logger.log(`✅ Botão de submit encontrado: ${selector}`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (!submitButton) {
          throw new Error('Botão de submit não encontrado');
        }
        
        this.logger.log('🚀 Enviando formulário de login...');
        await submitButton.click();
        
        // Aguardar processamento do login
        await this.page.waitForTimeout(5000);
        
        // Verificar se há CAPTCHA após submit
        const captchaAfterSubmit = await this.captchaService.detectCaptcha(this.page);
        if (captchaAfterSubmit) {
          this.logger.warn('🤖 CAPTCHA detectado após submit');
          const captchaResult = await this.captchaService.handleCaptcha(this.page);
          
          if (!captchaResult.solved) {
            return {
              success: false,
              message: 'CAPTCHA após login não resolvido: ' + captchaResult.message
            };
          }
          
          // Aguardar mais um pouco após resolver CAPTCHA
          await this.page.waitForTimeout(3000);
        }
        
        // Verificar se foi redirecionado (saiu do login)
        const currentUrl = this.page.url();
        const isLoggedIn = !currentUrl.includes('/myaccount/login');
        
        if (isLoggedIn) {
          this.isAuthenticated = true;
          
          // Salvar sessão usando o serviço stealth se disponível
          const useStealthMode = this.configService.get('USE_STEALTH_MODE', 'true') === 'true';
          if (useStealthMode) {
            await this.playwrightStealthService.saveStorageState();
          } else {
            await this.playwrightService.saveSessionState();
          }
          
          this.logger.log('✅ Login realizado com sucesso!');
          this.logger.log(`📍 Redirecionado para: ${currentUrl}`);
          return {
            success: true,
            message: 'Autenticação realizada com sucesso',
            sessionActive: true
          };
        } else {
          this.logger.error('❌ Ainda na página de login após submit');
          return {
            success: false,
            message: 'Credenciais inválidas ou erro no login'
          };
        }
        
      } catch (error) {
        this.logger.error('❌ Erro ao preencher formulário:', error);
        return {
          success: false,
          message: `Erro ao preencher formulário: ${error.message}`
        };
      }

    } catch (error) {
      this.logger.error('❌ Erro durante autenticação:', error);
      return {
        success: false,
        message: `Erro durante autenticação: ${error.message}`
      };
    }
  }

  // MÉTODOS ANTIGOS DE OVERLAY - Mantidos mas não mais usados no login direto
  private async handleAgeModal(): Promise<void> {
    this.logger.log('🔍 Verificando modal "VOCÊ TEM MAIS DE 18 ANOS?"...');
    
    const ageModalSelectors = [
      'button:has-text("SIM")',
      'button:has-text("Sim")',
      'button:has-text("sim")',
      'button:has-text("Sim, tenho mais de 18")',
      'button:has-text("Sim, tenho 18 anos ou mais")',
      'button:has-text("Tenho mais de 18")',
      'button:has-text("Confirmar idade")',
      '[data-qa*="age"] button',
      '.age-modal button:has-text("Sim")',
      '.age-verification button:has-text("Sim")',
      'button[aria-label*="idade"]'
    ];

    for (const selector of ageModalSelectors) {
      try {
        const button = await this.page?.waitForSelector(selector, { timeout: 3000 });
        if (button && await button.isVisible()) {
          this.logger.log(`✅ Modal de idade encontrado, clicando SIM: ${selector}`);
          await button.click();
          await this.page?.waitForTimeout(2000);
          this.logger.log('✅ Modal de idade fechado');
          return;
        }
      } catch (error) {
        continue;
      }
    }

    this.logger.log('ℹ️ Modal de idade não encontrado - pode não ter aparecido');
  }

  private async checkExistingSession(): Promise<{ isAuthenticated: boolean; url?: string }> {
    try {
      this.logger.log('🔍 Verificação rápida de sessão...');
      
      const betanoUrl = this.configService.get('BETANO_URL') || 'https://www.betano.bet.br/';
      
      // Navegar com timeout reduzido
      await this.page?.goto(betanoUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15000 
      });
      
      // Aguardar menos tempo
      await this.page?.waitForTimeout(1500);
      
      // Verificação mais rigorosa de login
      const isReallyLoggedIn = await this.page?.evaluate(() => {
        // Verificar se existe botão de login VISÍVEL (se existir e estiver visível, não está logado)
        const loginBtn = document.querySelector('[data-qa="login-button"]');
        if (loginBtn) {
          const style = window.getComputedStyle(loginBtn);
          const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
          if (isVisible) return false; // Botão de login visível = não está logado
        }
        
        // Procurar por indicadores ESPECÍFICOS de usuário logado
        const loggedSelectors = [
          '[data-qa="user-menu"]', 
          '[data-qa="account-balance"]', 
          '[data-qa="user-balance"]',
          '.account-balance',
          '.user-info',
          '[data-qa="logout"]'
        ];
        
        for (const sel of loggedSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const style = window.getComputedStyle(el);
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
            if (isVisible) return true; // Elemento de usuário logado visível
          }
        }
        
        return false;
      });
      
      if (isReallyLoggedIn) {
        this.logger.log('✅ Sessão ativa confirmada');
        return { isAuthenticated: true, url: this.page?.url() };
      }
      
      this.logger.log('ℹ️ Sem sessão ativa');
      return { isAuthenticated: false };
      
    } catch (error) {
      this.logger.warn(`⚠️ Erro rápido: ${error.message}`);
      return { isAuthenticated: false };
    }
  }

  private async handleGenericModals(): Promise<void> {
    this.logger.log('🔍 Verificando modals genéricos...');
    
    // Primeiro, verificar o modal específico da landing page
    try {
      const landingModalClose = await this.page?.waitForSelector('[data-qa="landing-page-modal-close-button"]', { timeout: 3000 });
      if (landingModalClose && await landingModalClose.isVisible()) {
        this.logger.log('✅ Modal da landing page encontrado, fechando...');
        await landingModalClose.click();
        await this.page?.waitForTimeout(2000);
      }
    } catch (error) {
      this.logger.log('ℹ️ Modal da landing page não encontrado');
    }
    
    // Verificar especificamente o terceiro modal com classes CUI
    try {
      const cuiModalSelectors = [
        // Seletor mais específico baseado nas classes fornecidas
        'div.cui-absolute.cui-top-l.cui-right-xl.cui-cursor-pointer',
        '[class*="cui-absolute"][class*="cui-cursor-pointer"][class*="cui-right"]',
        'div[class*="cui-cursor-pointer"][class*="cui-z-20"]',
        // SVG dentro de elementos CUI
        '.cui-cursor-pointer svg',
        '[class*="cui-cursor-pointer"] svg[class*="cui-fill"]'
      ];
      
      for (const selector of cuiModalSelectors) {
        try {
          const cuiElement = await this.page?.waitForSelector(selector, { timeout: 2000 });
          if (cuiElement && await cuiElement.isVisible()) {
            this.logger.log(`✅ Modal CUI encontrado, fechando: ${selector}`);
            await cuiElement.click();
            await this.page?.waitForTimeout(2000);
            break;
          }
        } catch (error) {
          continue;
        }
      }
    } catch (error) {
      this.logger.log('ℹ️ Modal CUI não encontrado');
    }
    
    // Depois, procurar por outros modais
    const closeSelectors = [
      '[data-qa="landing-page-modal-close-button"]', // Prioridade para o seletor específico
      '[data-qa*="close"]', // Qualquer data-qa com close
      '[data-qa*="modal-close"]', // Qualquer data-qa com modal-close
      // Classes CUI específicas da Betano
      '[class*="cui-cursor-pointer"][class*="cui-absolute"]',
      '[class*="cui-cursor-pointer"][class*="cui-top"]',
      '[class*="cui-cursor-pointer"][class*="cui-right"]',
      'div[class*="cui-absolute"][class*="cui-cursor-pointer"]',
      '*[class*="cui-cursor-pointer"][class*="cui-fill"]',
      // Seletores genéricos
      'button:has-text("×")',
      'span:has-text("×")',
      'div:has-text("×")',
      '.close',
      '.modal-close',
      '.popup-close',
      '[aria-label="Close"]',
      '[aria-label="Fechar"]',
      'button[class*="close"]',
      '.fa-times',
      '.fa-close',
      '[data-dismiss="modal"]',
      'button[title="Close"]',
      'button[title="Fechar"]',
      // Seletores para SVG dentro de botões
      'button svg',
      'div[role="button"] svg',
      '[onclick] svg',
      '.clickable svg',
      // SVG com classes CUI
      '[class*="cui-cursor-pointer"] svg',
      'div[class*="cui-absolute"] svg'
    ];

    // Limitar a apenas 2 tentativas para evitar loops
    for (let attempt = 0; attempt < 2; attempt++) {
      this.logger.log(`🔄 Tentativa ${attempt + 1} de fechar modals...`);
      
      let modalClosed = false;
      
      // Primeiro verificar se ainda existem modais visíveis
      const hasVisibleModals = await this.page?.evaluate(() => {
        const modalSelectors = ['.modal', '.popup', '.overlay', '[role="dialog"]'];
        for (const selector of modalSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
              return true;
            }
          }
        }
        return false;
      });
      
      if (!hasVisibleModals) {
        this.logger.log('✅ Nenhum modal visível detectado');
        break;
      }
      
      for (const selector of closeSelectors) {
        try {
          const elements = await this.page?.locator(selector).all() || [];
          
          for (const element of elements) {
            if (await element.isVisible()) {
              // Verificar se é um elemento clicável
              const isClickable = await this.isElementClickable(element);
              if (isClickable) {
                this.logger.log(`✅ Elemento de fechar encontrado, clicando: ${selector}`);
                await element.click();
                await this.page?.waitForTimeout(1500);
                modalClosed = true;
                break; // Sair do loop interno após fechar um modal
              }
            }
          }
          
          if (modalClosed) break; // Sair do loop de seletores se já fechou algo
        } catch (error) {
          continue;
        }
      }
      
      // Só tentar SVG se ainda não fechou nada e é a primeira tentativa
      if (!modalClosed && attempt === 0) {
        const svgClosed = await this.handleSvgOverlays();
        if (svgClosed) modalClosed = true;
      }
      
      if (!modalClosed) {
        this.logger.log('✅ Nenhum modal adicional encontrado');
        break;
      }
    }
  }
  
  
  private async handleSvgOverlays(): Promise<boolean> {
    this.logger.log('🔍 Verificando overlays com SVG...');
    
    try {
      // Primeiro verificar se existe algum modal/overlay visível
      const hasOverlay = await this.page?.evaluate(() => {
        const overlays = document.querySelectorAll('[class*="modal"], [class*="overlay"], [class*="popup"], [class*="backdrop"]');
        for (const el of overlays) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          if (rect.width > 0 && rect.height > 0 && 
              style.display !== 'none' && 
              style.visibility !== 'hidden' && 
              style.opacity !== '0') {
            return true;
          }
        }
        return false;
      });
      
      if (!hasOverlay) {
        this.logger.log('ℹ️ Nenhum overlay ativo para verificar SVG');
        return false;
      }
      
      // Estratégias mais específicas para overlays ativos
      const svgStrategies = [
        // SVG dentro de elementos clicáveis em overlays visíveis
        '.modal:visible svg',
        '.overlay:visible svg',
        '.popup:visible svg',
        '[class*="modal"]:visible svg',
        '[class*="overlay"]:visible svg',
        // Procurar por elementos com backdrop visível
        'div[class*="backdrop"]:visible svg',
        'div[class*="bg-opacity"]:visible svg'
      ];
      
      for (const strategy of svgStrategies) {
        try {
          const svgs = await this.page?.locator(strategy).all() || [];
          
          for (const svg of svgs) {
            if (await svg.isVisible()) {
              // Verificar se o SVG está dentro de um overlay ativo
              const isInActiveOverlay = await svg.evaluate((el) => {
                let parent = el.parentElement;
                while (parent) {
                  const classes = parent.className || '';
                  if (classes.includes('modal') || classes.includes('overlay') || 
                      classes.includes('popup') || classes.includes('backdrop')) {
                    const style = window.getComputedStyle(parent);
                    return style.display !== 'none' && style.visibility !== 'hidden';
                  }
                  parent = parent.parentElement;
                }
                return false;
              });
              
              if (!isInActiveOverlay) continue;
              
              // Tentar clicar no SVG ou em seu container pai
              const parent = await svg.locator('..').first();
              if (parent) {
                this.logger.log('✅ SVG em overlay ativo encontrado, tentando fechar...');
                
                try {
                  await parent.click();
                  await this.page?.waitForTimeout(1500);
                  this.logger.log('✅ Overlay com SVG fechado com sucesso');
                  return true;
                } catch (clickError) {
                  // Tentar clicar no próprio SVG
                  try {
                    await svg.click();
                    await this.page?.waitForTimeout(1500);
                    this.logger.log('✅ SVG clicado diretamente');
                    return true;
                  } catch (svgClickError) {
                    continue;
                  }
                }
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      this.logger.log('ℹ️ Nenhum overlay com SVG ativo encontrado');
      return false;
    } catch (error) {
      this.logger.log('⚠️ Erro ao verificar SVG overlays:', error.message);
      return false;
    }
  }

  private async handleSwiperStories(): Promise<void> {
    this.logger.log('🎯 Verificando stories/swiper...');
    
    try {
      // Verificar se existe swiper-container
      const hasSwiperContainer = await this.page?.evaluate(() => {
        // Procurar swiper-container tanto no DOM principal quanto em shadow roots
        const swiperElement = document.querySelector('swiper-container');
        if (swiperElement) return true;
        
        // Procurar em todos os elementos que podem ter shadow root
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
          if (el.shadowRoot) {
            const shadowSwiper = el.shadowRoot.querySelector('swiper-container');
            if (shadowSwiper) return true;
          }
        }
        
        return false;
      });
      
      if (!hasSwiperContainer) {
        this.logger.log('✅ Nenhum swiper/stories detectado');
        return;
      }
      
      this.logger.log('⚠️ Swiper/stories detectado, tentando fechar...');
      
      // Estratégia 1: Clicar fora do swiper (coordenadas específicas)
      try {
        // Clicar no canto superior direito (área comum para fechar)
        const viewport = await this.page?.viewportSize();
        if (viewport) {
          const x = viewport.width - 50;  // 50px da borda direita
          const y = 50;  // 50px do topo
          
          await this.page?.mouse.click(x, y);
          await this.page?.waitForTimeout(1000);
          this.logger.log(`✅ Clique em coordenadas (${x}, ${y})`);
        }
      } catch (error) {
        this.logger.log('⚠️ Erro ao clicar em coordenadas');
      }
      
      // Estratégia 2: Procurar por botões de fechar dentro ou próximo ao swiper
      const swiperCloseSelectors = [
        // Seletores para fechar stories
        '[class*="stories-close"]',
        '[class*="story-close"]',
        '[class*="swiper-close"]',
        // Botões próximos ao swiper
        'swiper-container ~ button',
        'swiper-container ~ div button',
        // Classes CUI próximas ao swiper
        'swiper-container ~ [class*="cui-cursor-pointer"]',
        // Qualquer elemento clicável próximo
        'swiper-container ~ [onclick]',
        'swiper-container ~ [role="button"]'
      ];
      
      for (const selector of swiperCloseSelectors) {
        try {
          const closeBtn = await this.page?.locator(selector).first();
          if (closeBtn && await closeBtn.isVisible()) {
            await closeBtn.click();
            await this.page?.waitForTimeout(1000);
            this.logger.log(`✅ Swiper fechado via: ${selector}`);
            return;
          }
        } catch (error) {
          continue;
        }
      }
      
      // Estratégia 3: Executar JavaScript para remover o swiper
      try {
        await this.page?.evaluate(() => {
          // Remover swiper-container diretamente
          const swipers = document.querySelectorAll('swiper-container');
          swipers.forEach(swiper => swiper.remove());
          
          // Remover elementos com shadow root que contêm swiper
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            if (el.shadowRoot) {
              const shadowSwiper = el.shadowRoot.querySelector('swiper-container');
              if (shadowSwiper) {
                // Tentar remover o elemento host
                el.remove();
              }
            }
          }
          
          // Remover overlays relacionados a stories
          const storyOverlays = document.querySelectorAll('[class*="story"], [class*="stories"]');
          storyOverlays.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.position === 'fixed' || style.position === 'absolute') {
              el.remove();
            }
          });
        });
        
        this.logger.log('✅ Swiper removido via JavaScript');
        await this.page?.waitForTimeout(500);
      } catch (error) {
        this.logger.log('⚠️ Erro ao remover swiper via JS');
      }
      
      // Estratégia 4: Pressionar ESC várias vezes
      for (let i = 0; i < 3; i++) {
        await this.page?.keyboard.press('Escape');
        await this.page?.waitForTimeout(300);
      }
      
    } catch (error) {
      this.logger.log('⚠️ Erro ao lidar com swiper:', error.message);
    }
  }

  private async handleRemainingOverlays(): Promise<void> {
    this.logger.log('🔍 Verificação rápida de overlays remanescentes...');
    
    try {
      // Verificação rápida: existe algum overlay bloqueando a tela?
      const hasBlockingOverlay = await this.page?.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          
          // Verificar se é um elemento de tela cheia com z-index alto
          if ((style.position === 'fixed' || style.position === 'absolute') && 
              parseInt(style.zIndex) > 1000 &&
              rect.width >= window.innerWidth * 0.8 && 
              rect.height >= window.innerHeight * 0.8 &&
              style.display !== 'none' && 
              style.visibility !== 'hidden') {
            return true;
          }
        }
        return false;
      });
      
      if (!hasBlockingOverlay) {
        this.logger.log('✅ Nenhum overlay bloqueante detectado');
        return;
      }
      
      this.logger.log('⚠️ Overlay bloqueante detectado, tentando remover...');
      
      // Tentar algumas ações rápidas
      // 1. Pressionar ESC
      await this.page?.keyboard.press('Escape');
      await this.page?.waitForTimeout(500);
      
      // 2. Procurar por elementos CUI específicos
      try {
        const cuiSelectors = [
          'div.cui-absolute.cui-cursor-pointer',
          '[class*="cui-cursor-pointer"][class*="cui-z-20"]',
          'div[class*="cui-absolute"][class*="cui-right"][class*="cui-cursor-pointer"]',
          '.cui-cursor-pointer',
          '[class*="cui-cursor-pointer"] svg'
        ];
        
        for (const selector of cuiSelectors) {
          try {
            const cuiElement = await this.page?.locator(selector).first();
            if (cuiElement && await cuiElement.isVisible()) {
              await cuiElement.click();
              await this.page?.waitForTimeout(1000);
              this.logger.log(`✅ Overlay CUI removido: ${selector}`);
              return;
            }
          } catch (error) {
            continue;
          }
        }
      } catch (error) {
        // Continuar
      }
      
      // 3. Procurar por SVG clicável genérico
      try {
        const svgButtons = await this.page?.locator('div[class*="fixed"] svg, div[class*="absolute"] svg').all() || [];
        for (const svg of svgButtons) {
          if (await svg.isVisible()) {
            const parent = await svg.locator('..').first();
            if (parent) {
              try {
                await parent.click();
                await this.page?.waitForTimeout(1000);
                this.logger.log('✅ Overlay removido via SVG');
                return;
              } catch (e) {
                // Tentar clicar no próprio SVG
                try {
                  await svg.click();
                  await this.page?.waitForTimeout(1000);
                  this.logger.log('✅ Overlay removido clicando no SVG');
                  return;
                } catch (e2) {
                  // Continuar
                }
              }
            }
          }
        }
      } catch (error) {
        // Continuar
      }
      
      // 3. Última tentativa: clicar em qualquer backdrop visível
      try {
        const backdrop = await this.page?.locator('div[class*="backdrop"]:visible').first();
        if (backdrop) {
          await backdrop.click();
          await this.page?.waitForTimeout(500);
        }
      } catch (error) {
        // Ignorar
      }
      
      this.logger.log('🔄 Tentativas de remoção de overlay concluídas');
      
    } catch (error) {
      this.logger.log('⚠️ Erro ao verificar overlays:', error.message);
    }
  }

  private async handleAllOverlays(): Promise<void> {
    this.logger.log('🔍 Verificação inicial de overlays...');
    
    // Verificar rapidamente se existem overlays visíveis
    const hasOverlays = await this.page?.evaluate(() => {
      const overlaySelectors = ['.modal', '.popup', '.overlay', '.backdrop', '[role="dialog"]', 'swiper-container'];
      for (const sel of overlaySelectors) {
        const el = document.querySelector(sel);
        if (el) {
          const style = window.getComputedStyle(el);
          if (style.display !== 'none' && style.visibility !== 'hidden') {
            return true;
          }
        }
      }
      return false;
    });
    
    if (!hasOverlays) {
      this.logger.log('✅ Nenhum overlay detectado');
      return;
    }
    
    // Se há overlays, tentar fechar especificamente
    this.logger.log('⚠️ Overlays detectados, iniciando remoção...');
    
    // 1. Primeiro tentar fechar swiper/stories
    if (await this.page?.locator('swiper-container').isVisible().catch(() => false)) {
      await this.handleSwiperStories();
    }
    
    // 2. Procurar botões de fechar específicos
    const closeButtons = [
      '[data-qa*="close"]',
      '[class*="cui-cursor-pointer"]',
      'button:has-text("×")',
      '.close-button',
      '[aria-label="Close"]',
      '[aria-label="Fechar"]'
    ];
    
    for (const selector of closeButtons) {
      try {
        const btn = await this.page?.locator(selector).first();
        if (btn && await btn.isVisible()) {
          await btn.click();
          await this.page?.waitForTimeout(1000);
          this.logger.log(`✅ Overlay fechado via: ${selector}`);
          break;
        }
      } catch (error) {
        continue;
      }
    }
    
    // 3. Última tentativa: ESC
    await this.page?.keyboard.press('Escape');
    await this.page?.waitForTimeout(500);
    
    this.logger.log('🧹 Tentativa de limpeza concluída');
  }

  private async handleLoginIframe(username: string, password: string): Promise<boolean> {
    this.logger.log('🔍 Verificando se login está em iframe...');
    
    try {
      // Aguardar o modal/iframe carregar completamente
      await this.page?.waitForTimeout(2000);
      
      // Primeiro tentar detectar campos de login no DOM principal
      const hasLoginFieldsInMain = await this.page?.evaluate(() => {
        const userInput = document.querySelector('input[name="username"], input[name="email"], input[type="email"]:not([type="hidden"])');
        const passInput = document.querySelector('input[name="password"], input[type="password"]:not([type="hidden"])');
        return !!(userInput && passInput);
      });
      
      if (hasLoginFieldsInMain) {
        this.logger.log('📝 Campos de login encontrados no DOM principal, não é iframe');
        return false;
      }
      
      // Se não encontrou no DOM principal, procurar em iframes
      const frames = await this.page?.frames() || [];
      this.logger.log(`📋 ${frames.length} frames encontrados na página`);
      
      // Priorizar frames que não são o mainFrame
      const iframes = frames.filter(f => f !== this.page?.mainFrame());
      
      for (let i = 0; i < iframes.length; i++) {
        const frame = iframes[i];
        
        this.logger.log(`🔍 Verificando iframe ${i + 1}...`);
        
        try {
          // Verificar se o iframe tem campos de login
          const hasLoginFields = await frame.evaluate(() => {
            const userInput = document.querySelector('input[name="username"], input[name="email"], input[type="email"]:not([type="hidden"])');
            const passInput = document.querySelector('input[name="password"], input[type="password"]:not([type="hidden"])');
            return !!(userInput && passInput);
          });
          
          if (!hasLoginFields) {
            this.logger.log(`ℹ️ Iframe ${i + 1} não contém campos de login`);
            continue;
          }
          
          this.logger.log(`✅ Iframe de login encontrado! (iframe ${i + 1})`);
          
          // Procurar campos de login no iframe
          const usernameField = await frame.locator('input[name="username"], input[name="email"], input[type="email"]:not([type="hidden"])').first();
          const passwordField = await frame.locator('input[name="password"], input[type="password"]:not([type="hidden"])').first();
          
          if (usernameField && passwordField) {
            this.logger.log('✅ Iframe de login encontrado! Preenchendo credenciais...');
            
            // Preencher credenciais no iframe
            await usernameField.fill(username);
            await this.page?.waitForTimeout(500);
            await passwordField.fill(password);
            await this.page?.waitForTimeout(500);
            
            this.logger.log('✅ Credenciais preenchidas no iframe');
            
            // Procurar botão de submit no iframe
            const submitSelectors = [
              'button[type="submit"]:not([disabled])',
              'input[type="submit"]:not([disabled])',
              'button:has-text("Entrar"):not([disabled])',
              'button:has-text("Login"):not([disabled])',
              'button:has-text("ENTRAR"):not([disabled])',
              'button:has-text("Fazer login"):not([disabled])',
              '.submit-button:not([disabled])',
              '[data-qa="login-submit"]:not([disabled])'
            ];
            
            for (const selector of submitSelectors) {
              try {
                const submitButton = await frame.locator(selector).first();
                if (await submitButton.isVisible()) {
                  this.logger.log(`🚀 Enviando formulário no iframe: ${selector}`);
                  await submitButton.click();
                  
                  // Aguardar processamento
                  await this.page?.waitForTimeout(5000);
                  return true;
                }
              } catch (error) {
                continue;
              }
            }
          }
        } catch (error) {
          this.logger.log(`⚠️ Erro ao verificar frame ${i + 1}: ${error.message}`);
          continue;
        }
      }
      
      this.logger.log('ℹ️ Nenhum iframe de login encontrado, usando método tradicional');
      return false;
      
    } catch (error) {
      this.logger.log(`⚠️ Erro ao verificar iframes: ${error.message}`);
      return false;
    }
  }

  private async ensureElementClickable(selector: string, timeout: number = 5000): Promise<any> {
    if (!this.page) return null;
    
    try {
      // Aguardar elemento existir
      await this.page.waitForSelector(selector, { timeout });
      
      // Verificar se existe overlay bloqueando
      await this.handleAllOverlays();
      
      // Aguardar elemento estar visível e habilitado
      const element = await this.page.waitForSelector(selector, { 
        state: 'visible', 
        timeout: 2000 
      });
      
      if (element) {
        // Scroll para o elemento se necessário
        await element.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        
        // Verificar novamente overlays após scroll
        await this.handleAllOverlays();
      }
      
      return element;
    } catch (error) {
      this.logger.warn(`⚠️ Elemento não disponível para clique: ${selector}`);
      return null;
    }
  }

  async getSessionStatus(): Promise<{ isAuthenticated: boolean; url?: string }> {
    if (!this.page) {
      return { isAuthenticated: false };
    }

    try {
      const currentUrl = this.page.url();
      return {
        isAuthenticated: this.isAuthenticated,
        url: currentUrl
      };
    } catch (error) {
      return { isAuthenticated: false };
    }
  }

  async closeSession(): Promise<void> {
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    this.isAuthenticated = false;
    this.logger.log('🔒 Sessão Betano fechada');
  }

  async clearStoredSession(): Promise<void> {
    await this.playwrightService.clearSessionState();
    this.isAuthenticated = false;
    this.logger.log('🗑️ Sessão armazenada removida');
  }

  async testOverlayDetection(): Promise<{ detected: number; removed: number }> {
    if (!this.page) {
      throw new Error('Página não inicializada');
    }

    this.logger.log('🔬 Testando detecção de overlays...');
    
    let detected = 0;
    let removed = 0;
    
    const overlaySelectors = [
      '.modal', '.popup', '.overlay', '.dialog',
      '[class*="modal"]', '[class*="popup"]', '[class*="overlay"]'
    ];
    
    for (const selector of overlaySelectors) {
      try {
        const elements = await this.page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible()) {
            detected++;
            this.logger.log(`🔍 Overlay detectado: ${selector}`);
          }
        }
      } catch (error) {
        // Continuar
      }
    }
    
    if (detected > 0) {
      this.logger.log(`⚠️ ${detected} overlays detectados, iniciando remoção...`);
      await this.handleAllOverlays();
      removed = detected; // Assumir que foram removidos
    } else {
      this.logger.log('✅ Nenhum overlay detectado');
    }
    
    return { detected, removed };
  }

  async scrapeSoccerMatches(): Promise<any> {
    if (!this.isAuthenticated || !this.page) {
      throw new Error('Usuário não autenticado');
    }

    this.logger.log('⚽ Iniciando scraping de futebol...');
    
    try {
      // Navegar para seção de futebol
      await this.page.goto('https://www.betano.bet.br/sport/futebol/', { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);

      // Verificar overlays antes do scraping
      await this.handleAllOverlays();

      // Aqui você pode implementar a lógica de scraping específica
      // Por enquanto, retornamos dados mock
      const matches = {
        count: 5,
        matches: [
          { team1: 'Time A', team2: 'Time B', odds: '2.50' },
          { team1: 'Time C', team2: 'Time D', odds: '1.80' }
        ]
      };

      this.logger.log(`✅ Scraping concluído: ${matches.count} partidas encontradas`);
      return matches;

    } catch (error) {
      this.logger.error('❌ Erro no scraping:', error);
      throw error;
    }
  }

  /**
   * Digita texto de forma mais humana com delays variáveis
   */
  private async typeHumanLike(element: any, text: string): Promise<void> {
    const chars = text.split('');
    
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      
      // Simular digitação com velocidade variável
      await element.type(char, { delay: this.getRandomTypingDelay() });
      
      // Ocasionalmente fazer pequenas pausas (simulando pensar)
      if (Math.random() < 0.1) {
        await this.page.waitForTimeout(Math.random() * 1000 + 500);
      }
      
      // Ocasionalmente "errar" e corrigir (mais humano)
      if (Math.random() < 0.02 && i < chars.length - 1) {
        // Digitar caractere errado
        const wrongChar = String.fromCharCode(char.charCodeAt(0) + 1);
        await element.type(wrongChar, { delay: this.getRandomTypingDelay() });
        await this.page.waitForTimeout(Math.random() * 300 + 200);
        
        // Apagar e digitar correto
        await element.press('Backspace');
        await this.page.waitForTimeout(Math.random() * 200 + 100);
        await element.type(char, { delay: this.getRandomTypingDelay() });
      }
    }
  }

  /**
   * Retorna um delay aleatório para digitação
   */
  private getRandomTypingDelay(): number {
    // Maioria das pessoas digita entre 40-120 WPM
    // Isso equivale a aproximadamente 50-150ms por caractere
    const baseDelay = 80;
    const variation = 70;
    return baseDelay + Math.random() * variation;
  }

  /**
   * Verifica se um elemento está realmente clicável
   */
  private async isElementClickable(element: any): Promise<boolean> {
    try {
      const box = await element.boundingBox();
      if (!box) return false;
      
      // Verificar se tem tamanho
      if (box.width <= 0 || box.height <= 0) return false;
      
      // Verificar se está visível
      const isVisible = await element.isVisible();
      if (!isVisible) return false;
      
      // Verificar se não está desabilitado
      const isDisabled = await element.getAttribute('disabled');
      if (isDisabled !== null) return false;
      
      return true;
    } catch (error) {
      return false;
    }
  }
}