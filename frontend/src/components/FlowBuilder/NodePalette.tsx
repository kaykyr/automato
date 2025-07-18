import React from 'react';
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
  ExternalLink
} from 'lucide-react';
import './NodePalette.css';


export const NodePalette: React.FC = () => {
  const { t } = useTranslation();
  
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeTypes = [
    { 
      type: 'navigate', 
      label: t('flow.nodeTypes.navigate.label'), 
      icon: Navigation,
      color: '#4CAF50',
      description: t('flow.nodeTypes.navigate.description')
    },
    { 
      type: 'click', 
      label: t('flow.nodeTypes.click.label'), 
      icon: MousePointer,
      color: '#2196F3',
      description: t('flow.nodeTypes.click.description')
    },
    { 
      type: 'type', 
      label: t('flow.nodeTypes.type.label'), 
      icon: Type,
      color: '#9C27B0',
      description: t('flow.nodeTypes.type.description')
    },
    { 
      type: 'waitFor', 
      label: t('flow.nodeTypes.waitFor.label'), 
      icon: Clock,
      color: '#FF9800',
      description: t('flow.nodeTypes.waitFor.description')
    },
    { 
      type: 'scroll', 
      label: t('flow.nodeTypes.scroll.label'), 
      icon: Move,
      color: '#00BCD4',
      description: t('flow.nodeTypes.scroll.description')
    },
    { 
      type: 'extractText', 
      label: t('flow.nodeTypes.extractText.label'), 
      icon: FileText,
      color: '#4CAF50',
      description: t('flow.nodeTypes.extractText.description')
    },
    { 
      type: 'extractHtml', 
      label: t('flow.nodeTypes.extractHtml.label'), 
      icon: Code,
      color: '#E91E63',
      description: t('flow.nodeTypes.extractHtml.description')
    },
    { 
      type: 'screenshot', 
      label: t('flow.nodeTypes.screenshot.label'), 
      icon: Camera,
      color: '#795548',
      description: t('flow.nodeTypes.screenshot.description')
    },
    { 
      type: 'condition', 
      label: t('flow.nodeTypes.condition.label'), 
      icon: GitBranch,
      color: '#607D8B',
      description: t('flow.nodeTypes.condition.description')
    },
    { 
      type: 'loop', 
      label: t('flow.nodeTypes.loop.label'), 
      icon: Repeat,
      color: '#F44336',
      description: t('flow.nodeTypes.loop.description')
    },
    { 
      type: 'setVariable', 
      label: t('flow.nodeTypes.setVariable.label'), 
      icon: Variable,
      color: '#3F51B5',
      description: t('flow.nodeTypes.setVariable.description')
    },
    { 
      type: 'api', 
      label: t('flow.nodeTypes.api.label'), 
      icon: Globe,
      color: '#009688',
      description: t('flow.nodeTypes.api.description')
    },
    { 
      type: 'isVisible', 
      label: t('flow.nodeTypes.isVisible.label'), 
      icon: Eye,
      color: '#FF5722',
      description: t('flow.nodeTypes.isVisible.description')
    },
    { 
      type: 'waitTime', 
      label: t('flow.nodeTypes.waitTime.label'), 
      icon: Timer,
      color: '#FF9800',
      description: t('flow.nodeTypes.waitTime.description')
    },
    { 
      type: 'extractAttribute', 
      label: t('flow.nodeTypes.extractAttribute.label'), 
      icon: Link,
      color: '#4CAF50',
      description: t('flow.nodeTypes.extractAttribute.description')
    },
    { 
      type: 'hover', 
      label: t('flow.nodeTypes.hover.label'), 
      icon: MousePointer2,
      color: '#2196F3',
      description: t('flow.nodeTypes.hover.description')
    },
    { 
      type: 'selectOption', 
      label: t('flow.nodeTypes.selectOption.label'), 
      icon: ChevronDown,
      color: '#9C27B0',
      description: t('flow.nodeTypes.selectOption.description')
    },
    { 
      type: 'checkBox', 
      label: t('flow.nodeTypes.checkBox.label'), 
      icon: CheckSquare,
      color: '#4CAF50',
      description: t('flow.nodeTypes.checkBox.description')
    },
    { 
      type: 'keyPress', 
      label: t('flow.nodeTypes.keyPress.label'), 
      icon: Keyboard,
      color: '#607D8B',
      description: t('flow.nodeTypes.keyPress.description')
    },
    { 
      type: 'iframe', 
      label: t('flow.nodeTypes.iframe.label'), 
      icon: Frame,
      color: '#FF5722',
      description: t('flow.nodeTypes.iframe.description')
    },
    { 
      type: 'download', 
      label: t('flow.nodeTypes.download.label'), 
      icon: Download,
      color: '#00BCD4',
      description: t('flow.nodeTypes.download.description')
    },
    { 
      type: 'uploadFile', 
      label: t('flow.nodeTypes.uploadFile.label'), 
      icon: Upload,
      color: '#FF9800',
      description: t('flow.nodeTypes.uploadFile.description')
    },
    { 
      type: 'clearCookies', 
      label: t('flow.nodeTypes.clearCookies.label'), 
      icon: Trash,
      color: '#F44336',
      description: t('flow.nodeTypes.clearCookies.description')
    },
    { 
      type: 'setCookie', 
      label: t('flow.nodeTypes.setCookie.label'), 
      icon: Cookie,
      color: '#795548',
      description: t('flow.nodeTypes.setCookie.description')
    },
    { 
      type: 'alert', 
      label: t('flow.nodeTypes.alert.label'), 
      icon: AlertTriangle,
      color: '#FF5722',
      description: t('flow.nodeTypes.alert.description')
    },
    { 
      type: 'regex', 
      label: t('flow.nodeTypes.regex.label'), 
      icon: Regex,
      color: '#8B5CF6',
      description: t('flow.nodeTypes.regex.description')
    },
    { 
      type: 'extractUrls', 
      label: t('flow.nodeTypes.extractUrls.label'), 
      icon: ExternalLink,
      color: '#10B981',
      description: t('flow.nodeTypes.extractUrls.description')
    }
  ];

  return (
    <div className="node-palette">
      <h3>{t('flow.actions.title')}</h3>
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