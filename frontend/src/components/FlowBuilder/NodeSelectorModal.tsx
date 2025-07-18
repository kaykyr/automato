import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  Search,
  X
} from 'lucide-react';
import './NodeSelectorModal.css';

export interface NodeType {
  type: string;
  label: string;
  description: string;
  category: 'action' | 'data' | 'flow' | 'wait' | 'condition';
  icon: any;
}

const useNodeTypes = () => {
  const { t } = useTranslation();
  
  return [
    // Actions
    { type: 'navigate', label: t('flow.nodeTypes.navigate.label'), description: t('flow.nodeTypes.navigate.description'), category: 'action', icon: Navigation },
    { type: 'click', label: t('flow.nodeTypes.click.label'), description: t('flow.nodeTypes.click.description'), category: 'action', icon: MousePointer },
    { type: 'type', label: t('flow.nodeTypes.type.label'), description: t('flow.nodeTypes.type.description'), category: 'action', icon: Type },
    { type: 'scroll', label: t('flow.nodeTypes.scroll.label'), description: t('flow.nodeTypes.scroll.description'), category: 'action', icon: Move },
    { type: 'hover', label: t('flow.nodeTypes.hover.label'), description: t('flow.nodeTypes.hover.description'), category: 'action', icon: MousePointer2 },
    { type: 'selectOption', label: t('flow.nodeTypes.selectOption.label'), description: t('flow.nodeTypes.selectOption.description'), category: 'action', icon: ChevronDown },
    { type: 'checkBox', label: t('flow.nodeTypes.checkBox.label'), description: t('flow.nodeTypes.checkBox.description'), category: 'action', icon: CheckSquare },
    { type: 'keyPress', label: t('flow.nodeTypes.keyPress.label'), description: t('flow.nodeTypes.keyPress.description'), category: 'action', icon: Keyboard },
    { type: 'screenshot', label: t('flow.nodeTypes.screenshot.label'), description: t('flow.nodeTypes.screenshot.description'), category: 'action', icon: Camera },
    { type: 'download', label: t('flow.nodeTypes.download.label'), description: t('flow.nodeTypes.download.description'), category: 'action', icon: Download },
    { type: 'uploadFile', label: t('flow.nodeTypes.uploadFile.label'), description: t('flow.nodeTypes.uploadFile.description'), category: 'action', icon: Upload },
    { type: 'iframe', label: t('flow.nodeTypes.iframe.label'), description: t('flow.nodeTypes.iframe.description'), category: 'action', icon: Frame },
    { type: 'clearCookies', label: t('flow.nodeTypes.clearCookies.label'), description: t('flow.nodeTypes.clearCookies.description'), category: 'action', icon: Trash },
    { type: 'setCookie', label: t('flow.nodeTypes.setCookie.label'), description: t('flow.nodeTypes.setCookie.description'), category: 'action', icon: Cookie },
    { type: 'alert', label: t('flow.nodeTypes.alert.label'), description: t('flow.nodeTypes.alert.description'), category: 'action', icon: AlertTriangle },

    // Data extraction
    { type: 'extractText', label: t('flow.nodeTypes.extractText.label'), description: t('flow.nodeTypes.extractText.description'), category: 'data', icon: FileText },
    { type: 'extractHtml', label: t('flow.nodeTypes.extractHtml.label'), description: t('flow.nodeTypes.extractHtml.description'), category: 'data', icon: Code },
    { type: 'extractAttribute', label: t('flow.nodeTypes.extractAttribute.label'), description: t('flow.nodeTypes.extractAttribute.description'), category: 'data', icon: Link },
    { type: 'extractUrls', label: t('flow.nodeTypes.extractUrls.label'), description: t('flow.nodeTypes.extractUrls.description'), category: 'data', icon: ExternalLink },
    { type: 'regex', label: t('flow.nodeTypes.regex.label'), description: t('flow.nodeTypes.regex.description'), category: 'data', icon: Regex },

    // Flow control
    { type: 'condition', label: t('flow.nodeTypes.condition.label'), description: t('flow.nodeTypes.condition.description'), category: 'flow', icon: GitBranch },
    { type: 'loop', label: t('flow.nodeTypes.loop.label'), description: t('flow.nodeTypes.loop.description'), category: 'flow', icon: Repeat },
    { type: 'setVariable', label: t('flow.nodeTypes.setVariable.label'), description: t('flow.nodeTypes.setVariable.description'), category: 'flow', icon: Variable },
    { type: 'api', label: t('flow.nodeTypes.api.label'), description: t('flow.nodeTypes.api.description'), category: 'flow', icon: Globe },

    // Wait/conditions
    { type: 'waitFor', label: t('flow.nodeTypes.waitFor.label'), description: t('flow.nodeTypes.waitFor.description'), category: 'wait', icon: Clock },
    { type: 'waitTime', label: t('flow.nodeTypes.waitTime.label'), description: t('flow.nodeTypes.waitTime.description'), category: 'wait', icon: Timer },
    { type: 'isVisible', label: t('flow.nodeTypes.isVisible.label'), description: t('flow.nodeTypes.isVisible.description'), category: 'condition', icon: Eye },
  ];
};

