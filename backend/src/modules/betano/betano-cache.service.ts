import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HandicapCache } from './entities/handicap-cache.entity';
import { HandicapCompetition } from './entities/handicap-competition.entity';
import { HandicapGame } from './entities/handicap-game.entity';
import { HandicapOption } from './entities/handicap-option.entity';
import { HandicapResult, GameHandicaps } from './betano-handicap.service';

@Injectable()
export class BetanoCacheService {
  private readonly logger = new Logger(BetanoCacheService.name);
  private readonly CACHE_DURATION_MINUTES = 5;

  constructor(
    @InjectRepository(HandicapCache)
    private readonly cacheRepository: Repository<HandicapCache>,
    @InjectRepository(HandicapCompetition)
    private readonly competitionRepository: Repository<HandicapCompetition>,
    @InjectRepository(HandicapGame)
    private readonly gameRepository: Repository<HandicapGame>,
    @InjectRepository(HandicapOption)
    private readonly optionRepository: Repository<HandicapOption>,
  ) {}

  /**
   * Busca dados do cache ou retorna null se expirado/inexistente
   */
  async getCachedHandicaps(competition: string, competitionId: string): Promise<HandicapResult | null> {
    try {
      const cacheKey = this.generateCacheKey(competition, competitionId);
      
      const cached = await this.cacheRepository.findOne({
        where: { cacheKey }
      });

      if (!cached) {
        this.logger.log(`📦 Cache miss para ${cacheKey}`);
        return null;
      }

      if (cached.isExpired()) {
        this.logger.log(`⏰ Cache expirado para ${cacheKey}, removendo...`);
        await this.cacheRepository.remove(cached);
        return null;
      }

      const timeLeft = cached.getTimeToExpiry();
      this.logger.log(`✅ Cache hit para ${cacheKey} (${timeLeft}min restantes)`);
      
      return JSON.parse(cached.data) as HandicapResult;
    } catch (error) {
      this.logger.error('❌ Erro ao buscar cache:', error);
      return null;
    }
  }

  /**
   * Salva dados no cache com expiração de 5 minutos
   */
  async setCachedHandicaps(
    competition: string, 
    competitionId: string, 
    data: HandicapResult
  ): Promise<void> {
    try {
      const cacheKey = this.generateCacheKey(competition, competitionId);
      const expiresAt = new Date(Date.now() + this.CACHE_DURATION_MINUTES * 60 * 1000);

      // Remover cache anterior se existir
      await this.cacheRepository.delete({ cacheKey });

      // Criar novo cache
      const cacheEntry = this.cacheRepository.create({
        cacheKey,
        data: JSON.stringify(data),
        expiresAt,
        metadata: {
          competition,
          competitionId,
          totalGames: data.totalGames,
          cachedAt: new Date().toISOString()
        }
      });

      await this.cacheRepository.save(cacheEntry);
      
      this.logger.log(`💾 Cache salvo para ${cacheKey} (expira em ${this.CACHE_DURATION_MINUTES}min)`);
      
      // Salvar dados estruturados no banco também
      await this.saveStructuredData(competition, competitionId, data);
      
    } catch (error) {
      this.logger.error('❌ Erro ao salvar cache:', error);
    }
  }

  /**
   * Salva dados estruturados no banco para consultas avançadas
   */
  private async saveStructuredData(
    competition: string, 
    competitionId: string, 
    data: HandicapResult
  ): Promise<void> {
    try {
      // Buscar ou criar competição
      let competitionEntity = await this.competitionRepository.findOne({
        where: { name: competition, competitionId }
      });

      if (!competitionEntity) {
        competitionEntity = this.competitionRepository.create({
          name: competition,
          competitionId,
          url: `https://www.betano.bet.br/sport/futebol/brasil/${competition}/${competitionId}/`,
          metadata: {
            lastUpdate: new Date().toISOString(),
            source: 'betano-handicap-service'
          }
        });
        await this.competitionRepository.save(competitionEntity);
      } else {
        // Atualizar última atualização
        competitionEntity.metadata = {
          ...competitionEntity.metadata,
          lastUpdate: new Date().toISOString()
        };
        await this.competitionRepository.save(competitionEntity);
      }

      // Desativar jogos antigos desta competição
      await this.gameRepository.update(
        { competitionId: competitionEntity.id },
        { isActive: false }
      );

      // Salvar jogos atuais
      for (const gameData of data.games) {
        // Buscar jogo existente
        let game = await this.gameRepository.findOne({
          where: { gameId: gameData.gameId, competitionId: competitionEntity.id },
          relations: ['handicaps']
        });

        if (!game) {
          game = this.gameRepository.create({
            gameId: gameData.gameId,
            homeTeam: gameData.homeTeam,
            awayTeam: gameData.awayTeam,
            gameUrl: gameData.gameUrl,
            isLive: gameData.isLive,
            competitionId: competitionEntity.id,
            metadata: {
              extractedAt: new Date().toISOString()
            }
          });
        } else {
          // Atualizar dados do jogo
          game.homeTeam = gameData.homeTeam;
          game.awayTeam = gameData.awayTeam;
          game.gameUrl = gameData.gameUrl;
          game.isLive = gameData.isLive;
          game.isActive = true;
          game.metadata = {
            ...game.metadata,
            extractedAt: new Date().toISOString()
          };
        }

        await this.gameRepository.save(game);

        // Remover handicaps antigos
        if (game.handicaps?.length > 0) {
          await this.optionRepository.remove(game.handicaps);
        }

        // Salvar novos handicaps
        if (gameData.handicaps && gameData.handicaps.length > 0) {
          const handicapOptions = gameData.handicaps.map(handicap => 
            this.optionRepository.create({
              team: handicap.team,
              handicap: handicap.handicap,
              odd: handicap.odd,
              selectionId: handicap.selectionId,
              gameId: game.id,
              metadata: {
                extractedAt: new Date().toISOString()
              }
            })
          );

          await this.optionRepository.save(handicapOptions);
        }
      }

      this.logger.log(`🗄️ Dados estruturados salvos: ${data.games.length} jogos da ${competition}`);
      
    } catch (error) {
      this.logger.error('❌ Erro ao salvar dados estruturados:', error);
    }
  }

