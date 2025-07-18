import React, { memo, useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  MousePointer, 
  Type, 
  Clock, 
  Move, 
  FileText, 
  Code, 
  Camera, 
  GitBranch,
  Repeat,
  Variable,
  Globe,
  Navigation,
  Eye,
  Timer,
  Link,
  MousePointer2,
  ChevronDown,
  CheckSquare,
  Keyboard,
  Frame,
  Download,
  Upload,
  Trash,
  Cookie,
  AlertTriangle,
  Regex,
  ExternalLink,
  Play,
  Square,
  ChevronUp,
  ChevronDown as ChevronDownIcon
} from 'lucide-react';
import './CustomNode.css';

const iconMap: Record<string, any> = {
  start: Play,
  navigate: Navigation,
  click: MousePointer,
  type: Type,
  waitFor: Clock,
  scroll: Move,
  extractText: FileText,
  extractHtml: Code,
  screenshot: Camera,
  condition: GitBranch,
  loop: Repeat,
  setVariable: Variable,
  api: Globe,
  isVisible: Eye,
  waitTime: Timer,
  extractAttribute: Link,
  hover: MousePointer2,
  selectOption: ChevronDown,
  checkBox: CheckSquare,
  keyPress: Keyboard,
  iframe: Frame,
  download: Download,
  uploadFile: Upload,
  clearCookies: Trash,
  setCookie: Cookie,
  alert: AlertTriangle,
  regex: Regex,
  extractUrls: ExternalLink,
  response: Square,
};

const colorMap: Record<string, string> = {
  start: '#16A34A',
  navigate: '#4CAF50',
  click: '#2196F3',
  type: '#9C27B0',
  waitFor: '#FF9800',
  scroll: '#00BCD4',
  extractText: '#4CAF50',
  extractHtml: '#E91E63',
  screenshot: '#795548',
  condition: '#607D8B',
  loop: '#F44336',
  setVariable: '#3F51B5',
  api: '#009688',
  isVisible: '#FF5722',
  waitTime: '#FF9800',
  extractAttribute: '#4CAF50',
  hover: '#2196F3',
  selectOption: '#9C27B0',
  checkBox: '#4CAF50',
  keyPress: '#607D8B',
  iframe: '#FF5722',
  download: '#00BCD4',
  uploadFile: '#FF9800',
  clearCookies: '#F44336',
  setCookie: '#795548',
  alert: '#FF5722',
  regex: '#8B5CF6',
  extractUrls: '#10B981',
  response: '#DC2626',
};

interface CustomNodeData {
  label: string;
  action: string;
  config: any;
  onConfigChange?: (config: any) => void;
  inputData?: any;
  outputData?: any;
  variables?: Record<string, any>;
  executionStatus?: 'idle' | 'executing' | 'completed' | 'error' | 'pending';
  executionProgress?: number;
  executionError?: string;
}

