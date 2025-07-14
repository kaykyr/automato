import { Module } from '@nestjs/common';
import { FlowWebSocketGateway } from './websocket.gateway';

@Module({
  providers: [FlowWebSocketGateway],
  exports: [FlowWebSocketGateway],
})
export class WebSocketModule {}