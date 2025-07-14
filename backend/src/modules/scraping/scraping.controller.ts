import { Body, Controller, Get, Post } from '@nestjs/common';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('all')
  async scrapeAll() {
    return this.scrapingService.scrapeAll();
  }

  @Get('stats')
  async getStats() {
    return this.scrapingService.getStats();
  }

  @Post('schedule')
  async scheduleTask(@Body() data: { task: string; schedule: string }) {
    return this.scrapingService.scheduleTask(data.task, data.schedule);
  }
}