export const CustomNode = memo(({ data, selected, id }: NodeProps<CustomNodeData>) => {
  const { t } = useTranslation();
  const Icon = iconMap[data.action] || Variable;
  const color = colorMap[data.action] || '#666';
  const [isExpanded, setIsExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState(data.config || {});
  const nodeRef = useRef<HTMLDivElement>(null);
  
  // Execution status
  const executionStatus = data.executionStatus || 'idle';
  const executionProgress = data.executionProgress || 0;
  const executionError = data.executionError;

  // Get translated label based on action type
  const getTranslatedLabel = () => {
    // Use translation for all node types, including start and response
    try {
      return t(`flow.nodeTypes.${data.action}.label`);
    } catch (e) {
      // Fallback to capitalized action name
      return data.action.charAt(0).toUpperCase() + data.action.slice(1);
    }
  };

  // Update local config when data.config changes
  useEffect(() => {
    setLocalConfig(data.config || {});
  }, [data.config]);

  const handleConfigChange = useCallback((newConfig: any) => {
    setLocalConfig(newConfig);
    if (data.onConfigChange) {
      data.onConfigChange(newConfig);
    }
  }, [data]);

  const renderInlineConfig = () => {
    const config = localConfig;
    const variables = data.variables || {};
    const variableNames = Object.keys(variables);

    const updateConfig = (path: string, value: any) => {
      const newConfig = { ...config };
      const keys = path.split('.');
      let current = newConfig;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      handleConfigChange(newConfig);
    };

    const getValue = (path: string) => {
      const keys = path.split('.');
      let current = config;
      for (const key of keys) {
        if (current && typeof current === 'object') {
          current = current[key];
        } else {
          return '';
        }
      }
      return current || '';
    };

    const renderVariableSelect = (path: string, placeholder: string = 'Select variable') => (
      <select
        value={getValue(path)}
        onChange={(e) => updateConfig(path, e.target.value)}
        className="node-input-small"
      >
        <option value="">{placeholder}</option>
        {variableNames.map(name => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>
    );

    const renderTextInput = (path: string, placeholder: string, type: string = 'text') => (
      <input
        type={type}
        value={getValue(path)}
        onChange={(e) => updateConfig(path, e.target.value)}
        placeholder={placeholder}
        className="node-input"
      />
    );

    const renderSelectInput = (path: string, options: { value: string; label: string }[]) => (
      <select
        value={getValue(path)}
        onChange={(e) => updateConfig(path, e.target.value)}
        className="node-input"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );

    const renderCheckbox = (path: string, label: string) => (
      <label className="node-checkbox">
        <input
          type="checkbox"
          checked={getValue(path)}
          onChange={(e) => updateConfig(path, e.target.checked)}
        />
        {label}
      </label>
    );

    switch (data.action) {
      case 'navigate':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>URL:</label>
              {renderTextInput('navigate.url', 'https://example.com or {{variableName}}')}
            </div>
            <div className="config-field">
              <label>From Variable:</label>
              {renderVariableSelect('navigate.urlVariable', 'Use direct URL above')}
            </div>
            <div className="config-field">
              <label>Wait Until:</label>
              {renderSelectInput('navigate.waitUntil', [
                { value: 'networkidle', label: 'Network Idle' },
                { value: 'load', label: 'Page Load' },
                { value: 'domcontentloaded', label: 'DOM Ready' }
              ])}
            </div>
          </div>
        );

      case 'click':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Selector:</label>
              {renderTextInput('click.selector', 'CSS selector')}
            </div>
            <div className="config-field">
              <label>Wait Before (ms):</label>
              {renderTextInput('click.waitBefore', '0', 'number')}
            </div>
            <div className="config-field">
              <label>Force Click:</label>
              {renderCheckbox('click.force', 'Force click even if hidden')}
            </div>
          </div>
        );

      case 'type':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Selector:</label>
              {renderTextInput('type.selector', 'CSS selector')}
            </div>
            <div className="config-field">
              <label>Text:</label>
              {renderTextInput('type.text', 'Text to type or {{variableName}}')}
            </div>
            <div className="config-field">
              <label>From Variable:</label>
              {renderVariableSelect('type.textVariable', 'Use direct text above')}
            </div>
            <div className="config-field">
              <label>Clear First:</label>
              {renderCheckbox('type.clear', 'Clear field before typing')}
            </div>
            <div className="config-field">
              <label>Delay (ms):</label>
              {renderTextInput('type.delay', '0', 'number')}
            </div>
          </div>
        );

      case 'extractText':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Selector:</label>
              {renderTextInput('extractText.selector', 'CSS selector')}
            </div>
            <div className="config-field">
              <label>Variable Name:</label>
              {renderTextInput('extractText.variableName', 'Variable to store result')}
            </div>
            <div className="config-field">
              <label>Multiple Elements:</label>
              {renderCheckbox('extractText.multiple', 'Extract from all matching elements')}
            </div>
            <div className="config-field">
              <label>Attribute:</label>
              {renderTextInput('extractText.attribute', 'Leave empty for text content')}
            </div>
          </div>
        );

      case 'extractUrls':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Container Selector:</label>
              {renderTextInput('extractUrls.selector', 'body')}
            </div>
            <div className="config-field">
              <label>Variable Name:</label>
              {renderTextInput('extractUrls.variableName', 'extractedUrls')}
            </div>
            <div className="config-field">
              <label>Base URL:</label>
              {renderTextInput('extractUrls.baseUrl', 'For relative URLs')}
            </div>
            <div className="config-field">
              <label>Include Relative:</label>
              {renderCheckbox('extractUrls.includeRelative', 'Include relative URLs')}
            </div>
            <div className="config-field">
              <label>Filter Duplicates:</label>
              {renderCheckbox('extractUrls.filterDuplicates', 'Remove duplicate URLs')}
            </div>
          </div>
        );

      case 'loop':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Loop Type:</label>
              {renderSelectInput('loop.type', [
                { value: 'array', label: 'Array Iteration' },
                { value: 'times', label: 'Fixed Times' },
                { value: 'while', label: 'While Condition' }
              ])}
            </div>
            {getValue('loop.type') === 'array' && (
              <>
                <div className="config-field">
                  <label>Array Variable:</label>
                  {renderVariableSelect('loop.arrayVariable', 'Select array variable')}
                </div>
                <div className="config-field">
                  <label>Item Variable:</label>
                  {renderTextInput('loop.itemVariable', 'currentItem')}
                </div>
                <div className="config-field">
                  <label>Index Variable:</label>
                  {renderTextInput('loop.indexVariable', 'currentIndex')}
                </div>
              </>
            )}
            {getValue('loop.type') === 'times' && (
              <div className="config-field">
                <label>Times:</label>
                {renderTextInput('loop.times', '1', 'number')}
              </div>
            )}
            {getValue('loop.type') === 'while' && (
              <div className="config-field">
                <label>Condition:</label>
                {renderTextInput('loop.condition', 'Condition expression')}
              </div>
            )}
          </div>
        );

      case 'condition':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Condition Type:</label>
              {renderSelectInput('condition.type', [
                { value: 'exists', label: 'Element Exists' },
                { value: 'contains', label: 'Contains Text' },
                { value: 'equals', label: 'Equals Value' },
                { value: 'regex', label: 'Regex Match' }
              ])}
            </div>
            <div className="config-field">
              <label>Selector:</label>
              {renderTextInput('condition.selector', 'CSS selector')}
            </div>
            <div className="config-field">
              <label>Value:</label>
              {renderTextInput('condition.value', 'Value to compare')}
            </div>
            <div className="config-field">
              <label>Variable:</label>
              {renderVariableSelect('condition.variable', 'Check variable instead')}
            </div>
          </div>
        );

      case 'regex':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Source:</label>
              {renderSelectInput('regex.source', [
                { value: 'text', label: 'Direct Text' },
                { value: 'variable', label: 'From Variable' },
                { value: 'element', label: 'From Element' }
              ])}
            </div>
            {getValue('regex.source') === 'text' && (
              <div className="config-field">
                <label>Text:</label>
                {renderTextInput('regex.text', 'Text to process')}
              </div>
            )}
            {getValue('regex.source') === 'variable' && (
              <div className="config-field">
                <label>Variable:</label>
                {renderVariableSelect('regex.variableName', 'Select variable')}
              </div>
            )}
            {getValue('regex.source') === 'element' && (
              <div className="config-field">
                <label>Selector:</label>
                {renderTextInput('regex.selector', 'CSS selector')}
              </div>
            )}
            <div className="config-field">
              <label>Pattern:</label>
              {renderTextInput('regex.pattern', 'Regular expression')}
            </div>
            <div className="config-field">
              <label>Flags:</label>
              {renderTextInput('regex.flags', 'gi')}
            </div>
            <div className="config-field">
              <label>Operation:</label>
              {renderSelectInput('regex.operation', [
                { value: 'match', label: 'Match' },
                { value: 'extract', label: 'Extract Groups' },
                { value: 'replace', label: 'Replace' },
                { value: 'test', label: 'Test' }
              ])}
            </div>
            {getValue('regex.operation') === 'replace' && (
              <div className="config-field">
                <label>Replacement:</label>
                {renderTextInput('regex.replacement', 'Replacement text')}
              </div>
            )}
            <div className="config-field">
              <label>Output Variable:</label>
              {renderTextInput('regex.outputVariable', 'regexResult')}
            </div>
          </div>
        );

      case 'setVariable':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Variable Name:</label>
              {renderTextInput('setVariable.name', 'Variable name')}
            </div>
            <div className="config-field">
              <label>Value:</label>
              {renderTextInput('setVariable.value', 'Value or {{variableName}}')}
            </div>
            <div className="config-field">
              <label>From Variable:</label>
              {renderVariableSelect('setVariable.fromVariable', 'Use direct value above')}
            </div>
          </div>
        );

      case 'isVisible':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Selector:</label>
              {renderTextInput('isVisible.selector', 'CSS selector to check')}
            </div>
            <div className="config-field">
              <label>Variable Name:</label>
              {renderTextInput('isVisible.variableName', 'Variable to store result (true/false)')}
            </div>
            <div className="config-field">
              <label>Timeout (ms):</label>
              {renderTextInput('isVisible.timeout', '5000', 'number')}
            </div>
          </div>
        );

      case 'waitFor':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Selector:</label>
              {renderTextInput('waitFor.selector', 'CSS selector')}
            </div>
            <div className="config-field">
              <label>State:</label>
              {renderSelectInput('waitFor.state', [
                { value: 'visible', label: 'Visible' },
                { value: 'hidden', label: 'Hidden' },
                { value: 'attached', label: 'Attached' },
                { value: 'detached', label: 'Detached' }
              ])}
            </div>
            <div className="config-field">
              <label>Timeout (ms):</label>
              {renderTextInput('waitFor.timeout', '30000', 'number')}
            </div>
          </div>
        );

      case 'waitTime':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Duration (ms):</label>
              {renderTextInput('waitTime.duration', '1000', 'number')}
            </div>
          </div>
        );

      case 'response':
        return (
          <div className="node-config">
            <div className="config-field">
              <label>Format:</label>
              {renderSelectInput('response.format', [
                { value: 'json', label: 'JSON' },
                { value: 'text', label: 'Text' },
                { value: 'html', label: 'HTML' }
              ])}
            </div>
            <div className="config-field">
              <label>Include Metadata:</label>
              {renderCheckbox('response.includeMetadata', 'Add execution metadata')}
            </div>
            <div className="config-field">
              <label>Variables to Include:</label>
              {renderTextInput('response.variablesToInclude', 'Leave empty for all (comma-separated)')}
            </div>
          </div>
        );

      default:
        return (
          <div className="node-config">
            <div className="config-field">
              <label>No configuration needed</label>
            </div>
          </div>
        );
    }
  };

  const getNodeSummary = () => {
    const config = localConfig;
    switch (data.action) {
      case 'navigate':
        return config.navigate?.url || config.navigate?.urlVariable || 'No URL';
      case 'click':
        return config.click?.selector || 'No selector';
      case 'type':
        return config.type?.selector || 'No selector';
      case 'extractText':
        return config.extractText?.variableName || 'No variable';
      case 'extractUrls':
        return config.extractUrls?.variableName || 'extractedUrls';
      case 'loop':
        return `${config.loop?.type || 'array'} loop`;
      case 'condition':
        return config.condition?.type || 'exists';
      case 'regex':
        return config.regex?.operation || 'match';
      case 'setVariable':
        return config.setVariable?.name || 'No variable';
      case 'isVisible':
        return config.isVisible?.selector || 'No selector';
      case 'waitFor':
        return config.waitFor?.selector || 'No selector';
      case 'waitTime':
        return `${config.waitTime?.duration || 1000}ms`;
      case 'response':
        return config.response?.format || 'json';
      default:
        return 'Ready';
    }
  };

  // Show input/output data and execution info if available
  const renderDataInfo = () => {
    const hasData = data.inputData || data.outputData;
    const hasExecutionInfo = executionStatus !== 'idle' || executionError;
    
    if (!hasData && !hasExecutionInfo) return null;
    
    return (
      <div className="node-data-info">
        {data.inputData && (
          <div className="data-input">
            <small>Input: {typeof data.inputData === 'object' ? JSON.stringify(data.inputData).slice(0, 50) + '...' : data.inputData}</small>
          </div>
        )}
        {data.outputData && (
          <div className="data-output">
            <small>Output: {typeof data.outputData === 'object' ? JSON.stringify(data.outputData).slice(0, 50) + '...' : data.outputData}</small>
          </div>
        )}
        {executionStatus !== 'idle' && (
          <div className={`execution-status ${executionStatus}`}>
            <small>
              Status: <strong>{executionStatus.toUpperCase()}</strong>
              {executionStatus === 'executing' && executionProgress > 0 && ` (${executionProgress}%)`}
            </small>
          </div>
        )}
        {executionError && (
          <div className="execution-error">
            <small>Error: {executionError}</small>
          </div>
        )}
      </div>
    );
  };

  // Determine if node should have input/output handles
  const hasInput = data.action !== 'start';
  const hasOutput = data.action !== 'response';
  const hasConditionalOutputs = data.action === 'condition' || data.action === 'isVisible';

  return (
    <div 
      ref={nodeRef}
      className={`custom-node ${selected ? 'selected' : ''} ${isExpanded ? 'expanded' : ''} ${executionStatus !== 'idle' ? executionStatus : ''}`} 
      style={{ borderColor: executionStatus === 'idle' ? color : undefined }}
    >
      {/* Status Indicator */}
      {executionStatus !== 'idle' && (
        <div className={`node-status-indicator ${executionStatus}`} />
      )}
      
      {/* Progress Bar for executing status */}
      {executionStatus === 'executing' && (
        <div className={`node-progress ${executionProgress > 0 ? '' : 'indeterminate'}`} 
             style={{ width: executionProgress > 0 ? `${executionProgress}%` : undefined }} />
      )}
      {/* Input Handle */}
      {hasInput && (
        <Handle 
          type="target" 
          position={Position.Top} 
          style={{ backgroundColor: color }}
        />
      )}
      
      {/* Node Header */}
      <div className="node-header" style={{ backgroundColor: color }}>
        <Icon size={16} color="white" />
        <span className="node-title">{getTranslatedLabel()}</span>
        {data.action !== 'start' && data.action !== 'response' && (
          <button 
            className="node-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDownIcon size={14} />}
          </button>
        )}
      </div>
      
      {/* Node Content */}
      <div className="node-content">
        {!isExpanded && (
          <div className="node-summary">
            {getNodeSummary()}
          </div>
        )}
        
        {isExpanded && renderInlineConfig()}
        
        {renderDataInfo()}
      </div>

      {/* Output Handles */}
      {hasOutput && (
        <>
          {hasConditionalOutputs ? (
            <>
              <Handle
                type="source"
                position={Position.Bottom}
                id="true"
                style={{ 
                  left: '30%',
                  backgroundColor: '#4CAF50',
                  transform: 'translateX(-50%)'
                }}
              />
              <Handle
                type="source"
                position={Position.Bottom}
                id="false"
                style={{ 
                  left: '70%',
                  backgroundColor: '#F44336',
                  transform: 'translateX(-50%)'
                }}
              />
              <div className="handle-labels">
                <span className="handle-label true">True</span>
                <span className="handle-label false">False</span>
              </div>
            </>
          ) : (
            <Handle 
              type="source" 
              position={Position.Bottom} 
              style={{ backgroundColor: color }}
            />
          )}
        </>
      )}
    </div>
  );
});