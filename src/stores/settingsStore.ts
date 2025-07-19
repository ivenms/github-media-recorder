import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '../types';

interface SettingsState {
  // App settings
  audioFormat: 'mp3' | 'wav';
  appSettings: AppSettings | null;

  // Actions
  setAudioFormat: (format: 'mp3' | 'wav') => void;
  setAppSettings: (settings: AppSettings) => void;
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  reset: () => void;
}

const defaultAppSettings: AppSettings = {
  repo: '',
  path: '',
  thumbnailPath: '',
  thumbnailWidth: 320,
  thumbnailHeight: 240,
  customCategories: [],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      audioFormat: 'mp3',
      appSettings: null,

      setAudioFormat: (format: 'mp3' | 'wav') => {
        set({ audioFormat: format });
      },

      setAppSettings: (settings: AppSettings) => {
        set({ appSettings: settings });
      },

      updateAppSettings: (newSettings: Partial<AppSettings>) => {
        const currentSettings = get().appSettings || defaultAppSettings;
        set({
          appSettings: { ...currentSettings, ...newSettings },
        });
      },

      reset: () => {
        set({
          audioFormat: 'mp3',
          appSettings: null,
        });
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        audioFormat: state.audioFormat,
        appSettings: state.appSettings,
      }),
    }
  )
);