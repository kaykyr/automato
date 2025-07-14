import React, { useState, useEffect } from 'react';
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
      alert('Route must start with /');
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
            API Endpoint Configuration
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Route Configuration */}
          <div className="settings-section">
            <h4>Endpoint Settings</h4>
            
            <div className="setting-item">
              <label>
                Route Path
                <input
                  type="text"
                  value={localSettings.route}
                  onChange={(e) => setLocalSettings({ ...localSettings, route: e.target.value })}
                  placeholder="/api/v1/my-endpoint"
                />
                <small>This will be accessible at: http://localhost:3001{localSettings.route}</small>
              </label>
            </div>

            <div className="setting-item">
              <label>
                HTTP Method
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
                  <strong>Require Authentication</strong>
                  <small>API Key will be required to access this endpoint</small>
                </span>
              </label>
            </div>
          </div>

          {/* Parameters */}
          <div className="settings-section">
            <h4>
              Parameters
              <button className="btn-add-param" onClick={addParameter}>
                <Plus size={16} />
                Add Parameter
              </button>
            </h4>
            
            {localSettings.parameters && localSettings.parameters.length > 0 ? (
              <div className="parameters-list">
                {localSettings.parameters.map((param, index) => (
                  <div key={index} className="parameter-item">
                    <div className="param-fields">
                      <input
                        type="text"
                        placeholder="Parameter name"
                        value={param.name}
                        onChange={(e) => updateParameter(index, 'name', e.target.value)}
                      />
                      <select
                        value={param.type}
                        onChange={(e) => updateParameter(index, 'type', e.target.value)}
                      >
                        <option value="query">Query</option>
                        <option value="body">Body</option>
                        <option value="param">URL Param</option>
                      </select>
                      <label className="required-checkbox">
                        <input
                          type="checkbox"
                          checked={param.required}
                          onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                        />
                        Required
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
                      placeholder="Description (optional)"
                      value={param.description || ''}
                      onChange={(e) => updateParameter(index, 'description', e.target.value)}
                      className="param-description"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-params">No parameters defined. Click "Add Parameter" to create one.</p>
            )}
          </div>

          {/* Rate Limiting */}
          <div className="settings-section">
            <h4>
              <Clock size={16} />
              Rate Limiting
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
                  <strong>Enable Rate Limiting</strong>
                  <small>Limit the number of requests per time window</small>
                </span>
              </label>
            </div>

            {localSettings.rateLimit && (
              <div className="rate-limit-config">
                <div className="input-group">
                  <label>
                    Max Requests
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
                    Time Window (ms)
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
                  {localSettings.rateLimit.maxRequests} requests per{' '}
                  {localSettings.rateLimit.windowMs / 1000} seconds
                </small>
              </div>
            )}
          </div>

          {/* Response Type */}
          <div className="settings-section">
            <h4>Response Configuration</h4>
            
            <div className="setting-item">
              <label>
                Response Type
                <select
                  value={localSettings.response?.type || 'json'}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      response: { ...localSettings.response, type: e.target.value as any },
                    })
                  }
                >
                  <option value="json">JSON</option>
                  <option value="text">Plain Text</option>
                  <option value="html">HTML</option>
                  <option value="binary">Binary (File)</option>
                </select>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            Save API Configuration
          </button>
        </div>
      </div>
    </div>
  );
};