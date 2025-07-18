import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Terminal, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Play, 
  Square, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import './RealtimeLogs.css';

interface LogEntry {
  id: string;
  timestamp: string;
  nodeId: string;
  nodeName: string;
  action: string;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  data?: any;
}

interface RealtimeLogsProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogEntry[];
  executionStatus: 'idle' | 'running' | 'completed' | 'failed';
  currentNode?: string;
  variables?: Record<string, any>;
  error?: string;
  finalResults?: Record<string, any>;
}

export const RealtimeLogs: React.FC<RealtimeLogsProps> = ({
  isOpen,
  onClose,
  logs,
  executionStatus,
  currentNode,
  variables = {},
  error,
  finalResults
}) => {
  const { t } = useTranslation();
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<'all' | 'info' | 'success' | 'warning' | 'error'>('all');
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => filter === 'all' || log.level === filter);

  const getStatusIcon = () => {
    switch (executionStatus) {
      case 'running':
        return <Play size={16} className="text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'failed':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return <Square size={16} className="text-gray-400" />;
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success':
        return <CheckCircle size={14} className="text-green-400" />;
      case 'error':
        return <AlertCircle size={14} className="text-red-400" />;
      case 'warning':
        return <AlertCircle size={14} className="text-yellow-400" />;
      default:
        return <Zap size={14} className="text-blue-400" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatData = (data: any) => {
    if (!data) return null;
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  if (!isOpen) return null;

  return (
    <div className={`realtime-logs ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="logs-header">
        <div className="logs-title">
          <Terminal size={16} />
          <span>{t('logs.title')}</span>
          {getStatusIcon()}
          <span className={`status-text ${executionStatus}`}>
            {t(`logs.status.${executionStatus}`)}
          </span>
        </div>
        
        <div className="logs-controls">
          <button
            className="control-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? t('logs.expand') : t('logs.minimize')}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button
            className="control-btn"
            onClick={onClose}
            title={t('common.close')}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Filters and Controls */}
          <div className="logs-filters">
            <div className="filter-buttons">
              {['all', 'info', 'success', 'warning', 'error'].map((level) => (
                <button
                  key={level}
                  className={`filter-btn ${filter === level ? 'active' : ''} ${level}`}
                  onClick={() => setFilter(level as any)}
                >
                  {t(`logs.filters.${level}`)}
                  <span className="filter-count">
                    {level === 'all' ? logs.length : logs.filter(log => log.level === level).length}
                  </span>
                </button>
              ))}
            </div>
            
            <div className="logs-settings">
              <label className="auto-scroll-toggle">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                {t('logs.autoScroll')}
              </label>
              
              {currentNode && (
                <div className="current-node">
                  <Clock size={12} />
                  <span>{t('logs.current', { node: currentNode })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Panel */}
          {error && (
            <div className="error-panel">
              <div className="error-header">
                <AlertCircle size={16} className="text-red-400" />
                <h4>{t('logs.executionError')}</h4>
              </div>
              <div className="error-content">
                {error}
              </div>
            </div>
          )}

          {/* Variables Panel */}
          {(Object.keys(variables).length > 0 || (finalResults && Object.keys(finalResults).length > 0)) && (
            <div className="variables-panel">
              <h4>{t('logs.variables')} {executionStatus === 'completed' && finalResults ? `(${t('logs.finalResults')})` : ''}</h4>
              <div className="variables-grid">
                {Object.entries(executionStatus === 'completed' && finalResults ? finalResults : variables).map(([key, value]) => (
                  <div key={key} className="variable-item">
                    <span className="variable-key">{key}:</span>
                    <span className="variable-value">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logs Container */}
          <div 
            ref={logsContainerRef}
            className="logs-container"
            onScroll={(e) => {
              const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
              const isScrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10;
              setAutoScroll(isScrolledToBottom);
            }}
          >
            {filteredLogs.length === 0 ? (
              <div className="empty-logs">
                <Terminal size={32} className="opacity-30" />
                <p>{t('logs.noLogs')}</p>
                {filter !== 'all' && (
                  <button 
                    className="clear-filter-btn"
                    onClick={() => setFilter('all')}
                  >
                    {t('logs.clearFilter')}
                  </button>
                )}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={`${log.id}-${index}`} className={`log-entry ${log.level}`}>
                  <div className="log-header">
                    <span className="log-timestamp">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <div className="log-node">
                      {getLogIcon(log.level)}
                      <span className="node-name">{log.nodeName}</span>
                      <span className="node-action">({log.action})</span>
                    </div>
                  </div>
                  
                  <div className="log-message">
                    {log.message}
                  </div>
                  
                  {log.data && (
                    <div className="log-data">
                      <pre>{formatData(log.data)}</pre>
                    </div>
                  )}
                </div>
              ))
            )}
            
            {/* Auto scroll indicator */}
            {!autoScroll && filteredLogs.length > 0 && (
              <button
                className="scroll-to-bottom"
                onClick={() => {
                  setAutoScroll(true);
                  if (logsContainerRef.current) {
                    logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
                  }
                }}
              >
                <ChevronDown size={14} />
                {t('logs.scrollToBottom')}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};