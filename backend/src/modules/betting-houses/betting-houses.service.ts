import { Injectable } from '@nestjs/common';

@Injectable()
export class BettingHousesService {
  async findAll() {
    // Mock data para teste
    return {
      data: [
        {
          id: 1,
          name: 'Betano',
          country: 'Brasil',
          isActive: true,
          baseUrl: 'https://www.betano.bet.br/',
          createdAt: new Date('2024-01-01')
        }
      ]
    };
  }

  async getHouseData(id: string) {
    return {
      data: {
        id,
        events: [],
        lastUpdate: new Date()
      }
    };
  }

  async getHouseStats(id: string) {
    return {
      data: {
        id,
        totalEvents: 0,
        successRate: 100,
        lastScrape: new Date()
      }
    };
  }
}