interface NodeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNodeSelect: (nodeType: string) => void;
  position?: { x: number; y: number };
}

export const NodeSelectorModal: React.FC<NodeSelectorModalProps> = ({
  isOpen,
  onClose,
  onNodeSelect,
  position
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const nodeTypes = useNodeTypes();

  const categories = [
    { value: 'all', label: t('flow.modal.categories.allBlocks'), count: nodeTypes.length },
    { value: 'action', label: t('flow.modal.categories.actions'), count: nodeTypes.filter(n => n.category === 'action').length },
    { value: 'data', label: t('flow.modal.categories.data'), count: nodeTypes.filter(n => n.category === 'data').length },
    { value: 'flow', label: t('flow.modal.categories.flowControl'), count: nodeTypes.filter(n => n.category === 'flow').length },
    { value: 'wait', label: t('flow.modal.categories.wait'), count: nodeTypes.filter(n => n.category === 'wait').length },
    { value: 'condition', label: t('flow.modal.categories.conditions'), count: nodeTypes.filter(n => n.category === 'condition').length },
  ];

  const filteredNodes = useMemo(() => {
    return nodeTypes.filter(node => {
      const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           node.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory, nodeTypes]);

  const handleNodeSelect = (nodeType: string) => {
    onNodeSelect(nodeType);
    onClose();
    setSearchTerm('');
    setSelectedCategory('all');
  };

  const modalStyle = position ? {
    position: 'fixed' as const,
    left: Math.min(position.x, window.innerWidth - 400),
    top: Math.min(position.y, window.innerHeight - 600),
    zIndex: 1000,
    transform: 'none'
  } : {};

  if (!isOpen) return null;

  return (
    <div className={`node-selector-overlay ${position ? 'contextual' : ''}`} onClick={onClose}>
      <div 
        className="node-selector-modal" 
        onClick={(e) => e.stopPropagation()}
        style={modalStyle}
      >
        <div className="node-selector-header">
          <h3>{t('flow.modal.addBlock')}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="node-selector-search">
          <div className="search-input-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder={t('flow.modal.searchBlocks')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>
        </div>

        <div className="node-selector-categories">
          {categories.map(category => (
            <button
              key={category.value}
              className={`category-btn ${selectedCategory === category.value ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
              <span className="category-count">{category.count}</span>
            </button>
          ))}
        </div>

        <div className="node-selector-content">
          {filteredNodes.length === 0 ? (
            <div className="no-results">
              <Search size={32} className="no-results-icon" />
              <p>{t('flow.modal.noBlocksFound')}</p>
              <span>{t('flow.modal.tryDifferentSearch')}</span>
            </div>
          ) : (
            <div className="nodes-grid">
              {filteredNodes.map(node => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.type}
                    className="node-item"
                    onClick={() => handleNodeSelect(node.type)}
                  >
                    <div className="node-icon">
                      <Icon size={20} />
                    </div>
                    <div className="node-info">
                      <h4>{node.label}</h4>
                      <p>{node.description}</p>
                    </div>
                    <div className={`node-category ${node.category}`}>
                      {node.category}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};