import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe, Clock, Plus, Trash2 } from 'lucide-react';
import { ApiConfig } from '../../types/flow.types';
import './ApiSettingsModal.css';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ApiConfig | undefined;
  onSave: (settings: ApiConfig) => void;
}

export const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState<ApiConfig>({
    route: '/api/custom/endpoint',
    method: 'POST',
    requiresAuth: true,
    parameters: [],
    response: {
      type: 'json'
    },
    ...settings,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    // Validate route format
    if (!localSettings.route.startsWith('/')) {
      alert(t('api.validation.routeStartSlash'));
      return;
    }
    onSave(localSettings);
    onClose();
  };

  const addParameter = () => {
    setLocalSettings({
      ...localSettings,
      parameters: [
        ...(localSettings.parameters || []),
        {
          name: '',
          type: 'query',
          required: false,
          description: '',
        },
      ],
    });
  };

  const removeParameter = (index: number) => {
    setLocalSettings({
      ...localSettings,
      parameters: localSettings.parameters?.filter((_, i) => i !== index) || [],
    });
  };

  const updateParameter = (index: number, field: string, value: any) => {
    const updatedParams = [...(localSettings.parameters || [])];
    updatedParams[index] = { ...updatedParams[index], [field]: value };
    setLocalSettings({ ...localSettings, parameters: updatedParams });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content api-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Globe size={20} />
            {t('api.title')}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Route Configuration */}
          <div className="settings-section">
            <h4>{t('api.endpoint.title')}</h4>
            
            <div className="setting-item">
              <label>
                {t('api.endpoint.routePath')}
                <input
                  type="text"
                  value={localSettings.route}
                  onChange={(e) => setLocalSettings({ ...localSettings, route: e.target.value })}
                  placeholder={t('api.endpoint.routePathPlaceholder')}
                />
                <small>{t('api.endpoint.routePathDesc', { route: localSettings.route })}</small>
              </label>
            </div>

            <div className="setting-item">
              <label>
                {t('api.endpoint.httpMethod')}
                <select
                  value={localSettings.method}
                  onChange={(e) => setLocalSettings({ ...localSettings, method: e.target.value as any })}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </label>
            </div>

            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={localSettings.requiresAuth}
                  onChange={(e) => setLocalSettings({ ...localSettings, requiresAuth: e.target.checked })}
                />
                <span className="toggle-text">
                  <strong>{t('api.endpoint.requireAuth')}</strong>
                  <small>{t('api.endpoint.requireAuthDesc')}</small>
                </span>
              </label>
            </div>
          </div>

          {/* Parameters */}
          <div className="settings-section">
            <h4>
              {t('api.parameters.title')}
              <button className="btn-add-param" onClick={addParameter}>
                <Plus size={16} />
                {t('api.parameters.add')}
              </button>
            </h4>
            
            {localSettings.parameters && localSettings.parameters.length > 0 ? (
              <div className="parameters-list">
                {localSettings.parameters.map((param, index) => (
                  <div key={index} className="parameter-item">
                    <div className="param-fields">
                      <input
                        type="text"
                        placeholder={t('api.parameters.namePlaceholder')}
                        value={param.name}
                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                      />
                      <select
                        value={param.type}
                        onChange={(e) => updateParameter(index, 'type', e.target.value)}
                      >
                        <option value="query">{t('api.parameters.types.query')}</option>
                        <option value="body">{t('api.parameters.types.body')}</option>
                        <option value="param">{t('api.parameters.types.param')}</option>
                      </select>
                      <label className="required-checkbox">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                        />
                        {t('api.parameters.required')}
                      </label>
                      <button
                        className="btn-remove-param"
                        onClick={() => removeParameter(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder={t('api.parameters.descriptionPlaceholder')}
                      value={param.description || ''}
                      onChange={(e) => updateParameter(index, 'description', e.target.value)}
                      className="param-description"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-params">{t('api.parameters.noParams')}</p>
            )}
          </div>

          {/* Rate Limiting */}
          <div className="settings-section">
            <h4>
              <Clock size={16} />
              {t('api.rateLimit.title')}
            </h4>
            
            <div className="setting-item">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={!!localSettings.rateLimit}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setLocalSettings({
                        ...localSettings,
                        rateLimit: { windowMs: 60000, maxRequests: 10 },
                      });
                    } else {
                      const { rateLimit, ...rest } = localSettings;
                      setLocalSettings(rest);
                    }
                  }}
                />
                <span className="toggle-text">
                  <strong>{t('api.rateLimit.enable')}</strong>
                  <small>{t('api.rateLimit.enableDesc')}</small>
                </span>
              </label>
            </div>

            {localSettings.rateLimit && (
              <div className="rate-limit-config">
                <div className="input-group">
                  <label>
                    {t('api.rateLimit.maxRequests')}
                    <input
                      type="number"
                      value={localSettings.rateLimit.maxRequests}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          rateLimit: {
                            ...localSettings.rateLimit!,
                            maxRequests: parseInt(e.target.value) || 10,
                          },
                        })
                      }
                    />
                  </label>
                  <label>
                    {t('api.rateLimit.timeWindow')}
                    <input
                      type="number"
                      value={localSettings.rateLimit.windowMs}
                      onChange={(e) =>
                        setLocalSettings({
                          ...localSettings,
                          rateLimit: {
                            ...localSettings.rateLimit!,
                            windowMs: parseInt(e.target.value) || 60000,
                          },
                        })
                      }
                    />
                  </label>
                </div>
                <small>
                  {t('api.rateLimit.summary', { 
                    requests: localSettings.rateLimit.maxRequests, 
                    seconds: localSettings.rateLimit.windowMs / 1000 
                  })}
                </small>
              </div>
            )}
          </div>

          {/* Response Type */}
          <div className="settings-section">
            <h4>{t('api.response.title')}</h4>
            
            <div className="setting-item">
              <label>
                {t('api.response.type')}
                <select
                  value={localSettings.response?.type || 'json'}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      response: { ...localSettings.response, type: e.target.value as any },
                    })
                  }
                >
                  <option value="json">{t('api.response.types.json')}</option>
                  <option value="text">{t('api.response.types.text')}</option>
                  <option value="html">{t('api.response.types.html')}</option>
                  <option value="binary">{t('api.response.types.binary')}</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button className="btn-save" onClick={handleSave}>
            {t('api.saveConfiguration')}
          </button>
        </div>
      </div>
    </div>
  );
};