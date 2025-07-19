import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>({
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