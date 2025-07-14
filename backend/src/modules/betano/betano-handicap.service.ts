import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { PlaywrightStealthService } from '@providers/playwright/playwright-stealth.service';
import { ConfigService } from '@nestjs/config';
import { BetanoCacheService } from './betano-cache.service';

export interface HandicapOption {
  team: string;
  handicap: string; // ex: "-0.5", "+0.25", "0.0"
  odd: number;
  selectionId?: string;
}

export interface GameHandicaps {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  gameUrl: string;
  isLive: boolean;
  handicaps: HandicapOption[];
  otherMarkets?: {
    overUnder?: HandicapOption[];
    corners?: HandicapOption[];
    firstHalf?: HandicapOption[];
  };
}

export interface HandicapResult {
  success: boolean;
  message: string;
  games: GameHandicaps[];
  totalGames: number;
  timestamp: Date;
}

@Injectable()
export class BetanoHandicapService {
  private readonly logger = new Logger(BetanoHandicapService.name);
  private page: Page | null = null;

  constructor(
    private readonly playwrightStealthService: PlaywrightStealthService,
    private readonly configService: ConfigService,
    private readonly cacheService: BetanoCacheService,
  ) {}

  /**
   * Extrai handicaps asiáticos de todos os jogos da Série C
   */
  async extractAllHandicaps(
    competition: string = 'brasileirao-serie-c',
    competitionId: string = '18249'
  ): Promise<HandicapResult> {
    try {
      // 1. Tentar buscar do cache primeiro
      this.logger.log(`🔍 Verificando cache para ${competition}...`);
      const cachedResult = await this.cacheService.getCachedHandicaps(competition, competitionId);
      
      if (cachedResult) {
        this.logger.log(`✅ Dados encontrados no cache: ${cachedResult.totalGames} jogos`);
        return {
          ...cachedResult,
          message: `${cachedResult.totalGames} jogos encontrados no cache (dados atualizados)`
        };
      }

      // 2. Cache miss - fazer scraping
      this.logger.log(`🎯 Cache miss - extraindo handicaps asiáticos do ${competition}...`);
      
      // Criar página
      this.page = await this.playwrightStealthService.createPage();
      
      // 1. Primeiro extrair URLs dos jogos da página principal
      const gameUrls = await this.extractGameUrls(competition, competitionId);
      
      if (gameUrls.length === 0) {
        return {
          success: false,
          message: 'Nenhum jogo encontrado',
          games: [],
          totalGames: 0,
          timestamp: new Date()
        };
      }
      
      this.logger.log(`📋 ${gameUrls.length} jogos encontrados. Extraindo handicaps...`);
      
      // 2. Para cada jogo, extrair handicaps asiáticos
      const allGames: GameHandicaps[] = [];
      
      for (let i = 0; i < gameUrls.length; i++) {
        const gameUrl = gameUrls[i];
        this.logger.log(`🎮 Processando jogo ${i + 1}/${gameUrls.length}: ${gameUrl.homeTeam} x ${gameUrl.awayTeam}`);
        
        try {
          const gameHandicaps = await this.extractGameHandicaps(gameUrl);
          if (gameHandicaps) {
            allGames.push(gameHandicaps);
          }
        } catch (error) {
          this.logger.warn(`⚠️ Erro ao processar jogo ${gameUrl.homeTeam} x ${gameUrl.awayTeam}: ${error.message}`);
        }
        
        // Pequena pausa entre jogos para não sobrecarregar
        await this.page.waitForTimeout(2000);
      }
      
      this.logger.log(`✅ ${allGames.length} jogos processados com sucesso!`);
      
      const result: HandicapResult = {
        success: true,
        message: `${allGames.length} jogos com handicaps extraídos`,
        games: allGames,
        totalGames: allGames.length,
        timestamp: new Date()
      };

      // 3. Salvar no cache para próximas requisições
      await this.cacheService.setCachedHandicaps(competition, competitionId, result);
      
      return result;
      
    } catch (error) {
      this.logger.error('❌ Erro ao extrair handicaps:', error);
      return {
        success: false,
        message: `Erro: ${error.message}`,
        games: [],
        totalGames: 0,
        timestamp: new Date()
      };
    } finally {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }

  /**
   * Extrai URLs dos jogos da página principal
   */
  private async extractGameUrls(competition: string, competitionId: string): Promise<any[]> {
    const url = `https://www.betano.bet.br/sport/futebol/brasil/${competition}/${competitionId}/`;
    
    this.logger.log(`📍 Acessando página principal: ${url}`);
    
    try {
      // Usar networkidle para garantir que a página carregou completamente
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
    } catch (error) {
      this.logger.warn('⚠️ Timeout no networkidle0, tentando com domcontentloaded...');
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
    }
    
    await this.page.waitForTimeout(3000);
    
    // Fechar modais
    await this.closeModals();
    
    await this.page.waitForTimeout(2000);
    
    // Verificar CAPTCHA
    const hasCaptcha = await this.checkForCaptcha();
    if (hasCaptcha) {
      throw new Error('CAPTCHA detectado na página principal');
    }
    
    // Aguardar o container principal carregar
    try {
      await this.page.waitForSelector('[data-qa="container_league_blocks"]', { timeout: 10000 });
    } catch (e) {
      this.logger.warn('⚠️ Container principal não encontrado, tentando seletores alternativos...');
    }
    
    // Scroll para carregar mais conteúdo
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    await this.page.waitForTimeout(2000);
    
    // Extrair URLs dos jogos com estratégia melhorada
    return await this.page.evaluate(() => {
      const games: any[] = [];
      const processedUrls = new Set(); // Evitar duplicatas
      
      // Múltiplas estratégias para encontrar jogos
      const selectors = [
        'a[href*="/live/"]',
        'a[href*="/game/"]', 
        '[data-qa*="game"] a',
        '.event-row a',
        '.match-row a'
      ];
      
      selectors.forEach(selector => {
        const gameLinks = document.querySelectorAll(selector);
        
        gameLinks.forEach(link => {
          const href = link.getAttribute('href');
          if (!href || processedUrls.has(href)) return;
          
          // Filtrar apenas links de jogos válidos
          if (href.includes('/live/') || href.includes('/game/')) {
            processedUrls.add(href);
            
            // Extrair texto do elemento e elementos pais
            const linkText = link.textContent?.trim() || '';
            const parentText = link.closest('.event, .match, [data-qa*="event"]')?.textContent?.trim() || '';
            const fullText = `${linkText} ${parentText}`;
            
            // Tentar extrair times do slug da URL primeiro
            const urlParts = href.split('/');
            const gameSlug = urlParts.find(part => part.includes('-')) || '';
            
            let homeTeam = '';
            let awayTeam = '';
            
            // Lista expandida de times
            const knownTeams = [
              'Figueirense', 'Náutico', 'Caxias', 'Anápolis',
              'Retrô', 'CSA', 'Maringá', 'Brusque',
              'ABC', 'Botafogo-PB', 'Confiança', 'Ferroviário',
              'Floresta', 'Sampaio Corrêa', 'São Bernardo',
              'Tombense', 'Ypiranga', 'Athletic', 'Londrina',
              'Volta Redonda', 'Remo', 'São José'
            ];
            
            // Estratégia 1: Extrair do slug da URL
            if (gameSlug.includes('-')) {
              const slugParts = gameSlug.split('-');
              if (slugParts.length >= 2) {
                const possibleHome = slugParts[0];
                const possibleAway = slugParts[1];
                
                // Capitalizar primeira letra
                homeTeam = possibleHome.charAt(0).toUpperCase() + possibleHome.slice(1);
                awayTeam = possibleAway.charAt(0).toUpperCase() + possibleAway.slice(1);
              }
            }
            
            // Estratégia 2: Buscar times conhecidos no texto
            if (!homeTeam || !awayTeam) {
              const foundTeams = knownTeams.filter(team => 
                fullText.toLowerCase().includes(team.toLowerCase())
              );
              
              if (foundTeams.length >= 2) {
                homeTeam = foundTeams[0];
                awayTeam = foundTeams[1];
              }
            }
            
            // Se encontrou alguma informação, adicionar
            if (homeTeam && awayTeam) {
              const gameId = href.split('/').filter(p => p).pop() || '';
              const fullUrl = href.startsWith('http') ? href : `https://www.betano.bet.br${href}`;
              
              games.push({
                gameId,
                homeTeam,
                awayTeam,
                gameUrl: fullUrl,
                isLive: fullText.toLowerCase().includes('ao vivo')
              });
            }
          }
        });
      });
      
      // Log para debug
      console.log(`🔍 Encontrados ${games.length} jogos únicos`);
      games.forEach((game, i) => {
        console.log(`${i + 1}. ${game.homeTeam} x ${game.awayTeam} (${game.gameId})`);
      });
      
      return games;
    });
  }

  /**
   * Extrai handicaps asiáticos de um jogo específico
   */
  private async extractGameHandicaps(gameInfo: any): Promise<GameHandicaps | null> {
    try {
      this.logger.log(`🔍 Acessando jogo: ${gameInfo.gameUrl}`);
      
      // Navegar para a página do jogo com timeout menor
      try {
        await this.page.goto(gameInfo.gameUrl, {
          waitUntil: 'networkidle',
          timeout: 45000
        });
      } catch (error) {
        this.logger.warn('⚠️ Timeout no jogo, tentando com domcontentloaded...');
        await this.page.goto(gameInfo.gameUrl, {
          waitUntil: 'domcontentloaded', 
          timeout: 20000
        });
      }
      
      await this.page.waitForTimeout(2000);
      
      // Verificar se há CAPTCHA
      const hasCaptcha = await this.checkForCaptcha();
      if (hasCaptcha) {
        this.logger.warn('⚠️ CAPTCHA detectado na página do jogo');
        return null;
      }
      
      // Procurar e clicar na aba "Handicap Asiático"
      await this.clickHandicapTab();
      
      // Aguardar conteúdo carregar
      await this.page.waitForTimeout(2000);
      
      // Extrair handicaps asiáticos
      const handicaps = await this.extractHandicapOptions();
      
      return {
        gameId: gameInfo.gameId,
        homeTeam: gameInfo.homeTeam,
        awayTeam: gameInfo.awayTeam,
        gameUrl: gameInfo.gameUrl,
        isLive: gameInfo.isLive,
        handicaps: handicaps
      };
      
    } catch (error) {
      this.logger.error(`Erro ao extrair handicaps do jogo ${gameInfo.homeTeam} x ${gameInfo.awayTeam}:`, error);
      return null;
    }
  }

  /**
   * Clica na aba Handicap Asiático
   */
  private async clickHandicapTab(): Promise<void> {
    try {
      this.logger.log('🔍 Procurando aba Handicap Asiático...');
      
      // Aguardar carregar abas
      await this.page.waitForTimeout(3000);
      
      // Lista abrangente de seletores para encontrar a aba
      const handicapSelectors = [
        'span:has-text("Handicap Asiático")',
        'span:has-text("Handicap")',
        'button:has-text("Handicap Asiático")',
        'button:has-text("Handicap")',
        '[data-qa*="handicap"]',
        '[data-testid*="handicap"]',
        '.tab:has-text("Handicap")',
        '.market-tab:has-text("Handicap")',
        '.nav-item:has-text("Handicap")',
        'a:has-text("Handicap")'
      ];
      
      // Primeiro tentar encontrar qualquer aba que contenha "handicap"
      for (const selector of handicapSelectors) {
        try {
          const elements = await this.page.locator(selector).all();
          
          for (const element of elements) {
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text && text.toLowerCase().includes('handicap')) {
                this.logger.log(`🎯 Clicando na aba: ${text}`);
                await element.click();
                await this.page.waitForTimeout(3000);
                return;
              }
            }
          }
        } catch (e) {
          // Continue tentando outros seletores
        }
      }
      
      // Se não encontrou, tentar clicar em qualquer elemento que contenha "handicap" no texto
      try {
        const allElements = await this.page.locator('*').all();
        
        for (const element of allElements) {
          try {
            if (await element.isVisible()) {
              const text = await element.textContent();
              if (text && text.toLowerCase().includes('handicap asiático')) {
                this.logger.log(`🎯 Encontrou elemento com handicap: ${text}`);
                await element.click();
                await this.page.waitForTimeout(3000);
                return;
              }
            }
          } catch (e) {
            // Continuar
          }
        }
      } catch (e) {
        // Se falhar, continuar
      }
      
      this.logger.warn('⚠️ Aba Handicap Asiático não encontrada - pode não estar disponível para este jogo');
    } catch (error) {
      this.logger.warn('⚠️ Erro ao clicar na aba Handicap Asiático:', error.message);
    }
  }

  /**
   * Extrai opções de handicap asiático
   */
  private async extractHandicapOptions(): Promise<HandicapOption[]> {
    return await this.page.evaluate(() => {
      const handicaps: HandicapOption[] = [];
      
      // Procurar pelo container específico mencionado
      const container = document.querySelector('.tw-flex.tw-flex-1.tw-flex-col.tw-overflow-x-hidden.tw-overflow-y-auto.live-event__details--markets-overflow');
      
      if (!container) {
        // Fallback: procurar por qualquer container com mercados
        const fallbackContainers = document.querySelectorAll('.markets.markets--live, .markets__market');
        if (fallbackContainers.length === 0) return handicaps;
      }
      
      const searchContainer = container || document;
      
      // Procurar por mercados de handicap asiático
      const handicapMarkets = searchContainer.querySelectorAll('.markets__market');
      
      handicapMarkets.forEach(market => {
        const marketTitle = market.querySelector('.tw-self-center');
        const titleText = marketTitle?.textContent || '';
        
        // Verificar se é mercado de handicap asiático
        if (titleText.toLowerCase().includes('handicap asiático')) {
          // Extrair todas as seleções deste mercado
          const selections = market.querySelectorAll('[data-qa="event-selection"]');
          
          selections.forEach(selection => {
            try {
              // Extrair informações da seleção
              const teamSpan = selection.querySelector('.s-name');
              const handicapSpan = selection.querySelector('.s-name-sub');
              const oddSpan = selection.querySelector('.tw-text-s.tw-leading-s.tw-font-bold');
              const selectionId = selection.getAttribute('data-selnid');
              
              if (teamSpan && oddSpan) {
                const team = teamSpan.textContent?.trim() || '';
                const handicap = handicapSpan?.textContent?.trim() || '0.0';
                const oddText = oddSpan.textContent?.trim() || '';
                const odd = parseFloat(oddText);
                
                if (team && !isNaN(odd)) {
                  handicaps.push({
                    team,
                    handicap,
                    odd,
                    selectionId: selectionId || undefined
                  });
                }
              }
            } catch (e) {
              // Ignorar erros de parsing individual
            }
          });
        }
      });
      
      return handicaps;
    });
  }

  private async closeModals(): Promise<void> {
    // Lista de seletores de modais para tentar fechar
    const modalSelectors = [
      'button:has-text("SIM")',
      'button:has-text("NÃO OBRIGADO")', 
      'button:has-text("ACEITAR")',
      'button:has-text("FECHAR")',
      '[data-qa="landing-page-modal-close-button"]',
      '.modal-close',
      '.close-button',
      '[aria-label="close"]',
      '[aria-label="fechar"]'
    ];
    
    for (const selector of modalSelectors) {
      try {
        const elements = await this.page.locator(selector).all();
        for (const element of elements) {
          if (await element.isVisible()) {
            await element.click();
            await this.page.waitForTimeout(500);
            this.logger.log(`✅ Modal fechado: ${selector}`);
          }
        }
      } catch (e) {
        // Continuar tentando outros seletores
      }
    }
  }

  private async checkForCaptcha(): Promise<boolean> {
    return await this.page.evaluate(() => {
      const captchaTexts = ['Queremos ter certeza', 'robô', 'verificação'];
      const pageText = document.body.innerText.toLowerCase();
      return captchaTexts.some(text => pageText.includes(text));
    });
  }

  /**
   * Extrai handicaps de um jogo específico por URL
   */
  async extractSingleGameHandicaps(gameUrl: string): Promise<GameHandicaps | null> {
    try {
      this.page = await this.playwrightStealthService.createPage();
      
      // Extrair informações básicas da URL
      const urlParts = gameUrl.split('/');
      const gameId = urlParts[urlParts.length - 2] || '';
      const gameSlug = urlParts[urlParts.length - 3] || '';
      
      // Tentar extrair nomes dos times do slug
      const teams = gameSlug.split('-');
      const homeTeam = teams[0] || 'Time Casa';
      const awayTeam = teams[1] || 'Time Fora';
      
      const gameInfo = {
        gameId,
        homeTeam,
        awayTeam,
        gameUrl,
        isLive: false
      };
      
      return await this.extractGameHandicaps(gameInfo);
      
    } catch (error) {
      this.logger.error('Erro ao extrair handicaps:', error);
      return null;
    } finally {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }
}