  /**
   * Busca dados estruturados do banco (para consultas avançadas)
   */
  async getStructuredHandicaps(competition: string, competitionId: string): Promise<HandicapResult | null> {
    try {
      const competitionEntity = await this.competitionRepository.findOne({
        where: { name: competition, competitionId },
        relations: ['games', 'games.handicaps']
      });

      if (!competitionEntity) {
        return null;
      }

      const activeGames = competitionEntity.games.filter(game => game.isActive);
      
      if (activeGames.length === 0) {
        return null;
      }

      // Verificar se os dados não são muito antigos (mais de 5 minutos)
      const oldestGame = activeGames.reduce((oldest, game) => 
        game.updatedAt < oldest.updatedAt ? game : oldest
      );

      const minutesOld = (Date.now() - oldestGame.updatedAt.getTime()) / (1000 * 60);
      if (minutesOld > this.CACHE_DURATION_MINUTES) {
        this.logger.log(`📊 Dados estruturados expirados (${minutesOld.toFixed(1)}min)`);
        return null;
      }

      // Converter para formato de resposta
      const games: GameHandicaps[] = activeGames.map(game => ({
        gameId: game.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        gameUrl: game.gameUrl,
        isLive: game.isLive,
        handicaps: game.handicaps.filter(h => h.isActive).map(h => ({
          team: h.team,
          handicap: h.handicap,
          odd: Number(h.odd),
          selectionId: h.selectionId
        }))
      }));

      this.logger.log(`📊 Dados estruturados encontrados: ${games.length} jogos`);

      return {
        success: true,
        message: `${games.length} jogos encontrados no banco de dados`,
        games,
        totalGames: games.length,
        timestamp: new Date()
      };

    } catch (error) {
      this.logger.error('❌ Erro ao buscar dados estruturados:', error);
      return null;
    }
  }

  /**
   * Limpa cache expirado automaticamente
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      const expired = await this.cacheRepository
        .createQueryBuilder()
        .where('expiresAt < :now', { now: new Date() })
        .getMany();

      if (expired.length > 0) {
        await this.cacheRepository.remove(expired);
        this.logger.log(`🧹 ${expired.length} entradas de cache expiradas removidas`);
      }
    } catch (error) {
      this.logger.error('❌ Erro na limpeza de cache:', error);
    }
  }

  /**
   * Limpa TODO o cache independentemente se expirado ou não
   */
  async clearAllCache(): Promise<{ removed: number }> {
    try {
      const allCache = await this.cacheRepository.find();
      const count = allCache.length;
      
      if (count > 0) {
        await this.cacheRepository.remove(allCache);
        this.logger.log(`🧹 TODO o cache removido: ${count} entradas`);
      }
      
      return { removed: count };
    } catch (error) {
      this.logger.error('❌ Erro ao limpar todo o cache:', error);
      return { removed: 0 };
    }
  }

  /**
   * Estatísticas do cache
   */
  async getCacheStats(): Promise<any> {
    try {
      const total = await this.cacheRepository.count();
      const active = await this.cacheRepository
        .createQueryBuilder()
        .where('expiresAt > :now', { now: new Date() })
        .getCount();
      
      const competitions = await this.competitionRepository.count();
      const games = await this.gameRepository.count({ where: { isActive: true } });
      const options = await this.optionRepository.count({ where: { isActive: true } });

      return {
        cache: {
          total,
          active,
          expired: total - active
        },
        structured: {
          competitions,
          games,
          options
        },
        settings: {
          cacheDurationMinutes: this.CACHE_DURATION_MINUTES
        }
      };
    } catch (error) {
      this.logger.error('❌ Erro ao obter estatísticas:', error);
      return null;
    }
  }

  private generateCacheKey(competition: string, competitionId: string): string {
    return `handicap:${competition}:${competitionId}`;
  }
}