import { useState, useCallback } from 'react';
import { DialogType } from '../components/common/Dialog';

interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  type: DialogType;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
}

const initialState: DialogState = {
  isOpen: false,
  title: '',
  message: '',
  type: 'confirm',
  showCancel: true,
};

export const useDialog = () => {
  const [dialogState, setDialogState] = useState<DialogState>(initialState);

  const showDialog = useCallback((options: Omit<DialogState, 'isOpen'>) => {
    setDialogState({
      ...options,
      isOpen: true,
    });
  }, []);

  const hideDialog = useCallback(() => {
    setDialogState(initialState);
  }, []);

  const confirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    showDialog({
      title,
      message,
      type: 'confirm',
      onConfirm,
      showCancel: true,
    });
  }, [showDialog]);

  const alert = useCallback((title: string, message: string, type: DialogType = 'info') => {
    showDialog({
      title,
      message,
      type,
      showCancel: false,
      confirmText: 'OK',
    });
  }, [showDialog]);

  return {
    dialogState,
    showDialog,
    hideDialog,
    confirm,
    alert,
  };
};