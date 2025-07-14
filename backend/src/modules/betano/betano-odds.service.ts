import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { PlaywrightStealthService } from '@providers/playwright/playwright-stealth.service';

export interface Game {
  homeTeam: string;
  awayTeam: string;
  date?: string;
  time?: string;
  odds: {
    homeWin?: string;
    draw?: string;
    awayWin?: string;
    over25?: string;
    under25?: string;
    btts?: string;
    corners?: any;
  };
}

export interface OddsResult {
  success: boolean;
  message: string;
  games?: Game[];
  totalGames?: number;
}

@Injectable()
export class BetanoOddsService {
  private readonly logger = new Logger(BetanoOddsService.name);
  private page: Page | null = null;

  constructor(
    private readonly playwrightStealthService: PlaywrightStealthService,
  ) {}

  /**
   * Extrai odds diretamente sem login
   */
  async extractOdds(competition: string = 'brasileirao-serie-c', competitionId: string = '18249'): Promise<OddsResult> {
    try {
      this.logger.log(`🎯 Iniciando extração de odds para ${competition}...`);
      
      // Criar página com stealth mode
      this.page = await this.playwrightStealthService.createPage();
      
      // URL direta para a competição
      const url = `https://www.betano.bet.br/sport/futebol/brasil/${competition}/${competitionId}/`;
      
      this.logger.log(`📍 Navegando para: ${url}`);
      
      // Navegar para a página
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Aguardar conteúdo carregar
      await this.page.waitForTimeout(5000);
      
      // Verificar se há CAPTCHA
      const hasCaptcha = await this.detectCaptcha();
      if (hasCaptcha) {
        this.logger.warn('⚠️ CAPTCHA detectado ao acessar odds');
        return {
          success: false,
          message: 'CAPTCHA detectado. Acesso direto às odds bloqueado.'
        };
      }
      
      this.logger.log('✅ Sem CAPTCHA! Extraindo dados dos jogos...');
      
      // Extrair dados dos jogos
      const games = await this.extractGamesData();
      
      if (games.length === 0) {
        this.logger.warn('⚠️ Nenhum jogo encontrado');
        return {
          success: false,
          message: 'Nenhum jogo encontrado na página'
        };
      }
      
      this.logger.log(`✅ ${games.length} jogos extraídos com sucesso!`);
      
      return {
        success: true,
        message: `${games.length} jogos extraídos com sucesso`,
        games: games,
        totalGames: games.length
      };
      
    } catch (error) {
      this.logger.error('❌ Erro ao extrair odds:', error);
      return {
        success: false,
        message: `Erro ao extrair odds: ${error.message}`
      };
    } finally {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }

  /**
   * Detecta se há CAPTCHA na página
   */
  private async detectCaptcha(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        const captchaTexts = [
          'Queremos ter certeza de que é realmente com você',
          'não com um robô',
          'Enigma resolvido em',
          'Verifique que você é humano',
          'Por que essa verificação é necessária'
        ];
        
        const bodyText = document.body.innerText.toLowerCase();
        return captchaTexts.some(text => bodyText.includes(text.toLowerCase()));
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Extrai dados dos jogos da página
   */
  private async extractGamesData(): Promise<Game[]> {
    try {
      // Aguardar elementos de jogos carregarem
      await this.page.waitForSelector('[class*="event"]', { timeout: 10000 }).catch(() => {});
      
      const games = await this.page.evaluate(() => {
        const gamesList: any[] = [];
        
        // Procurar por diferentes estruturas possíveis de jogos
        const selectors = [
          '[data-qa*="event-card"]',
          '[class*="event-row"]',
          '[class*="event-item"]',
          '[class*="match-event"]',
          'div[class*="event"] > div[class*="content"]',
          '.events-list > div',
          '[class*="EventRow"]'
        ];
        
        let gameElements: NodeListOf<Element> = null;
        
        // Tentar cada seletor até encontrar jogos
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            gameElements = elements;
            break;
          }
        }
        
        if (!gameElements || gameElements.length === 0) {
          // Tentar uma abordagem mais genérica
          const allDivs = document.querySelectorAll('div');
          const possibleGames: Element[] = [];
          
          allDivs.forEach(div => {
            const text = div.textContent || '';
            // Verificar se parece um jogo (tem "x" ou "vs" e números que parecem odds)
            if ((text.includes(' x ') || text.includes(' X ') || text.includes(' vs ')) && 
                /\d+\.\d{2}/.test(text)) {
              possibleGames.push(div);
            }
          });
          
          if (possibleGames.length > 0) {
            gameElements = possibleGames as any;
          }
        }
        
        if (gameElements) {
          gameElements.forEach((element, index) => {
            if (index >= 20) return; // Limitar a 20 jogos
            
            try {
              const text = element.textContent || '';
              
              // Extrair times (procurar padrão "Time1 x Time2" ou "Time1 vs Time2")
              const teamsMatch = text.match(/([A-Za-zÀ-ÿ\s\-\.]+?)\s+[xX]\s+([A-Za-zÀ-ÿ\s\-\.]+?)(?:\s|$)/);
              
              if (teamsMatch) {
                const homeTeam = teamsMatch[1].trim();
                const awayTeam = teamsMatch[2].trim();
                
                // Extrair odds (números no formato X.XX)
                const oddsMatches = text.match(/\d+\.\d{2}/g) || [];
                
                const game: any = {
                  homeTeam,
                  awayTeam,
                  odds: {}
                };
                
                // Assumir que as primeiras 3 odds são 1X2
                if (oddsMatches.length >= 3) {
                  game.odds.homeWin = oddsMatches[0];
                  game.odds.draw = oddsMatches[1];
                  game.odds.awayWin = oddsMatches[2];
                }
                
                // Tentar extrair data/hora
                const dateMatch = text.match(/\d{1,2}[/\.]\d{1,2}/);
                const timeMatch = text.match(/\d{1,2}:\d{2}/);
                
                if (dateMatch) game.date = dateMatch[0];
                if (timeMatch) game.time = timeMatch[0];
                
                gamesList.push(game);
              }
            } catch (e) {
              // Ignorar erros de parsing individual
            }
          });
        }
        
        return gamesList;
      });
      
      return games;
    } catch (error) {
      this.logger.error('Erro ao extrair dados dos jogos:', error);
      return [];
    }
  }

