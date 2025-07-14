import React from 'react';
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
  ExternalLink
} from 'lucide-react';
import './NodePalette.css';

const nodeTypes = [
  { 
    type: 'navigate', 
    label: 'Navigate', 
    icon: Navigation,
    color: '#4CAF50',
    description: 'Navigate to URL'
  },
  { 
    type: 'click', 
    label: 'Click', 
    icon: MousePointer,
    color: '#2196F3',
    description: 'Click on element'
  },
  { 
    type: 'type', 
    label: 'Type', 
    icon: Type,
    color: '#9C27B0',
    description: 'Type text in input'
  },
  { 
    type: 'waitFor', 
    label: 'Wait For', 
    icon: Clock,
    color: '#FF9800',
    description: 'Wait for element'
  },
  { 
    type: 'scroll', 
    label: 'Scroll', 
    icon: Move,
    color: '#00BCD4',
    description: 'Scroll page or element'
  },
  { 
    type: 'extractText', 
    label: 'Extract Text', 
    icon: FileText,
    color: '#4CAF50',
    description: 'Extract text content'
  },
  { 
    type: 'extractHtml', 
    label: 'Extract HTML', 
    icon: Code,
    color: '#E91E63',
    description: 'Extract HTML content'
  },
  { 
    type: 'screenshot', 
    label: 'Screenshot', 
    icon: Camera,
    color: '#795548',
    description: 'Take screenshot'
  },
  { 
    type: 'condition', 
    label: 'Condition', 
    icon: GitBranch,
    color: '#607D8B',
    description: 'Conditional logic'
  },
  { 
    type: 'loop', 
    label: 'Loop', 
    icon: Repeat,
    color: '#F44336',
    description: 'Loop through elements'
  },
  { 
    type: 'setVariable', 
    label: 'Set Variable', 
    icon: Variable,
    color: '#3F51B5',
    description: 'Set a variable'
  },
  { 
    type: 'api', 
    label: 'API Call', 
    icon: Globe,
    color: '#009688',
    description: 'Make API request'
  },
  { 
    type: 'isVisible', 
    label: 'Is Visible', 
    icon: Eye,
    color: '#FF5722',
    description: 'Check if element is visible'
  },
  { 
    type: 'waitTime', 
    label: 'Wait Time', 
    icon: Timer,
    color: '#FF9800',
    description: 'Wait for specific time'
  },
  { 
    type: 'extractAttribute', 
    label: 'Extract Attribute', 
    icon: Link,
    color: '#4CAF50',
    description: 'Extract element attribute'
  },
  { 
    type: 'hover', 
    label: 'Hover', 
    icon: MousePointer2,
    color: '#2196F3',
    description: 'Hover over element'
  },
  { 
    type: 'selectOption', 
    label: 'Select Option', 
    icon: ChevronDown,
    color: '#9C27B0',
    description: 'Select dropdown option'
  },
  { 
    type: 'checkBox', 
    label: 'Check Box', 
    icon: CheckSquare,
    color: '#4CAF50',
    description: 'Check/uncheck checkbox'
  },
  { 
    type: 'keyPress', 
    label: 'Key Press', 
    icon: Keyboard,
    color: '#607D8B',
    description: 'Press keyboard keys'
  },
  { 
    type: 'iframe', 
    label: 'Switch iframe', 
    icon: Frame,
    color: '#FF5722',
    description: 'Switch to iframe context'
  },
  { 
    type: 'download', 
    label: 'Download', 
    icon: Download,
    color: '#00BCD4',
    description: 'Download file'
  },
  { 
    type: 'uploadFile', 
    label: 'Upload File', 
    icon: Upload,
    color: '#FF9800',
    description: 'Upload file to input'
  },
  { 
    type: 'clearCookies', 
    label: 'Clear Cookies', 
    icon: Trash,
    color: '#F44336',
    description: 'Clear browser cookies'
  },
  { 
    type: 'setCookie', 
    label: 'Set Cookie', 
    icon: Cookie,
    color: '#795548',
    description: 'Set browser cookie'
  },
  { 
    type: 'alert', 
    label: 'Handle Alert', 
    icon: AlertTriangle,
    color: '#FF5722',
    description: 'Handle browser alerts'
  },
  { 
    type: 'regex', 
    label: 'Regex Extract', 
    icon: Regex,
    color: '#8B5CF6',
    description: 'Extract data using regular expressions'
  },
  { 
    type: 'extractUrls', 
    label: 'Extract URLs', 
    icon: ExternalLink,
    color: '#10B981',
    description: 'Extract all href attributes from anchor elements'
  }
];

export const NodePalette: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="node-palette">
      <h3>Actions</h3>
      <div className="node-list">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            className="node-item"
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            style={{ borderLeftColor: node.color }}
          >
            <node.icon size={20} color={node.color} />
            <div className="node-info">
              <span className="node-label">{node.label}</span>
              <span className="node-description">{node.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};