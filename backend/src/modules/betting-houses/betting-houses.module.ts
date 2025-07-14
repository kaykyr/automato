import { Module } from '@nestjs/common';
import { BettingHousesController } from './betting-houses.controller';
import { BettingHousesService } from './betting-houses.service';

@Module({
  controllers: [BettingHousesController],
  providers: [BettingHousesService],
})
export class BettingHousesModule {}