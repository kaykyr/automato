import React, { useState } from 'react';
import { 
  Play, 
  Square, 
  Save, 
  FolderOpen, 
  Download, 
  Upload, 
  MoreHorizontal,
  Eye,
  EyeOff,
  Globe,
  Monitor,
  Trash2,
  Plus,
  Edit3
} from 'lucide-react';
import './FlowHeader.css';

interface FlowHeaderProps {
  flowName: string;
  flowDescription: string;
  onFlowNameChange: (name: string) => void;
  onFlowDescriptionChange: (description: string) => void;
  currentFlowId: string | null;
  isExecuting: boolean;
  isConnected: boolean;
  showLogs: boolean;
  executionLogs: any[];
  onRunFlow: () => void;
  onSaveFlow: () => void;
  onNewFlow: () => void;
  onBrowseFlows: () => void;
  onExportFlow: () => void;
  onImportFlow: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFlow: () => void;
  onToggleLogs: () => void;
  onShowBrowserSettings: () => void;
  onShowApiSettings: () => void;
}

export const FlowHeader: React.FC<FlowHeaderProps> = ({
  flowName,
  flowDescription,
  onFlowNameChange,
  onFlowDescriptionChange,
  currentFlowId,
  isExecuting,
  isConnected,
  showLogs,
  executionLogs,
  onRunFlow,
  onSaveFlow,
  onNewFlow,
  onBrowseFlows,
  onExportFlow,
  onImportFlow,
  onClearFlow,
  onToggleLogs,
  onShowBrowserSettings,
  onShowApiSettings,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    setIsEditingName(false);
  };

  const handleDescriptionEdit = () => {
    setIsEditingDescription(true);
  };

  const handleDescriptionSave = () => {
    setIsEditingDescription(false);
  };

  return (
    <header className="flow-header">
      <div className="flow-header-left">
        <div className="flow-title-section">
          <div className="flow-name-container">
            {isEditingName ? (
              <input
                type="text"
                value={flowName}
                onChange={(e) => onFlowNameChange(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                className="flow-name-edit"
                autoFocus
                placeholder="Enter flow name"
              />
            ) : (
              <div className="flow-name-display" onClick={handleNameEdit}>
                <h1>{flowName}</h1>
                <Edit3 size={14} className="edit-icon" />
              </div>
            )}
          </div>
          
          <div className="flow-description-container">
            {isEditingDescription ? (
              <input
                type="text"
                value={flowDescription}
                onChange={(e) => onFlowDescriptionChange(e.target.value)}
                onBlur={handleDescriptionSave}
                onKeyDown={(e) => e.key === 'Enter' && handleDescriptionSave()}
                className="flow-description-edit"
                autoFocus
                placeholder="Add description (optional)"
              />
            ) : (
              <div className="flow-description-display" onClick={handleDescriptionEdit}>
                <span>{flowDescription || 'Add description'}</span>
                <Edit3 size={12} className="edit-icon" />
              </div>
            )}
          </div>
        </div>

        <div className="flow-status-indicators">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot" />
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          {currentFlowId && (
            <div className="flow-id">
              <span>ID: {currentFlowId.slice(-8)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flow-header-right">
        <div className="primary-actions">
          <button
            className="header-btn secondary"
            onClick={onNewFlow}
            title="New Flow"
          >
            <Plus size={16} />
            <span>New</span>
          </button>

          <button
            className="header-btn secondary"
            onClick={onBrowseFlows}
            title="Browse Flows"
          >
            <FolderOpen size={16} />
            <span>Browse</span>
          </button>

          <button
            className="header-btn secondary"
            onClick={onSaveFlow}
            title={currentFlowId ? 'Update Flow' : 'Save Flow'}
          >
            <Save size={16} />
            <span>{currentFlowId ? 'Update' : 'Save'}</span>
          </button>

          <button
            className={`header-btn secondary ${showLogs ? 'active' : ''}`}
            onClick={onToggleLogs}
            title="Toggle Logs"
          >
            {showLogs ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>Logs</span>
            {executionLogs.length > 0 && (
              <span className="logs-count">{executionLogs.length}</span>
            )}
          </button>

          <button
            className={`header-btn primary ${isExecuting ? 'executing' : ''}`}
            onClick={onRunFlow}
            disabled={isExecuting}
            title={isExecuting ? 'Running...' : 'Run Flow'}
          >
            {isExecuting ? (
              <>
                <Square size={16} />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Run</span>
              </>
            )}
          </button>
        </div>

        <div className="more-actions">
          <button
            className="header-btn icon-only"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title="More options"
          >
            <MoreHorizontal size={16} />
          </button>

          {showMoreMenu && (
            <div className="more-menu">
              <button onClick={onShowBrowserSettings} className="menu-item">
                <Monitor size={16} />
                <span>Browser Settings</span>
              </button>
              
              <button onClick={onShowApiSettings} className="menu-item">
                <Globe size={16} />
                <span>API Settings</span>
              </button>
              
              <div className="menu-divider" />
              
              <button onClick={onExportFlow} className="menu-item">
                <Download size={16} />
                <span>Export Flow</span>
              </button>
              
              <label className="menu-item">
                <Upload size={16} />
                <span>Import Flow</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={onImportFlow}
                  style={{ display: 'none' }}
                />
              </label>
              
              <div className="menu-divider" />
              
              <button onClick={onClearFlow} className="menu-item danger">
                <Trash2 size={16} />
                <span>Clear Flow</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};