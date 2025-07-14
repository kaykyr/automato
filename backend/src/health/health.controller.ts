import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'Betting API',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected'
      }
    };
  }

  @Get('database')
  getDatabaseHealth() {
    return {
      status: 'connected',
      type: 'mariadb',
      timestamp: new Date().toISOString()
    };
  }
}