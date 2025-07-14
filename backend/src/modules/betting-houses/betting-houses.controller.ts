import { Controller, Get, Param } from '@nestjs/common';
import { BettingHousesService } from './betting-houses.service';

@Controller('betting-houses')
export class BettingHousesController {
  constructor(private readonly bettingHousesService: BettingHousesService) {}

  @Get()
  async findAll() {
    return this.bettingHousesService.findAll();
  }

  @Get(':id/data')
  async getHouseData(@Param('id') id: string) {
    return this.bettingHousesService.getHouseData(id);
  }

  @Get(':id/stats')
  async getHouseStats(@Param('id') id: string) {
    return this.bettingHousesService.getHouseStats(id);
  }
}