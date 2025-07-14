import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketEventData {
  executionId: string;
  flowId: string;
  timestamp: string;
}

interface NodeExecutionData extends WebSocketEventData {
  nodeData: {
    nodeId: string;
    nodeName: string;
    action: string;
    status: 'executing' | 'completed' | 'error';
    result?: any;
    config?: any;
  };
}

interface NodeErrorData extends WebSocketEventData {
  nodeData: {
    nodeId: string;
    nodeName: string;
    action: string;
    status: 'error';
    config?: any;
  };
  error: any;
}

interface ExecutionStatusData extends WebSocketEventData {
  status: {
    status: 'running' | 'completed' | 'failed';
    startedAt?: string;
    completedAt?: string;
    results?: any;
    error?: any;
    executionLog?: any[];
  };
}

interface VariableUpdateData extends WebSocketEventData {
  variables: Record<string, any>;
}

interface LogMessageData extends WebSocketEventData {
  log: {
    nodeId: string;
    nodeName: string;
    action: string;
    result: any;
    timestamp: Date;
  };
}

interface UseWebSocketProps {
  onNodeExecution?: (data: NodeExecutionData) => void;
  onNodeCompletion?: (data: NodeExecutionData) => void;
  onNodeError?: (data: NodeErrorData) => void;
  onExecutionStatus?: (data: ExecutionStatusData) => void;
  onVariableUpdate?: (data: VariableUpdateData) => void;
  onLogMessage?: (data: LogMessageData) => void;
  onExecutionComplete?: (data: ExecutionStatusData) => void;
  onExecutionError?: (data: ExecutionStatusData) => void;
}

export const useWebSocket = (props: UseWebSocketProps) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  // Store handlers in refs to avoid recreating socket connection
  const handlersRef = useRef(props);
  handlersRef.current = props;

  useEffect(() => {
    // Only create socket once
    if (socketRef.current) {
      return;
    }

    // Connect to WebSocket
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('WebSocket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      console.error('WebSocket connection error:', error);
    });

    // Flow execution event handlers
    socket.on('node-execution', (data: NodeExecutionData) => {
      console.log('Node execution:', data);
      handlersRef.current.onNodeExecution?.(data);
    });

    socket.on('node-completion', (data: NodeExecutionData) => {
      console.log('Node completion:', data);
      handlersRef.current.onNodeCompletion?.(data);
    });

    socket.on('node-error', (data: NodeErrorData) => {
      console.error('Node error:', data);
      handlersRef.current.onNodeError?.(data);
    });

    socket.on('execution-status', (data: ExecutionStatusData) => {
      console.log('Execution status:', data);
      handlersRef.current.onExecutionStatus?.(data);
    });

    socket.on('variable-update', (data: VariableUpdateData) => {
      console.log('Variable update:', data);
      handlersRef.current.onVariableUpdate?.(data);
    });

    socket.on('log-message', (data: LogMessageData) => {
      console.log('Log message:', data);
      handlersRef.current.onLogMessage?.(data);
    });

    socket.on('execution-complete', (data: ExecutionStatusData) => {
      console.log('Execution complete:', data);
      handlersRef.current.onExecutionComplete?.(data);
    });

    socket.on('execution-error', (data: ExecutionStatusData) => {
      console.error('Execution error:', data);
      handlersRef.current.onExecutionError?.(data);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  const joinFlowExecution = useCallback((executionId: string, flowId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('join-flow-execution', { executionId, flowId });
    }
  }, []);

  const leaveFlowExecution = useCallback((executionId: string, flowId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-flow-execution', { executionId, flowId });
    }
  }, []);

  return {
    isConnected,
    connectionError,
    joinFlowExecution,
    leaveFlowExecution,
  };
};

export type {
  NodeExecutionData,
  NodeErrorData,
  ExecutionStatusData,
  VariableUpdateData,
  LogMessageData,
};