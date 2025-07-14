import React, { useState, useMemo } from 'react';
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

const nodeTypes: NodeType[] = [
  // Actions
  { type: 'navigate', label: 'Navigate', description: 'Navigate to a URL', category: 'action', icon: Navigation },
  { type: 'click', label: 'Click', description: 'Click an element', category: 'action', icon: MousePointer },
  { type: 'type', label: 'Type', description: 'Type text into an input', category: 'action', icon: Type },
  { type: 'scroll', label: 'Scroll', description: 'Scroll the page', category: 'action', icon: Move },
  { type: 'hover', label: 'Hover', description: 'Hover over an element', category: 'action', icon: MousePointer2 },
  { type: 'selectOption', label: 'Select Option', description: 'Select from dropdown', category: 'action', icon: ChevronDown },
  { type: 'checkBox', label: 'Checkbox', description: 'Check/uncheck checkbox', category: 'action', icon: CheckSquare },
  { type: 'keyPress', label: 'Key Press', description: 'Press keyboard keys', category: 'action', icon: Keyboard },
  { type: 'screenshot', label: 'Screenshot', description: 'Take a screenshot', category: 'action', icon: Camera },
  { type: 'download', label: 'Download', description: 'Download a file', category: 'action', icon: Download },
  { type: 'uploadFile', label: 'Upload File', description: 'Upload a file', category: 'action', icon: Upload },
  { type: 'iframe', label: 'Switch Frame', description: 'Switch to iframe', category: 'action', icon: Frame },
  { type: 'clearCookies', label: 'Clear Cookies', description: 'Clear browser cookies', category: 'action', icon: Trash },
  { type: 'setCookie', label: 'Set Cookie', description: 'Set a cookie', category: 'action', icon: Cookie },
  { type: 'alert', label: 'Handle Alert', description: 'Handle browser alert', category: 'action', icon: AlertTriangle },

  // Data extraction
  { type: 'extractText', label: 'Extract Text', description: 'Extract text from element', category: 'data', icon: FileText },
  { type: 'extractHtml', label: 'Extract HTML', description: 'Extract HTML content', category: 'data', icon: Code },
  { type: 'extractAttribute', label: 'Extract Attribute', description: 'Extract element attribute', category: 'data', icon: Link },
  { type: 'extractUrls', label: 'Extract URLs', description: 'Extract all URLs from page', category: 'data', icon: ExternalLink },
  { type: 'regex', label: 'Regex Extract', description: 'Extract using regex', category: 'data', icon: Regex },

  // Flow control
  { type: 'condition', label: 'Condition', description: 'Conditional branching', category: 'flow', icon: GitBranch },
  { type: 'loop', label: 'Loop', description: 'Repeat actions', category: 'flow', icon: Repeat },
  { type: 'setVariable', label: 'Set Variable', description: 'Store a value', category: 'flow', icon: Variable },
  { type: 'api', label: 'API Call', description: 'Make HTTP request', category: 'flow', icon: Globe },

  // Wait/conditions
  { type: 'waitFor', label: 'Wait For Element', description: 'Wait for element state', category: 'wait', icon: Clock },
  { type: 'waitTime', label: 'Wait Time', description: 'Wait for duration', category: 'wait', icon: Timer },
  { type: 'isVisible', label: 'Check Visibility', description: 'Check if element is visible', category: 'condition', icon: Eye },
];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { value: 'all', label: 'All Blocks', count: nodeTypes.length },
    { value: 'action', label: 'Actions', count: nodeTypes.filter(n => n.category === 'action').length },
    { value: 'data', label: 'Data', count: nodeTypes.filter(n => n.category === 'data').length },
    { value: 'flow', label: 'Flow Control', count: nodeTypes.filter(n => n.category === 'flow').length },
    { value: 'wait', label: 'Wait', count: nodeTypes.filter(n => n.category === 'wait').length },
    { value: 'condition', label: 'Conditions', count: nodeTypes.filter(n => n.category === 'condition').length },
  ];

  const filteredNodes = useMemo(() => {
    return nodeTypes.filter(node => {
      const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           node.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || node.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

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
          <h3>Add Block</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="node-selector-search">
          <div className="search-input-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search blocks..."
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
              <p>No blocks found</p>
              <span>Try a different search term or category</span>
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