import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { LanguageSelector } from '../common/LanguageSelector';
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
  const { t } = useTranslation();
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
                placeholder={t('flow.header.enterFlowName')}
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
                placeholder={t('flow.header.addDescriptionOptional')}
              />
            ) : (
              <div className="flow-description-display" onClick={handleDescriptionEdit}>
                <span>{flowDescription || t('flow.header.addDescription')}</span>
                <Edit3 size={12} className="edit-icon" />
              </div>
            )}
          </div>
        </div>

        <div className="flow-status-indicators">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot" />
            <span>{isConnected ? t('flow.header.connected') : t('flow.header.disconnected')}</span>
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
            title={t('flow.header.newFlow')}
          >
            <Plus size={16} />
            <span>{t('flow.header.new')}</span>
          </button>

          <button
            className="header-btn secondary"
            onClick={onBrowseFlows}
            title={t('flow.header.browseFlows')}
          >
            <FolderOpen size={16} />
            <span>{t('flow.header.browse')}</span>
          </button>

          <button
            className="header-btn secondary"
            onClick={onSaveFlow}
            title={currentFlowId ? t('flow.header.updateFlow') : t('flow.header.saveFlow')}
          >
            <Save size={16} />
            <span>{currentFlowId ? t('flow.header.update') : t('flow.header.save')}</span>
          </button>

          <button
            className={`header-btn secondary ${showLogs ? 'active' : ''}`}
            onClick={onToggleLogs}
            title={t('flow.header.toggleLogs')}
          >
            {showLogs ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{t('flow.header.logs')}</span>
            {executionLogs.length > 0 && (
              <span className="logs-count">{executionLogs.length}</span>
            )}
          </button>

          <button
            className={`header-btn primary ${isExecuting ? 'executing' : ''}`}
            onClick={onRunFlow}
            title={isExecuting ? t('flow.header.stopExecution') : t('flow.header.runFlow')}
          >
            {isExecuting ? (
              <>
                <Square size={16} />
                <span>{t('flow.header.stop')}</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>{t('flow.header.run')}</span>
              </>
            )}
          </button>
        </div>

        <div className="more-actions">
          <LanguageSelector className="header-language-selector" />
          
          <button
            className="header-btn icon-only"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            title={t('flow.header.moreOptions')}
          >
            <MoreHorizontal size={16} />
          </button>

          {showMoreMenu && (
            <div className="more-menu">
              <button onClick={onShowBrowserSettings} className="menu-item">
                <Monitor size={16} />
                <span>{t('flow.header.browserSettings')}</span>
              </button>
              
              <button onClick={onShowApiSettings} className="menu-item">
                <Globe size={16} />
                <span>{t('flow.header.apiSettings')}</span>
              </button>
              
              <div className="menu-divider" />
              
              <button onClick={onExportFlow} className="menu-item">
                <Download size={16} />
                <span>{t('flow.header.exportFlow')}</span>
              </button>
              
              <label className="menu-item">
                <Upload size={16} />
                <span>{t('flow.header.importFlow')}</span>
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
                <span>{t('flow.header.clearFlow')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};