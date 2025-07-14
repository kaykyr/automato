import { Module } from '@nestjs/common';
import { PlaywrightService } from './playwright.service';
import { PlaywrightStealthService } from './playwright-stealth.service';

@Module({
  providers: [PlaywrightService, PlaywrightStealthService],
  exports: [PlaywrightService, PlaywrightStealthService],
})
export class PlaywrightModule {}