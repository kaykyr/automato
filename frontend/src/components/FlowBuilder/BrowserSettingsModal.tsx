import React, { useState, useEffect } from 'react';
import { X, Monitor, Shield, Eye, Maximize2 } from 'lucide-react';
import { BrowserSettings } from '../../types/flow.types';
import './BrowserSettingsModal.css';

interface BrowserSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BrowserSettings;
  onSave: (settings: BrowserSettings) => void;
}

export const BrowserSettingsModal: React.FC<BrowserSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [localSettings, setLocalSettings] = useState<BrowserSettings>({
    stealth: true,
    keepOpen: false,
    headless: true,
    viewport: {
      width: 1280,
      height: 720,
    },
    ...settings,
  });

  useEffect(() => {
    setLocalSettings({
      stealth: true,
      keepOpen: false,
      headless: true,
      viewport: {
        width: 1280,
        height: 720,
      },
      ...settings,
    });
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

  const presetViewports = [
    { label: 'Desktop HD', width: 1920, height: 1080 },
    { label: 'Desktop', width: 1280, height: 720 },
    { label: 'Tablet', width: 768, height: 1024 },
    { label: 'Mobile', width: 375, height: 667 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content browser-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Monitor size={20} />
            Browser Settings
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Stealth Mode */}
          <div className="settings-section">
            <h4>
              <Shield size={16} />
              Security & Detection
            </h4>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.stealth}
                  onChange={(e) => setLocalSettings({ ...localSettings, stealth: e.target.checked })}
                />
                <span className="toggle-text">
                  <strong>Stealth Mode</strong>
                  <small>Evita detecção de automação (recomendado)</small>
                </span>
              </label>
            </div>
          </div>

          {/* Browser Control */}
          <div className="settings-section">
            <h4>
              <Eye size={16} />
              Browser Control
            </h4>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.keepOpen}
                  onChange={(e) => setLocalSettings({ ...localSettings, keepOpen: e.target.checked })}
                />
                <span className="toggle-text">
                  <strong>Keep Browser Open</strong>
                  <small>Mantém o navegador aberto após conclusão</small>
                </span>
              </label>
            </div>

            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={!localSettings.headless}
                  onChange={(e) => setLocalSettings({ ...localSettings, headless: !e.target.checked })}
                />
                <span className="toggle-text">
                  <strong>Show Browser Window</strong>
                  <small>Exibe janela do navegador durante execução</small>
                </span>
              </label>
            </div>
          </div>

          {/* Viewport Settings */}
          <div className="settings-section">
            <h4>
              <Maximize2 size={16} />
              Viewport Size
            </h4>
            
            <div className="viewport-presets">
              {presetViewports.map((preset) => (
                <button
                  key={preset.label}
                  className={`preset-btn ${
                    localSettings.viewport?.width === preset.width &&
                    localSettings.viewport?.height === preset.height
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    setLocalSettings({
                      ...localSettings,
                      viewport: { width: preset.width, height: preset.height },
                    })
                  }
                >
                  {preset.label}
                  <small>{preset.width} × {preset.height}</small>
                </button>
              ))}
            </div>

            <div className="viewport-custom">
              <div className="input-group">
                <label>
                  Width (px)
                  <input
                    type="number"
                    value={localSettings.viewport?.width || 1280}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        viewport: {
                          ...localSettings.viewport!,
                          width: parseInt(e.target.value) || 1280,
                        },
                      })
                    }
                  />
                </label>
                <span className="separator">×</span>
                <label>
                  Height (px)
                  <input
                    type="number"
                    value={localSettings.viewport?.height || 720}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        viewport: {
                          ...localSettings.viewport!,
                          height: parseInt(e.target.value) || 720,
                        },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          {/* User Agent */}
          <div className="settings-section">
            <h4>User Agent (opcional)</h4>
            <input
              type="text"
              className="user-agent-input"
              placeholder="Deixe vazio para usar o padrão"
              value={localSettings.userAgent || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, userAgent: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};