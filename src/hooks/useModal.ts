import { useState, useCallback } from 'react';
import type { UseModalState, ShowAlertOptions } from '../types';

export function useModal() {
  const [modalState, setModalState] = useState<UseModalState>({
    isOpen: false,
    message: '',
    type: 'alert',
  });

  const showAlert = useCallback((options: ShowAlertOptions | string, title?: string) => {
    if (typeof options === 'string') {
      // Backward compatibility - string message
      setModalState({
        isOpen: true,
        message: options,
        title,
        type: 'alert',
        confirmText: 'OK',
      });
    } else {
      // New object-based interface
      setModalState({
        isOpen: true,
        message: options.message,
        title: options.title,
        type: options.type || 'alert',
        confirmText: options.confirmText || 'OK',
        onConfirm: options.onConfirm,
      });
    }
  }, []);

  const showConfirm = useCallback((
    message: string,
    onConfirm: () => void,
    title?: string,
    confirmText: string = 'Yes',
    cancelText: string = 'Cancel'
  ) => {
    setModalState({
      isOpen: true,
      message,
      title,
      type: 'confirm',
      confirmText,
      cancelText,
      onConfirm,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    modalState,
    showAlert,
    showConfirm,
    closeModal,
  };
}