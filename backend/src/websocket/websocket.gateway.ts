import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 30000,
  allowEIO3: true,
})
export class FlowWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');

  handleConnection(client: Socket) {
    // Reduce logging verbosity - only log in development
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`Client connected: ${client.id}`);
    }
    client.emit('connected', { clientId: client.id });
  }

  handleDisconnect(client: Socket) {
    // Reduce logging verbosity - only log in development
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('join-flow-execution')
  handleJoinFlowExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string; flowId: string },
  ) {
    const room = `flow-${data.flowId}-execution-${data.executionId}`;
    client.join(room);
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`Client ${client.id} joined room: ${room}`);
    }
    
    client.emit('joined-execution', {
      executionId: data.executionId,
      flowId: data.flowId,
      room,
    });
  }

  @SubscribeMessage('leave-flow-execution')
  handleLeaveFlowExecution(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { executionId: string; flowId: string },
  ) {
    const room = `flow-${data.flowId}-execution-${data.executionId}`;
    client.leave(room);
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`Client ${client.id} left room: ${room}`);
    }
  }

  // Emit execution status updates
  emitExecutionStatus(executionId: string, flowId: string, status: any) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('execution-status', {
      executionId,
      flowId,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit node execution updates
  emitNodeExecution(executionId: string, flowId: string, nodeData: any) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('node-execution', {
      executionId,
      flowId,
      nodeData,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit node completion
  emitNodeCompletion(executionId: string, flowId: string, nodeData: any) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('node-completion', {
      executionId,
      flowId,
      nodeData,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit node error
  emitNodeError(executionId: string, flowId: string, nodeData: any, error: any) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('node-error', {
      executionId,
      flowId,
      nodeData,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit log message
  emitLogMessage(executionId: string, flowId: string, log: any) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('log-message', {
      executionId,
      flowId,
      log,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit execution completion
  emitExecutionComplete(executionId: string, flowId: string, result: any) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('execution-complete', {
      executionId,
      flowId,
      result,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit execution error
  emitExecutionError(executionId: string, flowId: string, error: any) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('execution-error', {
      executionId,
      flowId,
      error,
      timestamp: new Date().toISOString(),
    });
  }

  // Emit variable update
  emitVariableUpdate(executionId: string, flowId: string, variables: Record<string, any>) {
    const room = `flow-${flowId}-execution-${executionId}`;
    this.server.to(room).emit('variable-update', {
      executionId,
      flowId,
      variables,
      timestamp: new Date().toISOString(),
    });
  }
}