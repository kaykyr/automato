import { Injectable } from '@nestjs/common';

@Injectable()
export class ScrapingService {
  async scrapeAll() {
    return {
      message: 'Scraping geral iniciado',
      houses: ['betano'],
      startedAt: new Date()
    };
  }

  async getStats() {
    return {
      totalScrapes: 0,
      successRate: 100,
      lastScrape: new Date(),
      activeTasks: 0
    };
  }

  async scheduleTask(task: string, schedule: string) {
    return {
      success: true,
      message: `Tarefa '${task}' agendada para '${schedule}'`,
      taskId: Math.random().toString(36).substr(2, 9)
    };
  }
}