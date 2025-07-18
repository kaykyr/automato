import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  Position,
  OnConnectStartParams,
  ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CustomNode } from './CustomNode';
import { FlowHeader } from './FlowHeader';
import { NodeSelectorModal } from './NodeSelectorModal';
import { ApiConfig } from '../../types/flow.types';
import { flowService } from '../../services/flowService';
import { BrowserSettingsModal } from './BrowserSettingsModal';
import { ApiSettingsModal } from './ApiSettingsModal';
import { BrowserSettings } from '../../types/flow.types';
import { ToastContainer } from '../common/Toast';
import { Dialog } from '../common/Dialog';
import { useToast } from '../../hooks/useToast';
import { useDialog } from '../../hooks/useDialog';
import { useWebSocket, NodeExecutionData, NodeErrorData, ExecutionStatusData, VariableUpdateData, LogMessageData } from '../../hooks/useWebSocket';
import { useAnimationPerformance } from '../../hooks/useAnimationPerformance';
import { RealtimeLogs } from './RealtimeLogs';
import { X, Eye, Trash2 } from 'lucide-react';
import './FlowBuilder.css';

const nodeTypes = {
  custom: CustomNode,
};

// Generate unique IDs using timestamp + random number
const getId = () => `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

interface FlowBuilderProps {
  flowId?: string;
}

export const FlowBuilder: React.FC<FlowBuilderProps> = ({ flowId }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [flowVariables, setFlowVariables] = useState<Record<string, any>>({});
  const [nodeExecutionStates, setNodeExecutionStates] = useState<Record<string, 'idle' | 'executing' | 'completed' | 'error' | 'pending'>>({});
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [, setCurrentExecutionId] = useState<string | null>(null);
  const [showNodeSelector, setShowNodeSelector] = useState(false);
  const [nodeSelectorPosition, setNodeSelectorPosition] = useState<{ x: number; y: number } | undefined>();
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null);
  
  // Initialize with Start and Response nodes
  const createInitialNodes = (): any[] => [
    {
      id: 'start-node',
      type: 'custom',
      position: { x: 250, y: 50 },
      data: {
        label: 'Start',
        action: 'start' as const,
        config: {},
        variables: {},
        onConfigChange: (config: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === 'start-node'
                ? { ...node, data: { ...node.data, config } }
                : node
            )
          );
        },
      },
      deletable: false, // Prevent deletion
      draggable: true,
      sourcePosition: Position.Bottom, // Only output
      style: {
        background: '#16A34A',
        color: 'white',
        border: '2px solid #15803D',
        borderRadius: '8px',
        fontWeight: 'bold',
      },
    },
    {
      id: 'response-node',
      type: 'custom',
      position: { x: 250, y: 400 },
      data: {
        label: 'Response',
        action: 'response' as const,
        config: {},
        variables: {},
        onConfigChange: (config: any) => {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === 'response-node'
                ? { ...node, data: { ...node.data, config } }
                : node
            )
          );
        },
      },
      deletable: false, // Prevent deletion
      draggable: true,
      targetPosition: Position.Top, // Only input
      style: {
        background: '#DC2626',
        color: 'white',
        border: '2px solid #B91C1C',
        borderRadius: '8px',
        fontWeight: 'bold',
      },
    }
  ];
  
  const [nodes, setNodes, onNodesChange] = useNodesState(createInitialNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [flowName, setFlowName] = useState(t('flow.untitledFlow'));
  const [flowDescription, setFlowDescription] = useState('');
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [savedFlows, setSavedFlows] = useState<any[]>([]);
  const [showFlowsList, setShowFlowsList] = useState(false);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showBrowserSettings, setShowBrowserSettings] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [browserSettings, setBrowserSettings] = useState<BrowserSettings>({
    stealth: true,
    keepOpen: false,
    headless: true,
    viewport: { width: 1280, height: 720 }
  });
  const [apiConfig, setApiConfig] = useState<ApiConfig>();
  
  const { toasts, toast, removeToast } = useToast();
  const { dialogState, hideDialog, confirm } = useDialog();
  
  // Auto-load flow when flowId is provided via URL
  useEffect(() => {
    if (flowId && flowId !== currentFlowId) {
      const loadFlowById = async () => {
        try {
          const flow = await flowService.getFlow(flowId);
          if (flow) {
            // Use the existing handleLoadSavedFlow logic
            requestAnimationFrame(() => {
              setFlowName(flow.name);
              setFlowDescription(flow.description || '');
              setCurrentFlowId(flowId);
              
              // Reconstruct nodes with proper callbacks
              const reconstructedNodes = (flow.nodes || []).map((node: any) => {
                const baseNode = {
                  ...node,
                  data: {
                    ...node.data,
                    variables: flowVariables,
                    onConfigChange: (config: any) => {
                      requestAnimationFrame(() => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === node.id
                              ? { ...n, data: { ...n.data, config } }
                              : n
                          )
                        );
                      });
                    },
                  },
                };

                // Apply special styling for start and response nodes
                if (node.id === 'start-node' || node.data.action === 'start') {
                  return {
                    ...baseNode,
                    id: 'start-node',
                    deletable: false,
                    sourcePosition: Position.Bottom,
                    style: {
                      background: '#16A34A',
                      color: 'white',
                      border: '2px solid #15803D',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                    },
                  };
                }

                if (node.id === 'response-node' || node.data.action === 'response') {
                  return {
                    ...baseNode,
                    id: 'response-node',
                    deletable: false,
                    targetPosition: Position.Top,
                    style: {
                      background: '#DC2626',
                      color: 'white',
                      border: '2px solid #B91C1C',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                    },
                  };
                }

                return baseNode;
              });

              setNodes(reconstructedNodes);
              setEdges(flow.edges || []);
              
              // Update flow variables if they exist
              if (flow.variables) {
                setFlowVariables(flow.variables);
              }
            });
          }
        } catch (error) {
          console.error('Error loading flow:', error);
          toast.error(t('toast.loadError'), t('toast.loadErrorDesc'));
          // Navigate back to base flow route if loading fails
          navigate('/flow');
        }
      };

      loadFlowById();
    }
  }, [flowId, currentFlowId, flowVariables, setNodes, setEdges, toast, t, navigate]);
  
  // Performance monitoring
  const performanceMetrics = useAnimationPerformance(true);

  // WebSocket integration
  const { isConnected, joinFlowExecution, leaveFlowExecution } = useWebSocket({
    onNodeExecution: (data: NodeExecutionData) => {
      setNodeExecutionStates(prev => ({
        ...prev,
        [data.nodeData.nodeId]: data.nodeData.status
      }));
      
      // Add log entry
      setExecutionLogs((prev: any[]) => [...prev, {
        id: `${data.nodeData.nodeId}-${Date.now()}`,
        timestamp: data.timestamp,
        nodeId: data.nodeData.nodeId,
        nodeName: data.nodeData.nodeName,
        action: data.nodeData.action,
        level: 'info' as const,
        message: `Started executing ${data.nodeData.action}`,
        data: data.nodeData.config
      }]);
    },
    
    onNodeCompletion: (data: NodeExecutionData) => {
      setNodeExecutionStates(prev => ({
        ...prev,
        [data.nodeData.nodeId]: 'completed'
      }));
      
      // Add completion log
      setExecutionLogs((prev: any[]) => [...prev, {
        id: `${data.nodeData.nodeId}-complete-${Date.now()}`,
        timestamp: data.timestamp,
        nodeId: data.nodeData.nodeId,
        nodeName: data.nodeData.nodeName,
        action: data.nodeData.action,
        level: 'success' as const,
        message: `Completed ${data.nodeData.action}`,
        data: data.nodeData.result
      }]);
    },
    
    onNodeError: (data: NodeErrorData) => {
      setNodeExecutionStates(prev => ({
        ...prev,
        [data.nodeData.nodeId]: 'error'
      }));
      
      // Add error log
      setExecutionLogs((prev: any[]) => [...prev, {
        id: `${data.nodeData.nodeId}-error-${Date.now()}`,
        timestamp: data.timestamp,
        nodeId: data.nodeData.nodeId,
        nodeName: data.nodeData.nodeName,
        action: data.nodeData.action,
        level: 'error' as const,
        message: `Error in ${data.nodeData.action}: ${data.error}`,
        data: data.error
      }]);
    },
    
    onExecutionStatus: (data: ExecutionStatusData) => {
      if (!data?.status) return;
      
      setExecutionResult((prev: any) => prev ? { ...prev, status: data.status.status } : null);
      
      // Add status log
      setExecutionLogs((prev: any[]) => [...prev, {
        id: `status-${Date.now()}`,
        timestamp: data.timestamp,
        nodeId: 'system',
        nodeName: 'System',
        action: 'status',
        level: data.status.status === 'failed' ? 'error' as const : 'info' as const,
        message: `Execution ${data.status.status}`,
        data: data.status
      }]);
    },
    
    onVariableUpdate: (data: VariableUpdateData) => {
      setFlowVariables(data.variables);
    },
    
    onLogMessage: (data: LogMessageData) => {
      setExecutionLogs((prev: any[]) => [...prev, {
        id: `${data.log.nodeId}-log-${Date.now()}`,
        timestamp: data.timestamp,
        nodeId: data.log.nodeId,
        nodeName: data.log.nodeName,
        action: data.log.action,
        level: 'info' as const,
        message: `${data.log.action} executed`,
        data: data.log.result
      }]);
    },
    
    onExecutionComplete: (data: ExecutionStatusData) => {
      if (!data?.status) return;
      
      setIsExecuting(false);
      setExecutionResult((prev: any) => prev ? {
        ...prev,
        status: 'completed',
        results: data.status?.results || {},
        completedAt: data.status?.completedAt,
        executionLog: data.status?.executionLog || []
      } : null);
      
      // Reset node states
      setTimeout(() => {
        setNodeExecutionStates({});
      }, 3000);
    },
    
    onExecutionError: (data: ExecutionStatusData) => {
      if (!data?.status) return;
      
      setIsExecuting(false);
      setExecutionResult((prev: any) => prev ? {
        ...prev,
        status: 'failed',
        error: data.status?.error,
        completedAt: data.status?.completedAt,
        executionLog: data.status?.executionLog || []
      } : null);
      
      // Reset node states
      setTimeout(() => {
        setNodeExecutionStates({});
      }, 5000);
    }
  });

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      console.log('Connection params:', params);
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNewNode(type, position);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reactFlowInstance]
  );

  // Add new node function - optimized with batching
  const addNewNode = useCallback((nodeType: string, position?: { x: number; y: number }) => {
    if (!reactFlowInstance) return;

    const nodeId = getId();
    const defaultPosition = position || { 
      x: window.innerWidth / 2 - 100, 
      y: window.innerHeight / 2 - 50 
    };

    // Batch node and edge creation in requestAnimationFrame
    requestAnimationFrame(() => {
      const newNode: Node = {
        id: nodeId,
        type: 'custom',
        position: defaultPosition,
        data: {
          label: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
          action: nodeType,
          config: {},
          variables: flowVariables,
          onConfigChange: (config: any) => {
            requestAnimationFrame(() => {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === nodeId
                    ? { ...node, data: { ...node.data, config } }
                    : node
                )
              );
            });
          },
        },
      };

      setNodes((nds) => {
        const existingIds = new Set(nds.map(n => n.id));
        if (existingIds.has(newNode.id)) {
          console.warn('Duplicate node ID detected, generating new ID:', newNode.id);
          newNode.id = getId();
        }
        
        return nds.concat(newNode);
      });

      // If we were connecting from another node, create the edge
      if (connectingNodeId) {
        const newEdge: Edge = {
          id: `${connectingNodeId}-${nodeId}`,
          source: connectingNodeId,
          target: nodeId,
          type: 'default',
        };
        setEdges((eds) => addEdge(newEdge, eds));
        setConnectingNodeId(null);
      }
    });
  }, [reactFlowInstance, flowVariables, setNodes, setEdges, connectingNodeId]);

  // Handle connection start (when dragging from a handle)
  const onConnectStart = useCallback((_: any, params: OnConnectStartParams) => {
    setConnectingNodeId(params.nodeId || null);
  }, []);

  // Handle connection end (when dropping the connection)
  const onConnectEnd = useCallback((event: any) => {
    if (!connectingNodeId) return;

    const targetIsPane = event.target.classList.contains('react-flow__pane');
    
    if (targetIsPane && reactFlowWrapper.current) {
      // Show node selector at drop position
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };
      
      setNodeSelectorPosition(position);
      setShowNodeSelector(true);
    } else {
      setConnectingNodeId(null);
    }
  }, [connectingNodeId]);


  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    // Node click handler - functionality moved to inline configuration
    // const flowNode = node as FlowNode;
    // Previously used to open modal, now config is handled inline in nodes
    console.log('Node clicked:', node.id, node.data.action);
  }, []);

  useEffect(() => {
    loadSavedFlows();
  }, []);

  // Debug: Monitor nodes changes (remove after testing)
  // useEffect(() => {
  //   console.log('Nodes state changed:', nodes.length, 'nodes:', nodes.map(n => ({ id: n.id, action: n.data?.action })));
  // }, [nodes]);

  const loadSavedFlows = async () => {
    try {
      const flows = await flowService.getAllFlows();
      setSavedFlows(flows);
    } catch (error) {
      console.error('Error loading flows:', error);
    }
  };

  // Legacy function - kept for backward compatibility but not used with inline config
  // const handleNodeConfigSave = (nodeId: string, config: NodeConfig) => {
  //   setNodes((nds) =>
  //     nds.map((node) =>
  //       node.id === nodeId
  //         ? {
  //             ...node,
  //             data: {
  //               ...node.data,
  //               config,
  //             },
  //           }
  //         : node
  //     )
  //   );
  // };

  // Memoize heavy operations
  const nodeDataUpdate = useMemo(() => ({
    variables: flowVariables,
    executionStates: nodeExecutionStates,
  }), [flowVariables, nodeExecutionStates]);

  // Optimized node updates with requestAnimationFrame batching
  const updateNodesThrottled = useCallback(() => {
    let rafId: number | null = null;
    
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      
      rafId = requestAnimationFrame(() => {
        setNodes((nds) => {
          // Early return if no changes
          const hasChanges = nds.some(node => 
            node.data.variables !== nodeDataUpdate.variables ||
            (node.data.executionStatus || 'idle') !== (nodeDataUpdate.executionStates[node.id] || 'idle')
          );
          
          if (!hasChanges) return nds;
          
          return nds.map((node) => ({
            ...node,
            data: {
              ...node.data,
              variables: nodeDataUpdate.variables,
              executionStatus: nodeDataUpdate.executionStates[node.id] || 'idle',
            },
          }));
        });
        rafId = null;
      });
    };
  }, [nodeDataUpdate, setNodes])();

  // Update all nodes when flow variables or execution states change
  useEffect(() => {
    updateNodesThrottled();
  }, [updateNodesThrottled]);

  // Performance warning
  useEffect(() => {
    if (performanceMetrics.isLagging && performanceMetrics.lagCount > 10) {
      console.warn(`Animation performance warning: ${performanceMetrics.lagCount} lag frames detected. Current FPS: ${performanceMetrics.fps}`);
    }
  }, [performanceMetrics.isLagging, performanceMetrics.lagCount, performanceMetrics.fps]);

  // Handle double-click directly on DOM to override ReactFlow's default behavior
  useEffect(() => {
    const reactFlowElement = reactFlowWrapper.current;
    if (!reactFlowElement) return;

    const handleDoubleClick = (event: MouseEvent) => {
      // Check if the click is on the background (not on a node or edge)
      const target = event.target as HTMLElement;
      const isBackground = target.classList.contains('react-flow__pane') || 
                          target.classList.contains('react-flow__renderer') ||
                          target.closest('.react-flow__background');
      
      if (isBackground) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const reactFlowBounds = reactFlowElement.getBoundingClientRect();
        const position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };

        setNodeSelectorPosition(position);
        setShowNodeSelector(true);
      }
    };

    // Add event listener with capture phase to intercept before ReactFlow
    reactFlowElement.addEventListener('dblclick', handleDoubleClick, true);

    return () => {
      reactFlowElement.removeEventListener('dblclick', handleDoubleClick, true);
    };
  }, []);

  // Monitor node execution and update variables - for future runtime variable updates
  // const updateFlowVariables = useCallback((newVariables: Record<string, any>) => {
  //   setFlowVariables(prev => ({ ...prev, ...newVariables }));
  // }, []);

  const handleRunFlow = async () => {
    // Auto-save flow before execution
    try {
      const flowData = {
        name: flowName,
        description: flowDescription,
        nodes,
        edges,
        variables: {},
        browserSettings,
        apiConfig,
      };

      if (currentFlowId) {
        // Update existing flow
        await flowService.updateFlow(currentFlowId, flowData);
        toast.success(t('toast.flowAutoSaved'), t('toast.flowAutoSavedDesc'));
      } else {
        // Create new flow
        const newFlow = await flowService.createFlow(flowData);
        setCurrentFlowId(newFlow.id);
        toast.success(t('toast.flowAutoSaved'), t('toast.flowAutoSavedDesc'));
      }
      
      loadSavedFlows();
    } catch (error: any) {
      console.error('Error auto-saving flow:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(t('toast.autoSaveError'), errorMessage);
      return; // Don't execute if auto-save fails
    }

    // Ensure we have a flow ID after auto-save
    if (!currentFlowId) {
      toast.warning(t('toast.saveFlowFirst'), t('toast.saveFlowFirstDesc'));
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);
    setExecutionLogs([]);
    setNodeExecutionStates({});
    setShowLogs(true);

    try {
      const execution = await flowService.executeFlow(currentFlowId);
      setExecutionResult(execution);
      setCurrentExecutionId(execution.id);
      
      // Join WebSocket room for real-time updates
      if (isConnected) {
        joinFlowExecution(execution.id, currentFlowId);
      }
      
      // Backup polling for execution status (in case WebSocket fails)
      const pollExecution = async () => {
        try {
          const status = await flowService.getExecution(execution.id);
          if (status) {
            setExecutionResult(status);
            
            if (status.status === 'running' || status.status === 'pending') {
              setTimeout(pollExecution, 5000); // Poll every 5 seconds as backup
            } else {
              setIsExecuting(false);
              // Leave WebSocket room
              if (isConnected) {
                leaveFlowExecution(execution.id, currentFlowId);
              }
            }
          }
        } catch (error) {
          console.error('Error polling execution status:', error);
          setIsExecuting(false);
        }
      };
      
      // Start backup polling after 10 seconds
      setTimeout(pollExecution, 10000);
    } catch (error) {
      console.error('Error executing flow:', error);
      toast.error(t('toast.executionError'), t('toast.executionErrorDesc'));
      setIsExecuting(false);
    }
  };

  const handleSaveFlow = async () => {
    try {
      const flowData = {
        name: flowName,
        description: flowDescription,
        nodes,
        edges,
        variables: {},
        browserSettings,
        apiConfig,
      };

      if (currentFlowId) {
        // Update existing flow
        await flowService.updateFlow(currentFlowId, flowData);
        toast.success(t('toast.flowUpdated'), t('toast.flowUpdatedDesc'));
      } else {
        // Create new flow
        const newFlow = await flowService.createFlow(flowData);
        setCurrentFlowId(newFlow.id);
        toast.success(t('toast.flowSaved'), t('toast.flowSavedDesc'));
      }
      
      loadSavedFlows();
    } catch (error: any) {
      console.error('Error saving flow:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      toast.error(t('toast.saveError'), errorMessage);
    }
  };


  const handleExportFlow = () => {
    const flow = {
      name: flowName,
      description: flowDescription,
      nodes,
      edges,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(flow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flowName.replace(/\s+/g, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadFlow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const flow = JSON.parse(e.target?.result as string);
        setFlowName(flow.name || 'Imported Flow');
        
        // Reconstruct nodes with proper callbacks
        const reconstructedNodes = (flow.nodes || []).map((node: any) => {
          const baseNode = {
            ...node,
            data: {
              ...node.data,
              variables: flowVariables,
              onConfigChange: (config: any) => {
                setNodes((nds) =>
                  nds.map((n) =>
                    n.id === node.id
                      ? { ...n, data: { ...n.data, config } }
                      : n
                  )
                );
              },
            },
          };

          // Apply special styling and restrictions to fundamental nodes
          if (node.id === 'start-node' || node.data.action === 'start') {
            return {
              ...baseNode,
              id: 'start-node',
              deletable: false,
              sourcePosition: Position.Bottom,
              style: {
                background: '#16A34A',
                color: 'white',
                border: '2px solid #15803D',
                borderRadius: '8px',
                fontWeight: 'bold',
              },
            };
          }

          if (node.id === 'response-node' || node.data.action === 'response') {
            return {
              ...baseNode,
              id: 'response-node',
              deletable: false,
              targetPosition: Position.Top,
              style: {
                background: '#DC2626',
                color: 'white',
                border: '2px solid #B91C1C',
                borderRadius: '8px',
                fontWeight: 'bold',
              },
            };
          }

          return baseNode;
        });

        // Ensure Start and Response nodes exist
        const hasStartNode = reconstructedNodes.some((n: any) => n.id === 'start-node');
        const hasResponseNode = reconstructedNodes.some((n: any) => n.id === 'response-node');

        if (!hasStartNode) {
          reconstructedNodes.unshift(createInitialNodes()[0]);
        }

        if (!hasResponseNode) {
          reconstructedNodes.push(createInitialNodes()[1]);
        }
        
        setNodes(reconstructedNodes);
        setEdges(flow.edges || []);
      } catch (error) {
        toast.error(t('toast.loadError'), t('toast.loadErrorDesc'));
      }
    };
    reader.readAsText(file);
  };

  const handleClearFlow = () => {
    confirm(t('dialogs.confirmClear.title'), t('dialogs.confirmClear.message'), () => {
      setNodes(createInitialNodes());
      setEdges([]);
      setFlowName(t('flow.untitledFlow'));
      setFlowDescription('');
      setCurrentFlowId(null);
      setExecutionResult(null);
      toast.info(t('toast.flowCleared'), t('toast.flowClearedDesc'));
    });
  };

  const handleNewFlow = () => {
    confirm(t('dialogs.confirmNewFlow.title'), t('dialogs.confirmNewFlow.message'), () => {
      setNodes(createInitialNodes());
      setEdges([]);
      setFlowName(t('flow.untitledFlow'));
      setFlowDescription('');
      setCurrentFlowId(null);
      setExecutionResult(null);
      toast.info(t('toast.newFlowCreated'), t('toast.newFlowCreatedDesc'));
      // Navigate to base flow route when creating new flow
      navigate('/flow');
    });
  };

  const handleLoadSavedFlow = async (flow: any) => {
    try {
      // Update URL to reflect the loaded flow
      navigate(`/flow/${flow.id}`);
      
      // Use requestAnimationFrame for smooth loading
      requestAnimationFrame(() => {
        setFlowName(flow.name);
        setFlowDescription(flow.description || '');
        setCurrentFlowId(flow.id.toString());
        
        // Reconstruct nodes with proper callbacks
        const reconstructedNodes = (flow.nodes || []).map((node: any) => {
          const baseNode = {
            ...node,
            data: {
              ...node.data,
              variables: flowVariables,
              onConfigChange: (config: any) => {
                requestAnimationFrame(() => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === node.id
                        ? { ...n, data: { ...n.data, config } }
                        : n
                    )
                  );
                });
              },
            },
          };

          // Apply special styling for start and response nodes
          if (node.id === 'start-node' || node.data.action === 'start') {
            return {
              ...baseNode,
              id: 'start-node',
              deletable: false,
              sourcePosition: Position.Bottom,
              style: {
                background: '#16A34A',
                color: 'white',
                border: '2px solid #15803D',
                borderRadius: '8px',
                fontWeight: 'bold',
              },
            };
          }

          if (node.id === 'response-node' || node.data.action === 'response') {
            return {
              ...baseNode,
              id: 'response-node',
              deletable: false,
              targetPosition: Position.Top,
              style: {
                background: '#DC2626',
                color: 'white',
                border: '2px solid #B91C1C',
                borderRadius: '8px',
                fontWeight: 'bold',
              },
            };
          }

          return baseNode;
        });

        setNodes(reconstructedNodes);
        setEdges(flow.edges || []);
        
        // Update flow variables if they exist
        if (flow.variables) {
          setFlowVariables(flow.variables);
        }
        
        // Close the flows list modal
        setShowFlowsList(false);
        
        toast.success(t('toast.flowLoaded'), flow.name);
      });
    } catch (error) {
      console.error('Error loading flow:', error);
      toast.error(t('toast.loadError'), t('toast.loadErrorDesc'));
    }
  };


  return (
    <div className="flow-builder-container">
      <FlowHeader
        flowName={flowName}
        flowDescription={flowDescription}
        onFlowNameChange={setFlowName}
        onFlowDescriptionChange={setFlowDescription}
        currentFlowId={currentFlowId}
        isExecuting={isExecuting}
        isConnected={isConnected}
        showLogs={showLogs}
        executionLogs={executionLogs}
        onRunFlow={handleRunFlow}
        onSaveFlow={handleSaveFlow}
        onNewFlow={handleNewFlow}
        onBrowseFlows={() => setShowFlowsList(true)}
        onExportFlow={handleExportFlow}
        onImportFlow={handleLoadFlow}
        onClearFlow={handleClearFlow}
        onToggleLogs={() => setShowLogs(!showLogs)}
        onShowBrowserSettings={() => setShowBrowserSettings(true)}
        onShowApiSettings={() => setShowApiSettings(true)}
      />

      <div className="flow-content">
        <div className="flow-canvas" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            selectNodesOnDrag={false}
            panOnDrag={true}
            snapToGrid={false}
            elevateNodesOnSelect={false}
            nodesDraggable={true}
            nodesConnectable={true}
            elementsSelectable={true}
            connectionMode={ConnectionMode.Loose}
            deleteKeyCode={['Delete', 'Backspace']}
            multiSelectionKeyCode={['Meta', 'Ctrl']}
          >
            <Background color="#334155" gap={16} />
            <Controls />
          </ReactFlow>
        </div>
      </div>

      {/* Node Selector Modal */}
      <NodeSelectorModal
        isOpen={showNodeSelector}
        onClose={() => {
          setShowNodeSelector(false);
          setConnectingNodeId(null);
          setNodeSelectorPosition(undefined);
        }}
        onNodeSelect={(nodeType) => {
          const position = nodeSelectorPosition ? 
            reactFlowInstance?.project(nodeSelectorPosition) : 
            undefined;
          addNewNode(nodeType, position);
          setShowNodeSelector(false);
          setNodeSelectorPosition(undefined);
        }}
        position={nodeSelectorPosition}
      />

      {/* NodeConfigModal removed - using inline config now */}

      {/* Saved Flows List Modal */}
      {showFlowsList && (
        <div className="modal-overlay" onClick={() => setShowFlowsList(false)}>
          <div className="modal-content flows-list-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{t('savedFlows.title')}</h3>
              <button className="modal-close" onClick={() => setShowFlowsList(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="flows-list">
                {savedFlows.length === 0 ? (
                  <p>{t('savedFlows.noFlows')}</p>
                ) : (
                  savedFlows.map((flow) => (
                    <div key={flow.id} className="flow-item">
                      <div className="flow-item-info">
                        <h4>{flow.name}</h4>
                        <p>{flow.description || t('savedFlows.noDescription')}</p>
                        <span className="flow-date">
                          {t('savedFlows.created')}: {new Date(flow.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flow-item-actions">
                        <button
                          className="btn-small primary"
                          onClick={() => handleLoadSavedFlow(flow)}
                        >
                          <Eye size={14} />
                          {t('savedFlows.load')}
                        </button>
                        <button
                          className="btn-small danger"
                          onClick={() => {
                            confirm(t('dialogs.confirmDelete.title'), t('dialogs.confirmDelete.message', { name: flow.name }), async () => {
                              try {
                                await flowService.deleteFlow(flow.id);
                                loadSavedFlows();
                                toast.success(t('toast.flowDeleted'), t('toast.flowDeletedDesc'));
                              } catch (error) {
                                toast.error(t('toast.deleteError'), t('toast.deleteErrorDesc'));
                              }
                            });
                          }}
                        >
                          <Trash2 size={14} />
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Browser Settings Modal */}
      <BrowserSettingsModal
        isOpen={showBrowserSettings}
        onClose={() => setShowBrowserSettings(false)}
        settings={browserSettings}
        onSave={(settings) => setBrowserSettings(settings)}
      />

      {/* API Settings Modal */}
      <ApiSettingsModal
        isOpen={showApiSettings}
        onClose={() => setShowApiSettings(false)}
        settings={apiConfig}
        onSave={(settings) => setApiConfig(settings)}
      />

      
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
      
      {/* Dialog modal */}
      <Dialog
        isOpen={dialogState.isOpen}
        onClose={hideDialog}
        onConfirm={dialogState.onConfirm}
        title={dialogState.title}
        message={dialogState.message}
        type={dialogState.type}
        confirmText={dialogState.confirmText}
        cancelText={dialogState.cancelText}
        showCancel={dialogState.showCancel}
      />
      
      {/* Realtime Logs */}
      <RealtimeLogs
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
        logs={executionLogs}
        executionStatus={isExecuting ? 'running' : executionResult?.status === 'completed' ? 'completed' : executionResult?.status === 'failed' ? 'failed' : 'idle'}
        currentNode={executionResult?.currentNode}
        variables={flowVariables}
        error={executionResult?.error}
        finalResults={executionResult?.results}
      />
      
      {/* Performance Metrics (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-metrics" style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 1000,
          display: performanceMetrics.isLagging ? 'block' : 'none'
        }}>
          <div>FPS: {performanceMetrics.fps} (avg: {performanceMetrics.averageFps})</div>
          <div>Frame: {performanceMetrics.frameTime}ms</div>
          <div style={{ color: performanceMetrics.isLagging ? '#ff6b6b' : '#51cf66' }}>
            {performanceMetrics.isLagging ? `⚠️ LAG (${performanceMetrics.lagCount})` : '✓ Smooth'}
          </div>
        </div>
      )}
    </div>
  );
};

interface FlowBuilderWrapperProps {
  flowId?: string;
}

export const FlowBuilderWrapper: React.FC<FlowBuilderWrapperProps> = ({ flowId }) => (
  <ReactFlowProvider>
    <FlowBuilder flowId={flowId} />
  </ReactFlowProvider>
);