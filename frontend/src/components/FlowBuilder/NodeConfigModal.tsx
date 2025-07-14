import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { FlowNode, NodeConfig } from '../../types/flow.types';
import './NodeConfigModal.css';

interface NodeConfigModalProps {
  node: FlowNode | null;
  onClose: () => void;
  onSave: (nodeId: string, config: NodeConfig) => void;
}

export const NodeConfigModal: React.FC<NodeConfigModalProps> = ({ node, onClose, onSave }) => {
  const [config, setConfig] = useState<NodeConfig>({});

  useEffect(() => {
    if (node) {
      setConfig(node.data.config || {});
    }
  }, [node]);

  if (!node) return null;

  const handleSave = () => {
    onSave(node.id, config);
    onClose();
  };

  const renderConfigFields = () => {
    switch (node.data.action) {
      case 'navigate':
        return (
          <div className="config-field">
            <label>URL</label>
            <input
              type="text"
              value={config.navigate?.url || ''}
              onChange={(e) => setConfig({ navigate: { url: e.target.value } })}
              placeholder="https://example.com"
            />
          </div>
        );

      case 'click':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.click?.selector || ''}
                onChange={(e) => setConfig({ 
                  click: { 
                    selector: e.target.value,
                    waitBefore: config.click?.waitBefore
                  } 
                })}
                placeholder="button.submit"
              />
            </div>
            <div className="config-field">
              <label>Wait Before (ms)</label>
              <input
                type="number"
                value={config.click?.waitBefore || ''}
                onChange={(e) => setConfig({ 
                  click: { 
                    selector: config.click?.selector || '',
                    waitBefore: parseInt(e.target.value) || 0
                  } 
                })}
                placeholder="0"
              />
            </div>
          </>
        );

      case 'type':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.type?.selector || ''}
                onChange={(e) => setConfig({ 
                  type: { 
                    selector: e.target.value,
                    text: config.type?.text || '',
                    delay: config.type?.delay,
                    clear: config.type?.clear
                  } 
                })}
                placeholder="input#username"
              />
            </div>
            <div className="config-field">
              <label>Text to Type</label>
              <input
                type="text"
                value={config.type?.text || ''}
                onChange={(e) => setConfig({ 
                  type: { 
                    selector: config.type?.selector || '',
                    ...config.type, 
                    text: e.target.value 
                  } 
                })}
                placeholder="Hello World"
              />
            </div>
            <div className="config-field">
              <label>Typing Delay (ms)</label>
              <input
                type="number"
                value={config.type?.delay || ''}
                onChange={(e) => setConfig({ 
                  type: { 
                    selector: config.type?.selector || '',
                    text: config.type?.text || '',
                    ...config.type, 
                    delay: parseInt(e.target.value) 
                  } 
                })}
                placeholder="100"
              />
            </div>
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.type?.clear || false}
                  onChange={(e) => setConfig({ 
                    type: { 
                      selector: config.type?.selector || '',
                      text: config.type?.text || '',
                      ...config.type, 
                      clear: e.target.checked 
                    } 
                  })}
                />
                Clear field before typing
              </label>
            </div>
          </>
        );

      case 'waitFor':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.waitFor?.selector || ''}
                onChange={(e) => setConfig({ 
                  waitFor: { 
                    selector: e.target.value,
                    timeout: config.waitFor?.timeout,
                    state: config.waitFor?.state
                  } 
                })}
                placeholder=".loading-complete"
              />
            </div>
            <div className="config-field">
              <label>Timeout (ms)</label>
              <input
                type="number"
                value={config.waitFor?.timeout || 30000}
                onChange={(e) => setConfig({ 
                  waitFor: { 
                    selector: config.waitFor?.selector || '',
                    ...config.waitFor, 
                    timeout: parseInt(e.target.value) 
                  } 
                })}
              />
            </div>
            <div className="config-field">
              <label>Wait State</label>
              <select
                value={config.waitFor?.state || 'visible'}
                onChange={(e) => setConfig({ 
                  waitFor: { 
                    selector: config.waitFor?.selector || '',
                    ...config.waitFor, 
                    state: e.target.value as any 
                  } 
                })}
              >
                <option value="visible">Visible</option>
                <option value="attached">Attached</option>
                <option value="detached">Detached</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          </>
        );

      case 'scroll':
        return (
          <>
            <div className="config-field">
              <label>Element Selector (optional)</label>
              <input
                type="text"
                value={config.scroll?.selector || ''}
                onChange={(e) => setConfig({ 
                  scroll: { 
                    selector: e.target.value,
                    direction: config.scroll?.direction || 'down',
                    amount: config.scroll?.amount
                  } 
                })}
                placeholder="Leave empty for page scroll"
              />
            </div>
            <div className="config-field">
              <label>Direction</label>
              <select
                value={config.scroll?.direction || 'down'}
                onChange={(e) => setConfig({ 
                  scroll: { 
                    ...config.scroll, 
                    direction: e.target.value as any 
                  } 
                })}
              >
                <option value="up">Up</option>
                <option value="down">Down</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </div>
            <div className="config-field">
              <label>Scroll Amount (pixels)</label>
              <input
                type="number"
                value={config.scroll?.amount || 300}
                onChange={(e) => setConfig({ 
                  scroll: { 
                    direction: config.scroll?.direction || 'down',
                    ...config.scroll, 
                    amount: parseInt(e.target.value) 
                  } 
                })}
              />
            </div>
          </>
        );

      case 'extractText':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.extractText?.selector || ''}
                onChange={(e) => setConfig({ 
                  extractText: { 
                    selector: e.target.value,
                    variableName: config.extractText?.variableName || '',
                    multiple: config.extractText?.multiple
                  } 
                })}
                placeholder="h1.title"
              />
            </div>
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.extractText?.variableName || ''}
                onChange={(e) => setConfig({ 
                  extractText: { 
                    selector: config.extractText?.selector || '',
                    ...config.extractText, 
                    variableName: e.target.value 
                  } 
                })}
                placeholder="pageTitle"
              />
            </div>
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.extractText?.multiple || false}
                  onChange={(e) => setConfig({ 
                    extractText: { 
                      selector: config.extractText?.selector || '',
                      variableName: config.extractText?.variableName || '',
                      ...config.extractText, 
                      multiple: e.target.checked 
                    } 
                  })}
                />
                Extract multiple elements
              </label>
            </div>
          </>
        );

      case 'extractHtml':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.extractHtml?.selector || ''}
                onChange={(e) => setConfig({ 
                  extractHtml: { ...config.extractHtml, selector: e.target.value } 
                })}
                placeholder="div.content"
              />
            </div>
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.extractHtml?.variableName || ''}
                onChange={(e) => setConfig({ 
                  extractHtml: { 
                    selector: config.extractHtml?.selector || '',
                    ...config.extractHtml, 
                    variableName: e.target.value 
                  } 
                })}
                placeholder="contentHtml"
              />
            </div>
          </>
        );


      case 'screenshot':
        return (
          <>
            <div className="config-field">
              <label>Element Selector (optional)</label>
              <input
                type="text"
                value={config.screenshot?.selector || ''}
                onChange={(e) => setConfig({ 
                  screenshot: { ...config.screenshot, selector: e.target.value } 
                })}
                placeholder="Leave empty for full page"
              />
            </div>
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.screenshot?.variableName || ''}
                onChange={(e) => setConfig({ 
                  screenshot: { 
                    ...config.screenshot, 
                    variableName: e.target.value 
                  } 
                })}
                placeholder="screenshot"
              />
            </div>
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.screenshot?.fullPage || false}
                  onChange={(e) => setConfig({ 
                    screenshot: { 
                      variableName: config.screenshot?.variableName || '',
                      ...config.screenshot, 
                      fullPage: e.target.checked 
                    } 
                  })}
                />
                Full page screenshot
              </label>
            </div>
          </>
        );


      case 'setVariable':
        return (
          <>
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.setVariable?.name || ''}
                onChange={(e) => setConfig({ 
                  setVariable: { ...config.setVariable, name: e.target.value } 
                })}
                placeholder="myVariable"
              />
            </div>
            <div className="config-field">
              <label>Value</label>
              <input
                type="text"
                value={config.setVariable?.value || ''}
                onChange={(e) => setConfig({ 
                  setVariable: { 
                    name: config.setVariable?.name || '',
                    ...config.setVariable, 
                    value: e.target.value 
                  } 
                })}
                placeholder="Value or {{variable}}"
              />
            </div>
          </>
        );

      case 'isVisible':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.isVisible?.selector || ''}
                onChange={(e) => setConfig({ 
                  isVisible: { 
                    ...config.isVisible, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="button.submit"
              />
            </div>
            <div className="config-field">
              <label>Timeout (ms)</label>
              <input
                type="number"
                value={config.isVisible?.timeout || 5000}
                onChange={(e) => setConfig({ 
                  isVisible: { 
                    ...config.isVisible, 
                    timeout: parseInt(e.target.value) || 5000 
                  } 
                })}
                placeholder="5000"
              />
            </div>
            <div className="config-info">
              <p>This node will route to the <strong>TRUE</strong> output if the element is visible, or to the <strong>FALSE</strong> output if not.</p>
            </div>
          </>
        );

      case 'condition':
        return (
          <>
            <div className="config-field">
              <label>Condition Type</label>
              <select
                value={config.condition?.type || 'exists'}
                onChange={(e) => setConfig({ 
                  condition: { 
                    ...config.condition, 
                    type: e.target.value as 'exists' | 'contains' | 'equals' | 'regex'
                  } 
                })}
              >
                <option value="exists">Element Exists</option>
                <option value="contains">Text Contains</option>
                <option value="equals">Text Equals</option>
                <option value="regex">Regex Match</option>
              </select>
            </div>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.condition?.selector || ''}
                onChange={(e) => setConfig({ 
                  condition: { 
                    ...config.condition, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="button.submit"
              />
            </div>
            {(config.condition?.type === 'contains' || config.condition?.type === 'equals' || config.condition?.type === 'regex') && (
              <div className="config-field">
                <label>Value to Compare</label>
                <input
                  type="text"
                  value={config.condition?.value || ''}
                  onChange={(e) => setConfig({ 
                    condition: { 
                      ...config.condition, 
                      value: e.target.value 
                    } 
                  })}
                  placeholder="Expected text or regex pattern"
                />
              </div>
            )}
            <div className="config-field">
              <label>Variable to Check (optional)</label>
              <input
                type="text"
                value={config.condition?.variable || ''}
                onChange={(e) => setConfig({ 
                  condition: { 
                    ...config.condition, 
                    variable: e.target.value 
                  } 
                })}
                placeholder="myVariable"
              />
            </div>
            <div className="config-info">
              <p>This node will route to the <strong>TRUE</strong> output if the condition is met, or to the <strong>FALSE</strong> output if not.</p>
            </div>
          </>
        );

      case 'loop':
        return (
          <>
            <div className="config-field">
              <label>Loop Type</label>
              <select
                value={config.loop?.type || 'forEach'}
                onChange={(e) => setConfig({ 
                  loop: { 
                    ...config.loop, 
                    type: e.target.value as 'forEach' | 'while' | 'times' | 'array'
                  } 
                })}
              >
                <option value="forEach">For Each Element</option>
                <option value="array">For Each Array Item</option>
                <option value="times">Repeat N Times</option>
                <option value="while">While Condition</option>
              </select>
            </div>
            {config.loop?.type === 'forEach' && (
              <div className="config-field">
                <label>CSS Selector</label>
                <input
                  type="text"
                  value={config.loop?.selector || ''}
                  onChange={(e) => setConfig({ 
                    loop: { 
                      ...config.loop, 
                      selector: e.target.value 
                    } 
                  })}
                  placeholder=".item"
                />
              </div>
            )}
            {config.loop?.type === 'array' && (
              <>
                <div className="config-field">
                  <label>Array Variable Name</label>
                  <input
                    type="text"
                    value={config.loop?.arrayVariable || ''}
                    onChange={(e) => setConfig({ 
                      loop: { 
                        ...config.loop, 
                        arrayVariable: e.target.value 
                      } 
                    })}
                    placeholder="extractedUrls"
                  />
                </div>
                <div className="config-field">
                  <label>Item Variable Name</label>
                  <input
                    type="text"
                    value={config.loop?.itemVariable || ''}
                    onChange={(e) => setConfig({ 
                      loop: { 
                        ...config.loop, 
                        itemVariable: e.target.value 
                      } 
                    })}
                    placeholder="currentUrl"
                  />
                </div>
                <div className="config-field">
                  <label>Index Variable Name (optional)</label>
                  <input
                    type="text"
                    value={config.loop?.indexVariable || ''}
                    onChange={(e) => setConfig({ 
                      loop: { 
                        ...config.loop, 
                        indexVariable: e.target.value 
                      } 
                    })}
                    placeholder="currentIndex"
                  />
                </div>
              </>
            )}
            {config.loop?.type === 'times' && (
              <div className="config-field">
                <label>Number of Times</label>
                <input
                  type="number"
                  value={config.loop?.times || 1}
                  onChange={(e) => setConfig({ 
                    loop: { 
                      ...config.loop, 
                      times: parseInt(e.target.value) || 1
                    } 
                  })}
                  placeholder="5"
                />
              </div>
            )}
            {config.loop?.type === 'while' && (
              <div className="config-field">
                <label>Condition</label>
                <input
                  type="text"
                  value={config.loop?.condition || ''}
                  onChange={(e) => setConfig({ 
                    loop: { 
                      ...config.loop, 
                      condition: e.target.value 
                    } 
                  })}
                  placeholder="{{variable}} < 10"
                />
              </div>
            )}
            {config.loop?.type === 'array' && (
              <div className="config-info">
                <h4>Array Loop Usage:</h4>
                <p>This loop type iterates over each item in an array variable (e.g., from Extract URLs).</p>
                <p><strong>Example:</strong> If extractedUrls contains ["url1", "url2", "url3"], the loop will run 3 times with currentUrl containing each URL.</p>
              </div>
            )}
          </>
        );

      case 'api':
        return (
          <>
            <div className="config-field">
              <label>HTTP Method</label>
              <select
                value={config.api?.method || 'GET'}
                onChange={(e) => setConfig({ 
                  api: { 
                    ...config.api, 
                    method: e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE'
                  } 
                })}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className="config-field">
              <label>URL</label>
              <input
                type="text"
                value={config.api?.url || ''}
                onChange={(e) => setConfig({ 
                  api: { 
                    ...config.api, 
                    url: e.target.value 
                  } 
                })}
                placeholder="https://api.example.com/endpoint"
              />
            </div>
            <div className="config-field">
              <label>Headers (JSON)</label>
              <textarea
                value={JSON.stringify(config.api?.headers || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    setConfig({ 
                      api: { 
                        ...config.api, 
                        headers 
                      } 
                    });
                  } catch (err) {
                    // Invalid JSON, keep typing
                  }
                }}
                placeholder='{"Content-Type": "application/json"}'
                rows={3}
              />
            </div>
            {(config.api?.method === 'POST' || config.api?.method === 'PUT') && (
              <div className="config-field">
                <label>Body (JSON)</label>
                <textarea
                  value={typeof config.api?.body === 'string' ? config.api.body : JSON.stringify(config.api?.body || {}, null, 2)}
                  onChange={(e) => setConfig({ 
                    api: { 
                      ...config.api, 
                      body: e.target.value 
                    } 
                  })}
                  placeholder='{"key": "value"}'
                  rows={4}
                />
              </div>
            )}
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.api?.variableName || ''}
                onChange={(e) => setConfig({ 
                  api: { 
                    ...config.api, 
                    variableName: e.target.value 
                  } 
                })}
                placeholder="apiResponse"
              />
            </div>
          </>
        );

      case 'waitTime':
        return (
          <div className="config-field">
            <label>Duration (ms)</label>
            <input
              type="number"
              value={config.waitTime?.duration || 1000}
              onChange={(e) => setConfig({ 
                waitTime: { duration: parseInt(e.target.value) || 1000 } 
              })}
              placeholder="1000"
            />
          </div>
        );

      case 'extractAttribute':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.extractAttribute?.selector || ''}
                onChange={(e) => setConfig({ 
                  extractAttribute: { 
                    ...config.extractAttribute, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="a.link"
              />
            </div>
            <div className="config-field">
              <label>Attribute Name</label>
              <input
                type="text"
                value={config.extractAttribute?.attribute || ''}
                onChange={(e) => setConfig({ 
                  extractAttribute: { 
                    ...config.extractAttribute, 
                    attribute: e.target.value 
                  } 
                })}
                placeholder="href"
              />
            </div>
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.extractAttribute?.variableName || ''}
                onChange={(e) => setConfig({ 
                  extractAttribute: { 
                    ...config.extractAttribute, 
                    variableName: e.target.value 
                  } 
                })}
                placeholder="linkUrl"
              />
            </div>
          </>
        );

      case 'hover':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.hover?.selector || ''}
                onChange={(e) => setConfig({ 
                  hover: { 
                    ...config.hover, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="button.menu"
              />
            </div>
            <div className="config-field">
              <label>Duration (ms)</label>
              <input
                type="number"
                value={config.hover?.duration || 1000}
                onChange={(e) => setConfig({ 
                  hover: { 
                    ...config.hover, 
                    duration: parseInt(e.target.value) || 1000 
                  } 
                })}
                placeholder="1000"
              />
            </div>
          </>
        );

      case 'selectOption':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.selectOption?.selector || ''}
                onChange={(e) => setConfig({ 
                  selectOption: { 
                    ...config.selectOption, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="select#country"
              />
            </div>
            <div className="config-field">
              <label>Option Value</label>
              <input
                type="text"
                value={config.selectOption?.value || ''}
                onChange={(e) => setConfig({ 
                  selectOption: { 
                    ...config.selectOption, 
                    value: e.target.value 
                  } 
                })}
                placeholder="BR"
              />
            </div>
            <div className="config-field">
              <label>Option Text (alternative)</label>
              <input
                type="text"
                value={config.selectOption?.text || ''}
                onChange={(e) => setConfig({ 
                  selectOption: { 
                    ...config.selectOption, 
                    text: e.target.value 
                  } 
                })}
                placeholder="Brazil"
              />
            </div>
          </>
        );

      case 'checkBox':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.checkBox?.selector || ''}
                onChange={(e) => setConfig({ 
                  checkBox: { 
                    ...config.checkBox, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="input[type='checkbox']"
              />
            </div>
            <div className="config-field">
              <label>Action</label>
              <select
                value={config.checkBox?.action || 'check'}
                onChange={(e) => setConfig({ 
                  checkBox: { 
                    ...config.checkBox, 
                    action: e.target.value as 'check' | 'uncheck' | 'toggle'
                  } 
                })}
              >
                <option value="check">Check</option>
                <option value="uncheck">Uncheck</option>
                <option value="toggle">Toggle</option>
              </select>
            </div>
          </>
        );

      case 'keyPress':
        return (
          <>
            <div className="config-field">
              <label>Keys</label>
              <input
                type="text"
                value={config.keyPress?.keys || ''}
                onChange={(e) => setConfig({ 
                  keyPress: { 
                    ...config.keyPress, 
                    keys: e.target.value 
                  } 
                })}
                placeholder="Enter, Escape, Tab, etc."
              />
            </div>
            <div className="config-field">
              <label>Modifiers (comma separated)</label>
              <input
                type="text"
                value={config.keyPress?.modifiers?.join(', ') || ''}
                onChange={(e) => setConfig({ 
                  keyPress: { 
                    ...config.keyPress, 
                    modifiers: e.target.value.split(', ').filter(m => m.trim())
                  } 
                })}
                placeholder="Control, Shift, Alt, Meta"
              />
            </div>
          </>
        );

      case 'iframe':
        return (
          <>
            <div className="config-field">
              <label>Action</label>
              <select
                value={config.iframe?.action || 'enter'}
                onChange={(e) => setConfig({ 
                  iframe: { 
                    ...config.iframe, 
                    action: e.target.value as 'enter' | 'exit'
                  } 
                })}
              >
                <option value="enter">Enter iframe</option>
                <option value="exit">Exit iframe</option>
              </select>
            </div>
            {config.iframe?.action === 'enter' && (
              <div className="config-field">
                <label>iframe CSS Selector</label>
                <input
                  type="text"
                  value={config.iframe?.selector || ''}
                  onChange={(e) => setConfig({ 
                    iframe: { 
                      ...config.iframe, 
                      selector: e.target.value 
                    } 
                  })}
                  placeholder="iframe#content"
                />
              </div>
            )}
          </>
        );

      case 'download':
        return (
          <>
            <div className="config-field">
              <label>Download Link Selector</label>
              <input
                type="text"
                value={config.download?.selector || ''}
                onChange={(e) => setConfig({ 
                  download: { 
                    ...config.download, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="a.download-link"
              />
            </div>
            <div className="config-field">
              <label>Filename (optional)</label>
              <input
                type="text"
                value={config.download?.filename || ''}
                onChange={(e) => setConfig({ 
                  download: { 
                    ...config.download, 
                    filename: e.target.value 
                  } 
                })}
                placeholder="document.pdf"
              />
            </div>
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.download?.variableName || ''}
                onChange={(e) => setConfig({ 
                  download: { 
                    ...config.download, 
                    variableName: e.target.value 
                  } 
                })}
                placeholder="downloadPath"
              />
            </div>
          </>
        );

      case 'uploadFile':
        return (
          <>
            <div className="config-field">
              <label>File Input Selector</label>
              <input
                type="text"
                value={config.uploadFile?.selector || ''}
                onChange={(e) => setConfig({ 
                  uploadFile: { 
                    ...config.uploadFile, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="input[type='file']"
              />
            </div>
            <div className="config-field">
              <label>File Path</label>
              <input
                type="text"
                value={config.uploadFile?.filePath || ''}
                onChange={(e) => setConfig({ 
                  uploadFile: { 
                    ...config.uploadFile, 
                    filePath: e.target.value 
                  } 
                })}
                placeholder="/path/to/file.pdf"
              />
            </div>
          </>
        );

      case 'clearCookies':
        return (
          <div className="config-field">
            <label>Domain (optional)</label>
            <input
              type="text"
              value={config.clearCookies?.domain || ''}
              onChange={(e) => setConfig({ 
                clearCookies: { domain: e.target.value } 
              })}
              placeholder="example.com"
            />
          </div>
        );

      case 'setCookie':
        return (
          <>
            <div className="config-field">
              <label>Cookie Name</label>
              <input
                type="text"
                value={config.setCookie?.name || ''}
                onChange={(e) => setConfig({ 
                  setCookie: { 
                    ...config.setCookie, 
                    name: e.target.value 
                  } 
                })}
                placeholder="sessionId"
              />
            </div>
            <div className="config-field">
              <label>Cookie Value</label>
              <input
                type="text"
                value={config.setCookie?.value || ''}
                onChange={(e) => setConfig({ 
                  setCookie: { 
                    ...config.setCookie, 
                    value: e.target.value 
                  } 
                })}
                placeholder="abc123"
              />
            </div>
            <div className="config-field">
              <label>Domain (optional)</label>
              <input
                type="text"
                value={config.setCookie?.domain || ''}
                onChange={(e) => setConfig({ 
                  setCookie: { 
                    ...config.setCookie, 
                    domain: e.target.value 
                  } 
                })}
                placeholder="example.com"
              />
            </div>
            <div className="config-field">
              <label>Path (optional)</label>
              <input
                type="text"
                value={config.setCookie?.path || ''}
                onChange={(e) => setConfig({ 
                  setCookie: { 
                    ...config.setCookie, 
                    path: e.target.value 
                  } 
                })}
                placeholder="/"
              />
            </div>
          </>
        );

      case 'alert':
        return (
          <>
            <div className="config-field">
              <label>Action</label>
              <select
                value={config.alert?.action || 'accept'}
                onChange={(e) => setConfig({ 
                  alert: { 
                    ...config.alert, 
                    action: e.target.value as 'accept' | 'dismiss' | 'getText'
                  } 
                })}
              >
                <option value="accept">Accept</option>
                <option value="dismiss">Dismiss</option>
                <option value="getText">Get Text</option>
              </select>
            </div>
            {config.alert?.action === 'accept' && (
              <div className="config-field">
                <label>Text to Type (for prompt)</label>
                <input
                  type="text"
                  value={config.alert?.text || ''}
                  onChange={(e) => setConfig({ 
                    alert: { 
                      ...config.alert, 
                      text: e.target.value 
                    } 
                  })}
                  placeholder="Response text"
                />
              </div>
            )}
            {config.alert?.action === 'getText' && (
              <div className="config-field">
                <label>Variable Name</label>
                <input
                  type="text"
                  value={config.alert?.variableName || ''}
                  onChange={(e) => setConfig({ 
                    alert: { 
                      ...config.alert, 
                      variableName: e.target.value 
                    } 
                  })}
                  placeholder="alertText"
                />
              </div>
            )}
          </>
        );

      case 'regex':
        return (
          <>
            <div className="config-field">
              <label>Input Source</label>
              <select
                value={config.regex?.source || 'variable'}
                onChange={(e) => setConfig({ 
                  regex: { 
                    ...config.regex, 
                    source: e.target.value as 'variable' | 'element' | 'text'
                  } 
                })}
              >
                <option value="variable">Variable</option>
                <option value="element">Element Text</option>
                <option value="text">Static Text</option>
              </select>
            </div>
            
            {config.regex?.source === 'variable' && (
              <div className="config-field">
                <label>Variable Name</label>
                <input
                  type="text"
                  value={config.regex?.variableName || ''}
                  onChange={(e) => setConfig({ 
                    regex: { 
                      ...config.regex, 
                      variableName: e.target.value 
                    } 
                  })}
                  placeholder="textToProcess"
                />
              </div>
            )}
            
            {config.regex?.source === 'element' && (
              <div className="config-field">
                <label>CSS Selector</label>
                <input
                  type="text"
                  value={config.regex?.selector || ''}
                  onChange={(e) => setConfig({ 
                    regex: { 
                      ...config.regex, 
                      selector: e.target.value 
                    } 
                  })}
                  placeholder="div.content"
                />
              </div>
            )}
            
            {config.regex?.source === 'text' && (
              <div className="config-field">
                <label>Text to Process</label>
                <textarea
                  value={config.regex?.text || ''}
                  onChange={(e) => setConfig({ 
                    regex: { 
                      ...config.regex, 
                      text: e.target.value 
                    } 
                  })}
                  placeholder="Enter text to process with regex"
                  rows={3}
                />
              </div>
            )}
            
            <div className="config-field">
              <label>Regex Pattern</label>
              <input
                type="text"
                value={config.regex?.pattern || ''}
                onChange={(e) => setConfig({ 
                  regex: { 
                    ...config.regex, 
                    pattern: e.target.value 
                  } 
                })}
                placeholder="(\d{4}-\d{2}-\d{2})"
              />
            </div>
            
            <div className="config-field">
              <label>Flags (optional)</label>
              <input
                type="text"
                value={config.regex?.flags || ''}
                onChange={(e) => setConfig({ 
                  regex: { 
                    ...config.regex, 
                    flags: e.target.value 
                  } 
                })}
                placeholder="g, i, m (global, case insensitive, multiline)"
              />
            </div>
            
            <div className="config-field">
              <label>Operation</label>
              <select
                value={config.regex?.operation || 'match'}
                onChange={(e) => setConfig({ 
                  regex: { 
                    ...config.regex, 
                    operation: e.target.value as 'match' | 'replace' | 'extract' | 'test'
                  } 
                })}
              >
                <option value="match">Match (find matches)</option>
                <option value="extract">Extract groups</option>
                <option value="replace">Replace</option>
                <option value="test">Test (true/false)</option>
              </select>
            </div>
            
            {config.regex?.operation === 'replace' && (
              <div className="config-field">
                <label>Replacement Text</label>
                <input
                  type="text"
                  value={config.regex?.replacement || ''}
                  onChange={(e) => setConfig({ 
                    regex: { 
                      ...config.regex, 
                      replacement: e.target.value 
                    } 
                  })}
                  placeholder="Replacement text or $1 for groups"
                />
              </div>
            )}
            
            <div className="config-field">
              <label>Output Variable Name</label>
              <input
                type="text"
                value={config.regex?.outputVariable || ''}
                onChange={(e) => setConfig({ 
                  regex: { 
                    ...config.regex, 
                    outputVariable: e.target.value 
                  } 
                })}
                placeholder="extractedData"
              />
            </div>
            
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.regex?.matchAll || false}
                  onChange={(e) => setConfig({ 
                    regex: { 
                      ...config.regex, 
                      matchAll: e.target.checked 
                    } 
                  })}
                />
                Find all matches (instead of just first)
              </label>
            </div>
            
            <div className="config-info">
              <h4>Common Regex Patterns:</h4>
              <ul>
                <li><strong>Email:</strong> [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]&#123;2,&#125;</li>
                <li><strong>Phone:</strong> \(?\d&#123;3&#125;\)?[-.\s]?\d&#123;3&#125;[-.\s]?\d&#123;4&#125;</li>
                <li><strong>Date (YYYY-MM-DD):</strong> \d&#123;4&#125;-\d&#123;2&#125;-\d&#123;2&#125;</li>
                <li><strong>URL:</strong> https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]&#123;1,256&#125;\.[a-zA-Z0-9()]&#123;1,6&#125;\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)</li>
                <li><strong>Numbers:</strong> \d+\.?\d*</li>
                <li><strong>Currency:</strong> \$?\d&#123;1,3&#125;(?:,\d&#123;3&#125;)*(?:\.\d&#123;2&#125;)?</li>
              </ul>
            </div>
          </>
        );

      case 'extractUrls':
        return (
          <>
            <div className="config-field">
              <label>CSS Selector</label>
              <input
                type="text"
                value={config.extractUrls?.selector || ''}
                onChange={(e) => setConfig({ 
                  extractUrls: { 
                    ...config.extractUrls, 
                    selector: e.target.value 
                  } 
                })}
                placeholder="div.content (searches for all <a> tags within)"
              />
            </div>
            
            <div className="config-field">
              <label>Variable Name</label>
              <input
                type="text"
                value={config.extractUrls?.variableName || ''}
                onChange={(e) => setConfig({ 
                  extractUrls: { 
                    ...config.extractUrls, 
                    variableName: e.target.value 
                  } 
                })}
                placeholder="extractedUrls"
              />
            </div>
            
            <div className="config-field">
              <label>Base URL (for relative links)</label>
              <input
                type="text"
                value={config.extractUrls?.baseUrl || ''}
                onChange={(e) => setConfig({ 
                  extractUrls: { 
                    ...config.extractUrls, 
                    baseUrl: e.target.value 
                  } 
                })}
                placeholder="https://example.com"
              />
            </div>
            
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.extractUrls?.includeRelative || false}
                  onChange={(e) => setConfig({ 
                    extractUrls: { 
                      ...config.extractUrls, 
                      includeRelative: e.target.checked 
                    } 
                  })}
                />
                Include relative URLs (e.g., /page, ../file.html)
              </label>
            </div>
            
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.extractUrls?.filterDuplicates !== false}
                  onChange={(e) => setConfig({ 
                    extractUrls: { 
                      ...config.extractUrls, 
                      filterDuplicates: e.target.checked 
                    } 
                  })}
                />
                Filter duplicate URLs
              </label>
            </div>
            
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.extractUrls?.includeEmpty || false}
                  onChange={(e) => setConfig({ 
                    extractUrls: { 
                      ...config.extractUrls, 
                      includeEmpty: e.target.checked 
                    } 
                  })}
                />
                Include empty href attributes
              </label>
            </div>
            
            <div className="config-info">
              <h4>How it works:</h4>
              <p>This block searches for all <code>&lt;a&gt;</code> tags within the specified selector and extracts their <code>href</code> attributes. It recursively searches through all child elements.</p>
              <h4>Output:</h4>
              <p>Returns an array of URLs found in the selected container.</p>
              <h4>Examples:</h4>
              <ul>
                <li><strong>Navigation links:</strong> <code>nav</code></li>
                <li><strong>Article links:</strong> <code>.article-list</code></li>
                <li><strong>Footer links:</strong> <code>footer</code></li>
                <li><strong>All page links:</strong> <code>body</code></li>
              </ul>
            </div>
          </>
        );

      case 'start':
        return (
          <>
            <div className="config-field">
              <label>Description (optional)</label>
              <input
                type="text"
                value={config.start?.description || ''}
                onChange={(e) => setConfig({ 
                  start: { 
                    description: e.target.value 
                  } 
                })}
                placeholder="Flow description"
              />
            </div>
            <div className="config-info">
              <h4>Start Node:</h4>
              <p>This is the starting point of your flow. Every flow must have exactly one Start node.</p>
              <p><strong>Note:</strong> The Start node cannot be deleted and will always be present in your flow.</p>
            </div>
          </>
        );

      case 'response':
        return (
          <>
            <div className="config-field">
              <label>Response Format</label>
              <select
                value={config.response?.format || 'json'}
                onChange={(e) => setConfig({ 
                  response: { 
                    ...config.response, 
                    format: e.target.value as 'json' | 'text' | 'html'
                  } 
                })}
              >
                <option value="json">JSON</option>
                <option value="text">Plain Text</option>
                <option value="html">HTML</option>
              </select>
            </div>
            
            <div className="config-field">
              <label>Variables to Include</label>
              <input
                type="text"
                value={config.response?.variablesToInclude?.join(', ') || ''}
                onChange={(e) => setConfig({ 
                  response: { 
                    ...config.response, 
                    variablesToInclude: e.target.value.split(',').map(v => v.trim()).filter(v => v)
                  } 
                })}
                placeholder="extractedUrls, pageTitle, results (comma separated)"
              />
            </div>
            
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.response?.includeMetadata || false}
                  onChange={(e) => setConfig({ 
                    response: { 
                      ...config.response, 
                      includeMetadata: e.target.checked 
                    } 
                  })}
                />
                Include execution metadata (timing, status, etc.)
              </label>
            </div>
            
            <div className="config-field">
              <label>
                <input
                  type="checkbox"
                  checked={config.response?.combineArrays || false}
                  onChange={(e) => setConfig({ 
                    response: { 
                      ...config.response, 
                      combineArrays: e.target.checked 
                    } 
                  })}
                />
                Combine arrays from multiple sources
              </label>
            </div>
            
            <div className="config-info">
              <h4>Response Node:</h4>
              <p>This node collects outputs from multiple flow branches and creates a final response.</p>
              <p><strong>Features:</strong></p>
              <ul>
                <li>Accepts multiple incoming connections</li>
                <li>Has no outgoing connections (final node)</li>
                <li>Combines variables from all connected nodes</li>
                <li>Formats the final response according to your settings</li>
              </ul>
            </div>
          </>
        );

      default:
        return <p>Configuration not available for this node type.</p>;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Configure {node.data.label}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">
          {renderConfigFields()}
        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};