  /**
   * Extrai odds de escanteios (corners)
   */
  async extractCornersOdds(competition: string = 'brasileirao-serie-c', competitionId: string = '18249'): Promise<OddsResult> {
    try {
      this.logger.log(`🎯 Iniciando extração de odds de escanteios para ${competition}...`);
      
      // Criar página
      this.page = await this.playwrightStealthService.createPage();
      
      // URL com filtro de corners
      const url = `https://www.betano.bet.br/sport/futebol/brasil/${competition}/${competitionId}/?bt=corners`;
      
      this.logger.log(`📍 Navegando para: ${url}`);
      
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(5000);
      
      // Verificar CAPTCHA
      const hasCaptcha = await this.detectCaptcha();
      if (hasCaptcha) {
        return {
          success: false,
          message: 'CAPTCHA detectado ao acessar odds de escanteios'
        };
      }
      
      // Implementar extração específica de corners aqui
      this.logger.log('✅ Página de escanteios carregada');
      
      return {
        success: true,
        message: 'Extração de escanteios em desenvolvimento',
        games: []
      };
      
    } catch (error) {
      this.logger.error('❌ Erro ao extrair odds de escanteios:', error);
      return {
        success: false,
        message: `Erro: ${error.message}`
      };
    } finally {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }

  /**
   * Lista todas as competições disponíveis
   */
  async listCompetitions(): Promise<any> {
    try {
      this.page = await this.playwrightStealthService.createPage();
      
      await this.page.goto('https://www.betano.bet.br/sport/futebol/brasil/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(3000);
      
      const competitions = await this.page.evaluate(() => {
        const links = document.querySelectorAll('a[href*="/sport/futebol/brasil/"]');
        const comps: any[] = [];
        
        links.forEach(link => {
          const href = link.getAttribute('href');
          const text = link.textContent?.trim();
          
          if (href && text && !comps.find(c => c.href === href)) {
            comps.push({
              name: text,
              href: href,
              id: href.match(/\/(\d+)\/?$/)?.[1] || ''
            });
          }
        });
        
        return comps;
      });
      
      return {
        success: true,
        competitions
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    } finally {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }
}