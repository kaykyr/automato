import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BetanoController } from './betano.controller';
import { BetanoService } from './betano.service';
import { BetanoCaptchaService } from './betano-captcha.service';
import { BetanoOddsService } from './betano-odds.service';
import { BetanoNoLoginService } from './betano-no-login.service';
import { BetanoFixedParserService } from './betano-fixed-parser.service';
import { BetanoHandicapService } from './betano-handicap.service';
import { BetanoCacheService } from './betano-cache.service';
import { PlaywrightModule } from '@providers/playwright/playwright.module';
import { HandicapCache } from './entities/handicap-cache.entity';
import { HandicapCompetition } from './entities/handicap-competition.entity';
import { HandicapGame } from './entities/handicap-game.entity';
import { HandicapOption } from './entities/handicap-option.entity';

@Module({
  imports: [
    PlaywrightModule,
    TypeOrmModule.forFeature([
      HandicapCache,
      HandicapCompetition,
      HandicapGame,
      HandicapOption
    ])
  ],
  controllers: [BetanoController],
  providers: [
    BetanoService, 
    BetanoCaptchaService,
    BetanoOddsService,
    BetanoNoLoginService,
    BetanoFixedParserService,
    BetanoHandicapService,
    BetanoCacheService
  ],
  exports: [
    BetanoService, 
    BetanoCaptchaService,
    BetanoOddsService,
    BetanoNoLoginService,
    BetanoFixedParserService,
    BetanoHandicapService,
    BetanoCacheService
  ],
})
export class BetanoModule {}