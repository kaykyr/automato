import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';
import './Dialog.css';

export type DialogType = 'confirm' | 'warning' | 'error' | 'info' | 'success';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

const icons = {
  confirm: AlertTriangle,
  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  success: CheckCircle,
};

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'confirm',
  confirmText,
  cancelText,
  showCancel = true,
}) => {
  const { t } = useTranslation();
  const Icon = icons[type];
  
  const defaultConfirmText = confirmText || t('common.ok');
  const defaultCancelText = cancelText || t('common.cancel');

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="small"
      showCloseButton={false}
      closeOnOverlayClick={false}
    >
      <div className="dialog-content">
        <div className={`dialog-icon dialog-icon-${type}`}>
          <Icon size={24} />
        </div>
        <div className="dialog-body">
          <h3 className="dialog-title">
            {title}
          </h3>
          <p className="dialog-message">
            {message}
          </p>
        </div>
      </div>
      
      <div className="dialog-actions">
        {showCancel && (
          <button 
            className="dialog-btn dialog-btn-secondary"
            onClick={onClose}
          >
            {defaultCancelText}
          </button>
        )}
        <button 
          className={`dialog-btn dialog-btn-${type === 'error' || type === 'warning' ? 'danger' : 'primary'}`}
          onClick={handleConfirm}
        >
          {defaultConfirmText}
        </button>
      </div>
    </Modal>
  );
};