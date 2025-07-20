import React from 'react';
import type { ModalProps } from '../types';

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'alert',
  confirmText = 'OK',
  cancelText = 'Cancel',
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  // Get styling based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconColor: 'text-green-600',
          buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
        };
      case 'error':
        return {
          icon: '✕',
          iconColor: 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
        };
      default:
        return {
          icon: null,
          iconColor: '',
          buttonColor: 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
        };
    }
  };

  const typeStyles = getTypeStyles();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-modal">
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        
        {/* Body */}
        <div className="px-6 py-4">
          <div className="flex items-start gap-3">
            {typeStyles.icon && (
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold ${
                type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <span className={typeStyles.iconColor}>{typeStyles.icon}</span>
              </div>
            )}
            <p className="text-gray-700 leading-relaxed flex-1">{message}</p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3">
          {type === 'confirm' && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 text-white rounded-md transition-colors focus:outline-none focus:ring-2 ${typeStyles.buttonColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;