import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    { label: t('browser.viewports.desktopHD'), width: 1920, height: 1080 },
    { label: t('browser.viewports.desktop'), width: 1280, height: 720 },
    { label: t('browser.viewports.tablet'), width: 768, height: 1024 },
    { label: t('browser.viewports.mobile'), width: 375, height: 667 },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content browser-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Monitor size={20} />
            {t('browser.title')}
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
              {t('browser.security.title')}
            </h4>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.stealth}
                  onChange={(e) => setLocalSettings({ ...localSettings, stealth: e.target.checked })}
                />
                <span className="toggle-text">
                  <strong>{t('browser.security.stealthMode')}</strong>
                  <small>{t('browser.security.stealthModeDesc')}</small>
                </span>
              </label>
            </div>
          </div>

          {/* Browser Control */}
          <div className="settings-section">
            <h4>
              <Eye size={16} />
              {t('browser.control.title')}
            </h4>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.keepOpen}
                  onChange={(e) => setLocalSettings({ ...localSettings, keepOpen: e.target.checked })}
                />
                <span className="toggle-text">
                  <strong>{t('browser.control.keepOpen')}</strong>
                  <small>{t('browser.control.keepOpenDesc')}</small>
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
                  <strong>{t('browser.control.showWindow')}</strong>
                  <small>{t('browser.control.showWindowDesc')}</small>
                </span>
              </label>
            </div>
          </div>

          {/* Viewport Settings */}
          <div className="settings-section">
            <h4>
              <Maximize2 size={16} />
              {t('browser.viewport.title')}
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
                  {t('browser.viewport.width')}
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
                  {t('browser.viewport.height')}
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
            <h4>{t('browser.userAgent.title')}</h4>
            <input
              type="text"
              className="user-agent-input"
              placeholder={t('browser.userAgent.placeholder')}
              value={localSettings.userAgent || ''}
              onChange={(e) => setLocalSettings({ ...localSettings, userAgent: e.target.value })}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-save" onClick={handleSave}>
            {t('browser.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
};