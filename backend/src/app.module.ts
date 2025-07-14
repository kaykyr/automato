import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BettingHousesModule } from '@modules/betting-houses/betting-houses.module';
import { BetanoModule } from '@modules/betano/betano.module';
import { ScrapingModule } from '@modules/scraping/scraping.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PlaywrightModule } from '@providers/playwright/playwright.module';
import { DatabaseModule } from '@providers/database/database.module';
import { HealthModule } from './health/health.module';
import { FlowsModule } from './flows/flows.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    PlaywrightModule,
    BettingHousesModule,
    BetanoModule,
    ScrapingModule,
    AuthModule,
    HealthModule,
    FlowsModule,
    WebSocketModule,
  ],
})
export class AppModule {}