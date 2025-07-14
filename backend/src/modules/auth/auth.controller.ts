import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('generate-key')
  async generateApiKey(@Body() data: { userId: string }) {
    return this.authService.generateApiKey(data.userId);
  }

  @Post('validate-key')
  async validateApiKey(@Body() data: { apiKey: string }) {
    return this.authService.validateApiKey(data.apiKey);
  }

  @Post('revoke-key')
  async revokeApiKey(@Body() data: { apiKey: string }) {
    return this.authService.revokeApiKey(data.apiKey);
  }
}