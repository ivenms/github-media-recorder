import { renderHook, act } from '@testing-library/react';
import { useUIStore } from '../../src/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      currentScreen: 'audio',
      previousScreen: null,
      highlightFileId: undefined,
      modal: {
        isOpen: false,
        type: null,
      },
      isUploading: false,
      isProcessing: false,
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.currentScreen).toBe('audio');
      expect(result.current.previousScreen).toBeNull();
      expect(result.current.highlightFileId).toBeUndefined();
      expect(result.current.modal).toEqual({
        isOpen: false,
        type: null,
      });
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isProcessing).toBe(false);
      expect(typeof result.current.setScreen).toBe('function');
      expect(typeof result.current.goBack).toBe('function');
      expect(typeof result.current.openModal).toBe('function');
      expect(typeof result.current.closeModal).toBe('function');
      expect(typeof result.current.setUploading).toBe('function');
      expect(typeof result.current.setProcessing).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Screen Navigation', () => {
    it('should set current screen', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setScreen('video');
      });

      expect(result.current.currentScreen).toBe('video');
      expect(result.current.previousScreen).toBe('audio');
      expect(result.current.highlightFileId).toBeUndefined();
    });

    it('should set screen with highlight file ID', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setScreen('library', 'file-123');
      });

      expect(result.current.currentScreen).toBe('library');
      expect(result.current.previousScreen).toBe('audio');
      expect(result.current.highlightFileId).toBe('file-123');
    });

    it('should track previous screen correctly', () => {
      const { result } = renderHook(() => useUIStore());

      // Navigate from audio to video
      act(() => {
        result.current.setScreen('video');
      });

      expect(result.current.currentScreen).toBe('video');
      expect(result.current.previousScreen).toBe('audio');

      // Navigate from video to library
      act(() => {
        result.current.setScreen('library');
      });

      expect(result.current.currentScreen).toBe('library');
      expect(result.current.previousScreen).toBe('video');
    });

    it('should go back to previous screen', () => {
      const { result } = renderHook(() => useUIStore());

      // Navigate to video screen
      act(() => {
        result.current.setScreen('video');
      });

      expect(result.current.currentScreen).toBe('video');
      expect(result.current.previousScreen).toBe('audio');

      // Go back
      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentScreen).toBe('audio');
      expect(result.current.previousScreen).toBeNull();
      expect(result.current.highlightFileId).toBeUndefined();
    });

    it('should handle goBack when no previous screen exists', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.previousScreen).toBeNull();

      act(() => {
        result.current.goBack();
      });

      // Should remain on current screen
      expect(result.current.currentScreen).toBe('audio');
      expect(result.current.previousScreen).toBeNull();
    });

    it('should navigate through multiple screens', () => {
      const { result } = renderHook(() => useUIStore());

      // audio -> video
      act(() => {
        result.current.setScreen('video');
      });

      // video -> library
      act(() => {
        result.current.setScreen('library', 'highlight-123');
      });

      // library -> settings
      act(() => {
        result.current.setScreen('settings');
      });

      expect(result.current.currentScreen).toBe('settings');
      expect(result.current.previousScreen).toBe('library');
      expect(result.current.highlightFileId).toBeUndefined();

      // Go back to library
      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentScreen).toBe('library');
      expect(result.current.previousScreen).toBeNull();
    });
  });

  describe('Modal Management', () => {
    it('should open modal with basic config', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal({
          type: 'alert',
          title: 'Test Alert',
          message: 'This is a test message',
        });
      });

      expect(result.current.modal).toEqual({
        isOpen: true,
        type: 'alert',
        title: 'Test Alert',
        message: 'This is a test message',
      });
    });

    it('should open modal with confirm type', () => {
      const { result } = renderHook(() => useUIStore());

      const onConfirm = jest.fn();

      act(() => {
        result.current.openModal({
          type: 'confirm',
          title: 'Confirm Action',
          message: 'Are you sure?',
          confirmText: 'Yes',
          cancelText: 'No',
          onConfirm,
        });
      });

      expect(result.current.modal).toEqual({
        isOpen: true,
        type: 'confirm',
        title: 'Confirm Action',
        message: 'Are you sure?',
        confirmText: 'Yes',
        cancelText: 'No',
        onConfirm,
      });
    });

    it('should close modal', () => {
      const { result } = renderHook(() => useUIStore());

      // First open a modal
      act(() => {
        result.current.openModal({
          type: 'alert',
          title: 'Test',
          message: 'Test message',
        });
      });

      expect(result.current.modal.isOpen).toBe(true);

      // Close the modal
      act(() => {
        result.current.closeModal();
      });

      expect(result.current.modal).toEqual({
        isOpen: false,
        type: null,
      });
    });

    it('should override existing modal when opening new one', () => {
      const { result } = renderHook(() => useUIStore());

      // Open first modal
      act(() => {
        result.current.openModal({
          type: 'alert',
          title: 'First Modal',
          message: 'First message',
        });
      });

      expect(result.current.modal.title).toBe('First Modal');

      // Open second modal
      act(() => {
        result.current.openModal({
          type: 'confirm',
          title: 'Second Modal',
          message: 'Second message',
        });
      });

      expect(result.current.modal).toEqual({
        isOpen: true,
        type: 'confirm',
        title: 'Second Modal',
        message: 'Second message',
      });
    });

    it('should handle partial modal config', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal({
          title: 'Only Title',
        });
      });

      expect(result.current.modal).toEqual({
        isOpen: true,
        type: null,
        title: 'Only Title',
      });
    });
  });

  describe('Loading States', () => {
    it('should set uploading state', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.isUploading).toBe(false);

      act(() => {
        result.current.setUploading(true);
      });

      expect(result.current.isUploading).toBe(true);

      act(() => {
        result.current.setUploading(false);
      });

      expect(result.current.isUploading).toBe(false);
    });

    it('should set processing state', () => {
      const { result } = renderHook(() => useUIStore());

      expect(result.current.isProcessing).toBe(false);

      act(() => {
        result.current.setProcessing(true);
      });

      expect(result.current.isProcessing).toBe(true);

      act(() => {
        result.current.setProcessing(false);
      });

      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle both loading states independently', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setUploading(true);
      });

      expect(result.current.isUploading).toBe(true);
      expect(result.current.isProcessing).toBe(false);

      act(() => {
        result.current.setProcessing(true);
      });

      expect(result.current.isUploading).toBe(true);
      expect(result.current.isProcessing).toBe(true);

      act(() => {
        result.current.setUploading(false);
      });

      expect(result.current.isUploading).toBe(false);
      expect(result.current.isProcessing).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset all state to initial values', () => {
      const { result } = renderHook(() => useUIStore());

      // Set various state
      act(() => {
        result.current.setScreen('library', 'file-123');
        result.current.openModal({
          type: 'alert',
          title: 'Test Modal',
          message: 'Test message',
        });
        result.current.setUploading(true);
        result.current.setProcessing(true);
      });

      // Verify state has changed
      expect(result.current.currentScreen).toBe('library');
      expect(result.current.highlightFileId).toBe('file-123');
      expect(result.current.modal.isOpen).toBe(true);
      expect(result.current.isUploading).toBe(true);
      expect(result.current.isProcessing).toBe(true);

      // Reset
      act(() => {
        result.current.reset();
      });

      // Verify all state is reset
      expect(result.current.currentScreen).toBe('audio');
      expect(result.current.previousScreen).toBeNull();
      expect(result.current.highlightFileId).toBeUndefined();
      expect(result.current.modal).toEqual({
        isOpen: false,
        type: null,
      });
      expect(result.current.isUploading).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const { result: screenResult } = renderHook(() => 
        useUIStore((state) => state.currentScreen)
      );
      const { result: modalResult } = renderHook(() => 
        useUIStore((state) => state.modal)
      );

      expect(screenResult.current).toBe('audio');
      expect(modalResult.current.isOpen).toBe(false);

      act(() => {
        useUIStore.getState().setScreen('video');
        useUIStore.getState().openModal({ type: 'alert', title: 'Test' });
      });

      expect(screenResult.current).toBe('video');
      expect(modalResult.current.isOpen).toBe(true);
    });

    it('should allow selecting computed values', () => {
      const { result } = renderHook(() => 
        useUIStore((state) => ({
          hasModal: state.modal.isOpen,
          isLoading: state.isUploading || state.isProcessing,
          canGoBack: state.previousScreen !== null,
        }))
      );

      expect(result.current.hasModal).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.canGoBack).toBe(false);

      act(() => {
        useUIStore.getState().setScreen('video');
        useUIStore.getState().openModal({ type: 'alert' });
        useUIStore.getState().setUploading(true);
      });

      expect(result.current.hasModal).toBe(true);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.canGoBack).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow', () => {
      const { result } = renderHook(() => useUIStore());

      // Navigate to video screen
      act(() => {
        result.current.setScreen('video');
      });

      // Start processing
      act(() => {
        result.current.setProcessing(true);
      });

      // Show modal during processing
      act(() => {
        result.current.openModal({
          type: 'alert',
          title: 'Processing',
          message: 'Please wait...',
        });
      });

      expect(result.current.currentScreen).toBe('video');
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.modal.isOpen).toBe(true);

      // Close modal and finish processing
      act(() => {
        result.current.closeModal();
        result.current.setProcessing(false);
      });

      // Navigate to library with file highlight
      act(() => {
        result.current.setScreen('library', 'new-file-123');
      });

      expect(result.current.currentScreen).toBe('library');
      expect(result.current.highlightFileId).toBe('new-file-123');
      expect(result.current.modal.isOpen).toBe(false);
      expect(result.current.isProcessing).toBe(false);

      // Go back to video
      act(() => {
        result.current.goBack();
      });

      expect(result.current.currentScreen).toBe('video');
      expect(result.current.highlightFileId).toBeUndefined();
    });

    it('should maintain state consistency across rapid updates', () => {
      const { result } = renderHook(() => useUIStore());

      // Rapid state changes
      act(() => {
        result.current.setScreen('video');
        result.current.setUploading(true);
        result.current.openModal({ type: 'alert', title: 'First' });
        result.current.setProcessing(true);
        result.current.openModal({ type: 'confirm', title: 'Second' });
        result.current.setScreen('library', 'rapid-file');
      });

      expect(result.current.currentScreen).toBe('library');
      expect(result.current.previousScreen).toBe('video');
      expect(result.current.highlightFileId).toBe('rapid-file');
      expect(result.current.modal.title).toBe('Second');
      expect(result.current.modal.type).toBe('confirm');
      expect(result.current.isUploading).toBe(true);
      expect(result.current.isProcessing).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined highlight file ID', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setScreen('library', undefined);
      });

      expect(result.current.currentScreen).toBe('library');
      expect(result.current.highlightFileId).toBeUndefined();
    });

    it('should handle empty modal config', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.openModal({});
      });

      expect(result.current.modal).toEqual({
        isOpen: true,
        type: null,
      });
    });

    it('should handle multiple resets', () => {
      const { result } = renderHook(() => useUIStore());

      // Set some state
      act(() => {
        result.current.setScreen('video');
        result.current.setUploading(true);
      });

      // Reset multiple times
      act(() => {
        result.current.reset();
        result.current.reset();
        result.current.reset();
      });

      expect(result.current.currentScreen).toBe('audio');
      expect(result.current.isUploading).toBe(false);
    });

    it('should handle navigation with same screen', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.setScreen('audio', 'file-1');
      });

      expect(result.current.currentScreen).toBe('audio');
      expect(result.current.previousScreen).toBe('audio');
      expect(result.current.highlightFileId).toBe('file-1');

      act(() => {
        result.current.setScreen('audio', 'file-2');
      });

      expect(result.current.currentScreen).toBe('audio');
      expect(result.current.previousScreen).toBe('audio');
      expect(result.current.highlightFileId).toBe('file-2');
    });
  });
});