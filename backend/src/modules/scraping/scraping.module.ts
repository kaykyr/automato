import { Module } from '@nestjs/common';
import { ScrapingController } from './scraping.controller';
import { ScrapingService } from './scraping.service';

@Module({
  controllers: [ScrapingController],
  providers: [ScrapingService],
})
export class ScrapingModule {}