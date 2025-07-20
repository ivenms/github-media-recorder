import { useState, useCallback } from 'react';
import type { UseModalState } from '../types';

export function useModal() {
  const [modalState, setModalState] = useState<UseModalState>({
    isOpen: false,
    message: '',
    type: 'alert',
  });

  const showAlert = useCallback((message: string, title?: string) => {
    setModalState({
      isOpen: true,
      message,
      title,
      type: 'alert',
      confirmText: 'OK',
    });
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