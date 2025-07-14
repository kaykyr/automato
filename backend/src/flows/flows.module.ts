import { Module } from '@nestjs/common';
import { FlowsController } from './flows.controller';
import { FlowsService } from './flows.service';
import { FlowExecutorService } from './flow-executor.service';
import { DynamicRouteService } from './dynamic-route.service';
import { PlaywrightModule } from '../providers/playwright/playwright.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Flow } from './entities/flow.entity';
import { FlowExecution } from './entities/flow-execution.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flow, FlowExecution]),
    PlaywrightModule,
    WebSocketModule,
  ],
  controllers: [FlowsController],
  providers: [FlowsService, FlowExecutorService, DynamicRouteService],
  exports: [FlowsService, FlowExecutorService, DynamicRouteService],
})
export class FlowsModule {}