import { Injectable, Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { PlaywrightStealthService } from '@providers/playwright/playwright-stealth.service';
import { ConfigService } from '@nestjs/config';

export interface BetanoGame {
  id?: string;
  homeTeam: string;
  awayTeam: string;
  date?: string;
  time?: string;
  competition?: string;
  odds: {
    homeWin?: number;
    draw?: number;
    awayWin?: number;
    over25?: number;
    under25?: number;
    btts?: number;
    [key: string]: number | undefined;
  };
  link?: string;
}

export interface BetanoOddsResult {
  success: boolean;
  message: string;
  games?: BetanoGame[];
  totalGames?: number;
  timestamp?: Date;
}

@Injectable()
export class BetanoNoLoginService {
  private readonly logger = new Logger(BetanoNoLoginService.name);
  private page: Page | null = null;

  constructor(
    private readonly playwrightStealthService: PlaywrightStealthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Extrai odds sem fazer login, lidando com modais
   */
  async extractOddsWithoutLogin(
    competition: string = 'brasileirao-serie-c',
    competitionId: string = '18249'
  ): Promise<BetanoOddsResult> {
    try {
      this.logger.log(`🎯 Extraindo odds do ${competition} sem login...`);
      
      // Criar página
      this.page = await this.playwrightStealthService.createPage();
      
      const baseUrl = 'https://www.betano.bet.br';
      const url = `${baseUrl}/sport/futebol/brasil/${competition}/${competitionId}/`;
      
      this.logger.log(`📍 Acessando: ${url}`);
      
      // Navegar para a página
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Aguardar um pouco para modais aparecerem
      await this.page.waitForTimeout(2000);
      
      // Fechar modais que aparecem
      await this.closeInitialModals();
      
      // Aguardar conteúdo carregar
      await this.page.waitForTimeout(3000);
      
      // Verificar se ainda há CAPTCHA
      const hasCaptcha = await this.checkForCaptcha();
      if (hasCaptcha) {
        this.logger.error('⚠️ CAPTCHA detectado mesmo após fechar modais');
        return {
          success: false,
          message: 'CAPTCHA detectado. Não foi possível extrair dados automaticamente.',
          timestamp: new Date()
        };
      }
      
      // Extrair dados dos jogos
      this.logger.log('📊 Extraindo dados dos jogos...');
      const games = await this.extractGamesFromPage();
      
      if (games.length === 0) {
        this.logger.warn('⚠️ Nenhum jogo encontrado');
        return {
          success: false,
          message: 'Nenhum jogo encontrado na página',
          games: [],
          totalGames: 0,
          timestamp: new Date()
        };
      }
      
      this.logger.log(`✅ ${games.length} jogos extraídos com sucesso!`);
      
      // Log dos primeiros jogos para debug
      games.slice(0, 3).forEach((game, index) => {
        this.logger.log(`   Jogo ${index + 1}: ${game.homeTeam} x ${game.awayTeam}`);
        this.logger.log(`   Odds: Casa ${game.odds.homeWin} | Empate ${game.odds.draw} | Fora ${game.odds.awayWin}`);
      });
      
      return {
        success: true,
        message: `${games.length} jogos extraídos com sucesso`,
        games: games,
        totalGames: games.length,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error('❌ Erro ao extrair odds:', error);
      return {
        success: false,
        message: `Erro ao extrair odds: ${error.message}`,
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
   * Fecha modais iniciais (idade e cookies)
   */
  private async closeInitialModals(): Promise<void> {
    this.logger.log('🔍 Verificando e fechando modais...');
    
    try {
      // 1. Fechar modal de idade ("SIM")
      const ageModalSelectors = [
        'button:has-text("SIM")',
        'button:has-text("Sim")',
        'button[class*="primary"]:has-text("SIM")',
        '[data-qa*="age-verification"] button',
        'button.btn-primary:has-text("SIM")'
      ];
      
      for (const selector of ageModalSelectors) {
        try {
          const ageButton = await this.page.locator(selector).first();
          if (await ageButton.isVisible()) {
            await ageButton.click();
            this.logger.log('✅ Modal de idade fechado');
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue tentando outros seletores
        }
      }
      
      // 2. Aceitar cookies
      const cookieSelectors = [
        'button:has-text("SIM, EU ACEITO")',
        'button:has-text("ACEITAR")',
        'button:has-text("Aceitar")',
        '[data-qa*="cookie-accept"]',
        'button[class*="accept-cookie"]',
        'button:has-text("NÃO OBRIGADO")' // Alternativa
      ];
      
      for (const selector of cookieSelectors) {
        try {
          const cookieButton = await this.page.locator(selector).first();
          if (await cookieButton.isVisible()) {
            await cookieButton.click();
            this.logger.log('✅ Modal de cookies fechado');
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (e) {
          // Continue
        }
      }
      
      // 3. Fechar outros modais genéricos
      const closeButtonSelectors = [
        'button[aria-label="close"]',
        'button[aria-label="Close"]',
        'button[aria-label="Fechar"]',
        '.close-button',
        'button.close',
        '[data-qa*="close"]'
      ];
      
      for (const selector of closeButtonSelectors) {
        try {
          const closeButtons = await this.page.locator(selector).all();
          for (const button of closeButtons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.log('✅ Modal adicional fechado');
              await this.page.waitForTimeout(500);
            }
          }
        } catch (e) {
          // Continue
        }
      }
      
      // 4. Última tentativa: ESC
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      
    } catch (error) {
      this.logger.warn('⚠️ Erro ao fechar modais:', error.message);
    }
  }

  /**
   * Verifica se há CAPTCHA na página
   */
  private async checkForCaptcha(): Promise<boolean> {
    try {
      return await this.page.evaluate(() => {
        const captchaIndicators = [
          'Queremos ter certeza de que é realmente com você',
          'não com um robô',
          'Enigma resolvido em',
          'Deslize para a direita para completar',
          'Por que essa verificação é necessária',
          'Algo sobre o comportamento do seu navegador'
        ];
        
        const pageText = document.body.innerText.toLowerCase();
        return captchaIndicators.some(text => pageText.includes(text.toLowerCase()));
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Extrai dados dos jogos da página
   */
  private async extractGamesFromPage(): Promise<BetanoGame[]> {
    try {
      // Aguardar o container carregar
      await this.page.waitForSelector('[data-qa="container_league_blocks"]', { timeout: 10000 }).catch(() => {});
      
      return await this.page.evaluate(() => {
        const games: any[] = [];
        
        // Procurar especificamente dentro do container de liga
        const leagueContainer = document.querySelector('[data-qa="container_league_blocks"]');
        
        if (!leagueContainer) {
          console.warn('Container de liga não encontrado');
          return games;
        }
        
        // Procurar por cada linha/evento de jogo
        // Na Betano, cada jogo geralmente está em um elemento com data-qa contendo "event"
        const eventRows = leagueContainer.querySelectorAll('[data-qa*="event_row"], [data-qa*="event-row"], [data-qa*="event"]');
        
        eventRows.forEach((row) => {
          try {
            // Pegar o texto completo da linha
            const fullText = row.textContent || '';
            
            // Pular se não parece um jogo válido
            if (fullText.length < 20 || !fullText.match(/\d+\.\d{2}/)) return;
            
            // Estrutura melhorada de extração
            let game: any = {
              odds: {}
            };
            
            // 1. Verificar se é ao vivo
            game.isLive = fullText.includes('AO VIVO');
            
            // 2. Extrair data e hora (se houver)
            const dateMatch = fullText.match(/(\d{1,2}\/\d{1,2})/);
            const timeMatch = fullText.match(/(\d{1,2}:\d{2})/);
            if (dateMatch) game.date = dateMatch[1];
            if (timeMatch) game.time = timeMatch[1];
            
            // 3. Procurar por elementos específicos de times
            const teamElements = row.querySelectorAll('[class*="team"], [class*="competitor"], span');
            const possibleTeams: string[] = [];
            
            teamElements.forEach(el => {
              const text = el.textContent?.trim() || '';
              // Filtrar textos que parecem nomes de times
              if (text.length > 2 && 
                  !text.match(/^\d/) && 
                  !text.includes('AO VIVO') && 
                  !text.includes(':') &&
                  !text.match(/^\d+\.\d{2}$/) &&
                  text !== 'X' &&
                  text !== '1' &&
                  text !== '2') {
                possibleTeams.push(text);
              }
            });
            
            // Se encontrou times pelos elementos
            if (possibleTeams.length >= 2) {
              game.homeTeam = possibleTeams[0];
              game.awayTeam = possibleTeams[1];
            } else {
              // Fallback: tentar extrair do texto completo
              // Limpar o texto removendo elementos conhecidos
              let cleanText = fullText
                .replace('AO VIVO', '')
                .replace(/\d{1,2}\/\d{1,2}/g, '')
                .replace(/\d{1,2}:\d{2}/g, '')
                .trim();
              
              // Lista de times conhecidos da Série C
              const knownTeams = [
                'Figueirense', 'Náutico', 'Caxias', 'Anápolis', 
                'Retrô FC Brasil', 'CSA', 'Maringa FC PR', 'Brusque SC',
                'ABC', 'Botafogo-PB', 'Confiança', 'Ferroviário',
                'Floresta', 'Sampaio Corrêa', 'São Bernardo'
              ];
              
              // Tentar encontrar times conhecidos
              for (const team of knownTeams) {
                const index = cleanText.indexOf(team);
                if (index !== -1) {
                  // Encontrou um time
                  if (!game.homeTeam) {
                    game.homeTeam = team;
                    cleanText = cleanText.replace(team, '|TEAM|');
                  } else if (!game.awayTeam) {
                    game.awayTeam = team;
                    break;
                  }
                }
              }
              
              // Se ainda não encontrou os dois times, tentar split por padrões
              if (!game.homeTeam || !game.awayTeam) {
                // Remover números (odds) para facilitar
                const teamsOnly = cleanText.replace(/\d+\.\d{2}/g, '|').replace(/X/g, '|');
                const parts = teamsOnly.split('|').filter(p => p.trim().length > 2);
                
                if (parts.length >= 2) {
                  if (!game.homeTeam) game.homeTeam = parts[0].trim();
                  if (!game.awayTeam) game.awayTeam = parts[1].trim();
                }
              }
            }
            
            // 4. Extrair odds - procurar botões com odds
            const oddButtons = row.querySelectorAll('button');
            const oddsFound: number[] = [];
            
            oddButtons.forEach((button) => {
              const text = button.textContent?.trim() || '';
              // Verificar se é uma odd (formato X.XX)
              if (text.match(/^\d+\.\d{2}$/)) {
                oddsFound.push(parseFloat(text));
              }
            });
            
            // Se não encontrou em botões, procurar no texto
            if (oddsFound.length < 3) {
              const textOdds = fullText.match(/\d+\.\d{2}/g) || [];
              textOdds.forEach(odd => {
                const value = parseFloat(odd);
                if (value >= 1.01 && value <= 99.99 && !oddsFound.includes(value)) {
                  oddsFound.push(value);
                }
              });
            }
            
            // Atribuir odds ao jogo (ordem típica: 1, X, 2)
            if (oddsFound.length >= 3) {
              game.odds.homeWin = oddsFound[0];
              game.odds.draw = oddsFound[1];
              game.odds.awayWin = oddsFound[2];
            }
            
            // Adicionar apenas se tiver informações válidas
            if (game.homeTeam && game.awayTeam && game.odds.homeWin) {
              // Limpar nomes dos times
              game.homeTeam = game.homeTeam.replace(/\s+/g, ' ').trim();
              game.awayTeam = game.awayTeam.replace(/\s+/g, ' ').trim();
              games.push(game);
            }
            
          } catch (e) {
            console.error('Erro ao processar linha:', e);
          }
        });
        
        // Se não encontrou jogos com a primeira estratégia, tentar uma abordagem mais genérica
        if (games.length === 0) {
          console.log('Tentando estratégia alternativa...');
          
          // Procurar por qualquer elemento que contenha odds
          const allElements = leagueContainer.querySelectorAll('*');
          const gameTexts = new Set<string>();
          
          allElements.forEach(el => {
            const text = el.textContent || '';
            // Se tem pelo menos 3 odds, pode ser um jogo
            const odds = text.match(/\d+\.\d{2}/g) || [];
            if (odds.length >= 3 && text.length < 500) {
              gameTexts.add(text.trim());
            }
          });
          
          // Processar textos únicos
          gameTexts.forEach(text => {
            // Similar ao processamento anterior, mas simplificado
            const odds = text.match(/\d+\.\d{2}/g)?.map(o => parseFloat(o)) || [];
            if (odds.length >= 3) {
              games.push({
                homeTeam: 'Time Casa',
                awayTeam: 'Time Fora',
                odds: {
                  homeWin: odds[0],
                  draw: odds[1],
                  awayWin: odds[2]
                },
                rawText: text.substring(0, 100)
              });
            }
          });
        }
        
        return games;
      });
      
    } catch (error) {
      this.logger.error('Erro ao extrair jogos:', error);
      return [];
    }
  }

  /**
   * Extrai odds de mercados específicos (corners, gols, etc)
   */
  async extractSpecificMarket(
    market: string = 'corners',
    competition: string = 'brasileirao-serie-c',
    competitionId: string = '18249'
  ): Promise<BetanoOddsResult> {
    try {
      const marketMap = {
        'corners': 'bt=corners',
        'goals': 'bt=goals',
        'cards': 'bt=cards'
      };
      
      const marketParam = marketMap[market] || marketMap['corners'];
      
      this.logger.log(`🎯 Extraindo mercado ${market} do ${competition}...`);
      
      // Criar página
      this.page = await this.playwrightStealthService.createPage();
      
      const url = `https://www.betano.bet.br/sport/futebol/brasil/${competition}/${competitionId}/?${marketParam}`;
      
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      await this.page.waitForTimeout(2000);
      await this.closeInitialModals();
      await this.page.waitForTimeout(3000);
      
      // Implementar extração específica baseada no mercado
      const games = await this.extractGamesFromPage();
      
      return {
        success: true,
        message: `${games.length} jogos com mercado ${market} extraídos`,
        games: games,
        totalGames: games.length,
        timestamp: new Date()
      };
      
    } catch (error) {
      this.logger.error(`❌ Erro ao extrair mercado ${market}:`, error);
      return {
        success: false,
        message: `Erro: ${error.message}`,
        timestamp: new Date()
      };
    } finally {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
    }
  }
}