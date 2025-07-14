import { Body, Controller, Get, Post, Query, Delete } from '@nestjs/common';
import { BetanoService } from './betano.service';
import { BetanoNoLoginService } from './betano-no-login.service';
import { BetanoFixedParserService } from './betano-fixed-parser.service';
import { BetanoHandicapService } from './betano-handicap.service';
import { BetanoCacheService } from './betano-cache.service';

@Controller('betano')
export class BetanoController {
  constructor(
    private readonly betanoService: BetanoService,
    private readonly betanoNoLoginService: BetanoNoLoginService,
    private readonly betanoFixedParserService: BetanoFixedParserService,
    private readonly betanoHandicapService: BetanoHandicapService,
    private readonly betanoCacheService: BetanoCacheService
  ) {}

  @Post('authenticate')
  async authenticate(@Body() credentials: { username: string; password: string; forceNewLogin?: boolean }) {
    return this.betanoService.authenticate(
      credentials.username, 
      credentials.password,
      credentials.forceNewLogin || false
    );
  }

  @Get('session/status')
  async getSessionStatus() {
    return this.betanoService.getSessionStatus();
  }

  @Post('session/close')
  async closeSession() {
    await this.betanoService.closeSession();
    return { message: 'Sessão fechada com sucesso' };
  }

  @Post('scrape/soccer')
  async scrapeSoccer() {
    return this.betanoService.scrapeSoccerMatches();
  }

  @Post('test/overlays')
  async testOverlays() {
    return this.betanoService.testOverlayDetection();
  }

  @Post('session/clear')
  async clearStoredSession() {
    await this.betanoService.clearStoredSession();
    return { message: 'Sessão armazenada removida com sucesso' };
  }

  // Novos endpoints sem login
  @Get('odds/serie-c')
  async getSerieCodeds() {
    return this.betanoNoLoginService.extractOddsWithoutLogin('brasileirao-serie-c', '18249');
  }

  @Get('odds/competition')
  async getCompetitionOdds(
    @Query('name') name: string = 'brasileirao-serie-c',
    @Query('id') id: string = '18249'
  ) {
    return this.betanoNoLoginService.extractOddsWithoutLogin(name, id);
  }

  @Get('odds/corners')
  async getCornersOdds(
    @Query('competition') competition: string = 'brasileirao-serie-c',
    @Query('id') id: string = '18249'
  ) {
    return this.betanoNoLoginService.extractSpecificMarket('corners', competition, id);
  }

  @Get('odds/goals')
  async getGoalsOdds(
    @Query('competition') competition: string = 'brasileirao-serie-c',
    @Query('id') id: string = '18249'
  ) {
    return this.betanoNoLoginService.extractSpecificMarket('goals', competition, id);
  }

  // Endpoint com parser corrigido
  @Get('odds/serie-c-fixed')
  async getSerieCOddsFixed() {
    return this.betanoFixedParserService.extractOddsCorrectly('brasileirao-serie-c', '18249');
  }

  // Endpoints para handicap asiático
  @Get('handicap/serie-c')
  async getHandicapsSerie() {
    return this.betanoHandicapService.extractAllHandicaps('brasileirao-serie-c', '18249');
  }

  @Get('handicap/competition')
  async getHandicapsCompetition(
    @Query('competition') competition: string = 'brasileirao-serie-c',
    @Query('id') id: string = '18249'
  ) {
    return this.betanoHandicapService.extractAllHandicaps(competition, id);
  }

  @Post('handicap/single-game')
  async getHandicapSingleGame(@Body() data: { gameUrl: string }) {
    return this.betanoHandicapService.extractSingleGameHandicaps(data.gameUrl);
  }

  // Endpoints de gerenciamento de cache
  @Get('cache/stats')
  async getCacheStats() {
    return this.betanoCacheService.getCacheStats();
  }

  @Delete('cache/cleanup')
  async cleanupCache() {
    await this.betanoCacheService.cleanupExpiredCache();
    return { message: 'Cache expirado removido com sucesso' };
  }

  @Delete('cache/clear-all')
  async clearAllCache() {
    const result = await this.betanoCacheService.clearAllCache();
    return { 
      message: `Todo o cache removido com sucesso`,
      removed: result.removed
    };
  }

  @Get('handicap/structured')
  async getStructuredHandicaps(
    @Query('competition') competition: string = 'brasileirao-serie-c',
    @Query('id') id: string = '18249'
  ) {
    const result = await this.betanoCacheService.getStructuredHandicaps(competition, id);
    return result || { success: false, message: 'Dados não encontrados ou expirados', games: [], totalGames: 0 };
  }

  @Post('handicap/force-refresh')
  async forceRefreshHandicaps(
    @Body() data: { competition?: string; id?: string }
  ) {
    // Limpar cache específico primeiro
    const competition = data.competition || 'brasileirao-serie-c';
    const id = data.id || '18249';
    
    // Forçar nova extração (não vai usar cache)
    const result = await this.betanoHandicapService.extractAllHandicaps(competition, id);
    
    return {
      ...result,
      message: `${result.message} (atualização forçada)`
    };
  }
}