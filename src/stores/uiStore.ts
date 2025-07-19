import { create } from 'zustand';

type Screen = 'audio' | 'video' | 'library' | 'settings';

interface UIState {
  // Navigation state
  currentScreen: Screen;
  previousScreen: Screen | null;
  highlightFileId?: string;

  // Modal state
  modal: {
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'edit' | null;
    title?: string;
    message?: string;
    data?: unknown;
    onConfirm?: () => void;
    onCancel?: () => void;
  };

  // Loading states
  isUploading: boolean;
  isProcessing: boolean;

  // Actions
  setScreen: (screen: Screen, highlightId?: string) => void;
  goBack: () => void;
  openModal: (modal: Partial<UIState['modal']>) => void;
  closeModal: () => void;
  setUploading: (uploading: boolean) => void;
  setProcessing: (processing: boolean) => void;
  reset: () => void;
}

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