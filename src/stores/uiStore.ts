import { create } from 'zustand';
import type { Screen, UIState } from '../types';

export const useUIStore = create<UIState>((set, get) => ({
  currentScreen: 'audio',
  previousScreen: null,
  highlightFileId: undefined,

  modal: {
    isOpen: false,
    type: null,
  },

  isUploading: false,
  isProcessing: false,

  setScreen: (screen: Screen, highlightId?: string) => {
    const currentScreen = get().currentScreen;
    set({
      previousScreen: currentScreen,
      currentScreen: screen,
      highlightFileId: highlightId,
    });
  },

  goBack: () => {
    const { previousScreen } = get();
    if (previousScreen) {
      set({
        currentScreen: previousScreen,
        previousScreen: null,
        highlightFileId: undefined,
      });
    }
  },

  openModal: (modalConfig: Partial<UIState['modal']>) => {
    set({
      modal: {
        isOpen: true,
        type: null,
        ...modalConfig,
      },
    });
  },

  closeModal: () => {
    set({
      modal: {
        isOpen: false,
        type: null,
      },
    });
  },

  setUploading: (uploading: boolean) => {
    set({ isUploading: uploading });
  },

  setProcessing: (processing: boolean) => {
    set({ isProcessing: processing });
  },

  reset: () => {
    set({
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
  },
}));