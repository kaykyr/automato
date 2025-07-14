import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DynamicRouteService } from './flows/dynamic-route.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // CORS configuration
  app.enableCors({
    origin: true, // Allow all origins in development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = configService.get('PORT') || 3001;
  
  await app.listen(port);
  console.log(`🚀 Betting API running on http://localhost:${port}/api/v1`);
  console.log(`🎯 Browser visível para debug: NODE_ENV=${configService.get('NODE_ENV')}`);
  
  // Initialize dynamic routes after app starts
  try {
    const dynamicRouteService = app.get(DynamicRouteService);
    const httpAdapter = app.getHttpAdapter();
    const expressApp = httpAdapter.getInstance();
    await dynamicRouteService.registerFlowRoutes(expressApp);
    console.log(`🔧 Dynamic flow routes initialized`);
  } catch (error) {
    console.error('Error initializing dynamic routes:', error);
  }
}

bootstrap();