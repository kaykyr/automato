import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';

@Injectable()
export class BetanoCaptchaService {
  private readonly logger = new Logger(BetanoCaptchaService.name);

  /**
   * Detecta se há um CAPTCHA na página
   */
  async detectCaptcha(page: Page): Promise<boolean> {
    try {
      // Textos comuns em CAPTCHAs da Betano
      const captchaTexts = [
        'Queremos ter certeza de que é realmente com você',
        'não com um robô',
        'Enigma resolvido em',
        'Deslize para a direita para completar o enigma',
        'Verifique que você é humano',
        'Confirme que não é um robô',
        'Complete o desafio',
        'Verificação de segurança',
      ];

      // Verifica se há algum texto de CAPTCHA
      for (const text of captchaTexts) {
        const elements = await page.locator(`text="${text}"`).count();
        if (elements > 0) {
          this.logger.warn(`🤖 CAPTCHA detectado: "${text}"`);
          return true;
        }
      }

      // Verifica elementos específicos de CAPTCHA
      const captchaSelectors = [
        'iframe[src*="captcha"]',
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        '#captcha',
        '.captcha',
        '[data-captcha]',
        '.challenge-container',
        '.security-check',
        'div[class*="puzzle"]',
        'div[class*="slider-captcha"]',
      ];

      for (const selector of captchaSelectors) {
        const elements = await page.locator(selector).count();
        if (elements > 0) {
          this.logger.warn(`🤖 CAPTCHA detectado via selector: ${selector}`);
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.error('Erro ao detectar CAPTCHA:', error);
      return false;
    }
  }

  /**
   * Tenta evitar CAPTCHA com comportamento humano
   */
  async preventCaptcha(page: Page): Promise<void> {
    try {
      this.logger.log('🎭 Aplicando comportamento humano para evitar CAPTCHA...');

      // Movimento natural do mouse
      await this.simulateNaturalMouseMovement(page);

      // Scroll natural
      await this.simulateNaturalScroll(page);

      // Tempo de leitura humano
      await this.simulateReadingTime();

      // Movimentos aleatórios
      await this.randomInteractions(page);

    } catch (error) {
      this.logger.error('Erro ao prevenir CAPTCHA:', error);
    }
  }

  /**
   * Simula movimento natural do mouse
   */
  private async simulateNaturalMouseMovement(page: Page): Promise<void> {
    const viewport = page.viewportSize();
    if (!viewport) return;

    // Curva de Bézier para movimento natural
    const steps = 20;
    const startX = Math.random() * viewport.width;
    const startY = Math.random() * viewport.height;
    const endX = Math.random() * viewport.width;
    const endY = Math.random() * viewport.height;

    // Pontos de controle para curva
    const cp1x = startX + (Math.random() - 0.5) * 200;
    const cp1y = startY + (Math.random() - 0.5) * 200;
    const cp2x = endX + (Math.random() - 0.5) * 200;
    const cp2y = endY + (Math.random() - 0.5) * 200;

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = this.bezierCurve(t, startX, cp1x, cp2x, endX);
      const y = this.bezierCurve(t, startY, cp1y, cp2y, endY);
      
      await page.mouse.move(x, y);
      await this.delay(Math.random() * 50 + 10);
    }
  }

  /**
   * Calcula ponto na curva de Bézier
   */
  private bezierCurve(t: number, p0: number, p1: number, p2: number, p3: number): number {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }

  /**
   * Simula scroll natural
   */
  private async simulateNaturalScroll(page: Page): Promise<void> {
    const scrolls = Math.floor(Math.random() * 3) + 1;
    
    for (let i = 0; i < scrolls; i++) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const distance = Math.random() * 200 + 50;
      
      await page.mouse.wheel(0, direction * distance);
      await this.delay(Math.random() * 1000 + 500);
    }
  }

  /**
   * Simula tempo de leitura
   */
  private async simulateReadingTime(): Promise<void> {
    const readingTime = Math.random() * 3000 + 2000;
    await this.delay(readingTime);
  }

  /**
   * Interações aleatórias
   */
  private async randomInteractions(page: Page): Promise<void> {
    try {
      // Movimento do mouse sem clique
      for (let i = 0; i < 2; i++) {
        const viewport = page.viewportSize();
        if (viewport) {
          const x = Math.random() * viewport.width;
          const y = Math.random() * viewport.height;
          await page.mouse.move(x, y, { steps: 10 });
          await this.delay(Math.random() * 500 + 200);
        }
      }

      // Possível hover em elementos
      const elements = await page.locator('button, a, input').all();
      if (elements.length > 0) {
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        try {
          await randomElement.hover();
          await this.delay(Math.random() * 300 + 100);
        } catch (e) {
          // Ignorar se elemento não for hoverable
        }
      }
    } catch (error) {
      // Ignorar erros de interação
    }
  }

  /**
   * Lida com CAPTCHA se detectado
   */
  async handleCaptcha(page: Page): Promise<{ solved: boolean; message: string }> {
    try {
      this.logger.warn('🚨 CAPTCHA detectado! Tentando estratégias de contorno...');

      // Estratégia 1: Aguardar e tentar comportamento humano
      await this.preventCaptcha(page);
      await this.delay(5000);

      // Verifica se CAPTCHA ainda está presente
      const stillHasCaptcha = await this.detectCaptcha(page);
      if (!stillHasCaptcha) {
        return {
          solved: true,
          message: 'CAPTCHA resolvido com comportamento humano'
        };
      }

      // Estratégia 2: Recarregar com delay maior
      this.logger.log('🔄 Tentando recarregar página com delay maior...');
      await this.delay(10000);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await this.preventCaptcha(page);

      // Verifica novamente
      const captchaAfterReload = await this.detectCaptcha(page);
      if (!captchaAfterReload) {
        return {
          solved: true,
          message: 'CAPTCHA evitado após recarregar'
        };
      }

      // Estratégia 3: Aguardar intervenção manual
      this.logger.warn('⚠️ CAPTCHA persiste. Aguardando resolução manual...');
      this.logger.warn('👤 Por favor, resolva o CAPTCHA manualmente no navegador');
      
      // Aguarda até 2 minutos para resolução manual
      const maxWaitTime = 120000; // 2 minutos
      const checkInterval = 2000; // 2 segundos
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitTime) {
        await this.delay(checkInterval);
        
        const solved = !(await this.detectCaptcha(page));
        if (solved) {
          this.logger.log('✅ CAPTCHA resolvido manualmente!');
          return {
            solved: true,
            message: 'CAPTCHA resolvido manualmente'
          };
        }
      }

      return {
        solved: false,
        message: 'CAPTCHA não resolvido no tempo limite'
      };

    } catch (error) {
      this.logger.error('Erro ao lidar com CAPTCHA:', error);
      return {
        solved: false,
        message: `Erro ao processar CAPTCHA: ${error.message}`
      };
    }
  }

  /**
   * Delay com variação para parecer mais humano
   */
  private async delay(ms: number): Promise<void> {
    const variation = ms * 0.2;
    const actualDelay = ms + (Math.random() - 0.5) * variation;
    return new Promise(resolve => setTimeout(resolve, actualDelay));
  }

  /**
   * Verifica e tenta resolver CAPTCHA automaticamente
   */
  async checkAndSolveCaptcha(page: Page): Promise<boolean> {
    const hasCaptcha = await this.detectCaptcha(page);
    
    if (hasCaptcha) {
      const result = await this.handleCaptcha(page);
      return result.solved;
    }
    
    return true;
  }
}