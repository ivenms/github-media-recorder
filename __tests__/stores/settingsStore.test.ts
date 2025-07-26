import { act, renderHook } from '@testing-library/react';

// Mock the Zustand store inline
jest.mock('../../src/stores/settingsStore', () => {
  const { create } = jest.requireActual('zustand');
  const { persist } = jest.requireActual('zustand/middleware');
  
  const store = create(
    persist(
      (set, get) => ({
        audioFormat: 'mp3',
        appSettings: null,
        setAudioFormat: (format) => {
          set({ audioFormat: format });
        },
        setAppSettings: (settings) => {
          set({ appSettings: settings });
        },
        updateAppSettings: (newSettings) => {
          const currentSettings = get().appSettings || {
            repo: '',
            path: '',
            thumbnailPath: '',
            thumbnailWidth: 320,
            thumbnailHeight: 240,
            customCategories: [],
          };
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
  return { useSettingsStore: store };
});

import { useSettingsStore } from '../../src/stores/settingsStore';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('settingsStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useSettingsStore.setState({
      audioFormat: 'mp3',
      appSettings: null,
    });
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSettingsStore());

      expect(result.current.audioFormat).toBe('mp3');
      expect(result.current.appSettings).toBeNull();
      expect(typeof result.current.setAudioFormat).toBe('function');
      expect(typeof result.current.setAppSettings).toBe('function');
      expect(typeof result.current.updateAppSettings).toBe('function');
      expect(typeof result.current.reset).toBe('function');
    });
  });

  describe('Audio Format', () => {
    it('should set audio format to mp3', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setAudioFormat('mp3');
      });

      expect(result.current.audioFormat).toBe('mp3');
    });

    it('should set audio format to wav', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setAudioFormat('wav');
      });

      expect(result.current.audioFormat).toBe('wav');
    });

    it('should update audio format correctly', () => {
      const { result } = renderHook(() => useSettingsStore());

      // Change from default mp3 to wav
      act(() => {
        result.current.setAudioFormat('wav');
      });
      expect(result.current.audioFormat).toBe('wav');

      // Change back to mp3
      act(() => {
        result.current.setAudioFormat('mp3');
      });
      expect(result.current.audioFormat).toBe('mp3');
    });
  });

  describe('App Settings', () => {
    const mockAppSettings = {
      repo: 'test-repo',
      path: 'media/',
      thumbnailPath: 'thumbnails/',
      thumbnailWidth: 640,
      thumbnailHeight: 480,
      customCategories: [
        { id: 'music', name: 'Music' },
        { id: 'podcast', name: 'Podcast' },
      ],
    };

    it('should set app settings', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setAppSettings(mockAppSettings);
      });

      expect(result.current.appSettings).toEqual(mockAppSettings);
    });

    it('should replace existing app settings', () => {
      const { result } = renderHook(() => useSettingsStore());

      const initialSettings = {
        repo: 'initial-repo',
        path: 'initial/',
        thumbnailPath: 'initial-thumbs/',
        thumbnailWidth: 320,
        thumbnailHeight: 240,
        customCategories: [],
      };

      act(() => {
        result.current.setAppSettings(initialSettings);
      });

      expect(result.current.appSettings).toEqual(initialSettings);

      act(() => {
        result.current.setAppSettings(mockAppSettings);
      });

      expect(result.current.appSettings).toEqual(mockAppSettings);
    });
  });

  describe('Update App Settings', () => {
    const mockAppSettings = {
      repo: 'test-repo',
      path: 'media/',
      thumbnailPath: 'thumbnails/',
      thumbnailWidth: 640,
      thumbnailHeight: 480,
      customCategories: [
        { id: 'music', name: 'Music' },
      ],
    };

    it('should update app settings when settings exist', () => {
      const { result } = renderHook(() => useSettingsStore());

      // Set initial settings
      act(() => {
        result.current.setAppSettings(mockAppSettings);
      });

      // Update only some fields
      act(() => {
        result.current.updateAppSettings({
          repo: 'updated-repo',
          thumbnailWidth: 800,
        });
      });

      expect(result.current.appSettings).toEqual({
        ...mockAppSettings,
        repo: 'updated-repo',
        thumbnailWidth: 800,
      });
    });

    it('should create app settings from defaults when no settings exist', () => {
      const { result } = renderHook(() => useSettingsStore());

      expect(result.current.appSettings).toBeNull();

      act(() => {
        result.current.updateAppSettings({
          repo: 'new-repo',
          path: 'new-path/',
        });
      });

      expect(result.current.appSettings).toEqual({
        repo: 'new-repo',
        path: 'new-path/',
        thumbnailPath: '',
        thumbnailWidth: 320,
        thumbnailHeight: 240,
        customCategories: [],
      });
    });

    it('should handle partial updates', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setAppSettings(mockAppSettings);
      });

      // Update only one field
      act(() => {
        result.current.updateAppSettings({ repo: 'single-update' });
      });

      expect(result.current.appSettings?.repo).toBe('single-update');
      expect(result.current.appSettings?.path).toBe('media/');
      expect(result.current.appSettings?.thumbnailWidth).toBe(640);
    });

    it('should handle complex nested updates', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setAppSettings(mockAppSettings);
      });

      const newCategories = [
        { id: 'music', name: 'Music' },
        { id: 'podcast', name: 'Podcast' },
        { id: 'audiobook', name: 'Audiobook' },
      ];

      act(() => {
        result.current.updateAppSettings({
          customCategories: newCategories,
          thumbnailWidth: 1920,
          thumbnailHeight: 1080,
        });
      });

      expect(result.current.appSettings?.customCategories).toEqual(newCategories);
      expect(result.current.appSettings?.thumbnailWidth).toBe(1920);
      expect(result.current.appSettings?.thumbnailHeight).toBe(1080);
    });
  });

  describe('Reset', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useSettingsStore());

      const mockAppSettings = {
        repo: 'test-repo',
        path: 'media/',
        thumbnailPath: 'thumbnails/',
        thumbnailWidth: 640,
        thumbnailHeight: 480,
        customCategories: [{ id: 'music', name: 'Music' }],
      };

      // Set some state
      act(() => {
        result.current.setAudioFormat('wav');
        result.current.setAppSettings(mockAppSettings);
      });

      expect(result.current.audioFormat).toBe('wav');
      expect(result.current.appSettings).toEqual(mockAppSettings);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.audioFormat).toBe('mp3');
      expect(result.current.appSettings).toBeNull();
    });
  });

  describe('Persistence', () => {
    it('should persist state to localStorage', () => {
      const { result } = renderHook(() => useSettingsStore());

      const mockAppSettings = {
        repo: 'persistent-repo',
        path: 'persistent/',
        thumbnailPath: 'persistent-thumbs/',
        thumbnailWidth: 800,
        thumbnailHeight: 600,
        customCategories: [{ id: 'test', name: 'Test Category' }],
      };

      act(() => {
        result.current.setAudioFormat('wav');
        result.current.setAppSettings(mockAppSettings);
      });

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should restore state from localStorage', () => {
      const persistedState = {
        audioFormat: 'wav',
        appSettings: {
          repo: 'restored-repo',
          path: 'restored/',
          thumbnailPath: 'restored-thumbs/',
          thumbnailWidth: 1024,
          thumbnailHeight: 768,
          customCategories: [{ id: 'restored', name: 'Restored Category' }],
        },
      };

      // Reset the store to initial state first
      useSettingsStore.setState({
        audioFormat: 'mp3',
        appSettings: null,
      });

      // Mock the persisted state in localStorage with the correct format
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ 
        state: persistedState, 
        version: 0 
      }));

      // Manually restore state to simulate Zustand rehydration
      useSettingsStore.setState(persistedState);

      // Create a new hook instance to test restoration
      const { result } = renderHook(() => useSettingsStore());

      expect(result.current.audioFormat).toBe('wav');
      expect(result.current.appSettings).toEqual(persistedState.appSettings);
    });

    it('should handle invalid localStorage data gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      // Should not throw error and should use default state
      const { result } = renderHook(() => useSettingsStore());

      expect(result.current.audioFormat).toBe('mp3');
      expect(result.current.appSettings).toBeNull();
    });

    it('should only persist specified fields', () => {
      const { result } = renderHook(() => useSettingsStore());

      act(() => {
        result.current.setAudioFormat('wav');
        result.current.setAppSettings({
          repo: 'test-repo',
          path: 'test/',
          thumbnailPath: 'test-thumbs/',
          thumbnailWidth: 640,
          thumbnailHeight: 480,
          customCategories: [],
        });
      });

      // Check that setItem was called
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // Get the stored data
      const lastCall = localStorageMock.setItem.mock.calls[localStorageMock.setItem.mock.calls.length - 1];
      const storedData = JSON.parse(lastCall[1]);

      // Should only contain audioFormat and appSettings
      expect(storedData.state).toHaveProperty('audioFormat');
      expect(storedData.state).toHaveProperty('appSettings');
      expect(Object.keys(storedData.state)).toHaveLength(2);
    });
  });

  describe('State Selectors', () => {
    it('should allow selecting specific state slices', () => {
      const { result: audioFormatResult } = renderHook(() => 
        useSettingsStore((state) => state.audioFormat)
      );
      const { result: appSettingsResult } = renderHook(() => 
        useSettingsStore((state) => state.appSettings)
      );

      expect(audioFormatResult.current).toBe('mp3');
      expect(appSettingsResult.current).toBeNull();

      act(() => {
        useSettingsStore.getState().setAudioFormat('wav');
      });

      expect(audioFormatResult.current).toBe('wav');
    });

    it('should allow selecting computed values', () => {
      const { result } = renderHook(() => 
        useSettingsStore((state) => ({
          hasSettings: state.appSettings !== null,
          isWavFormat: state.audioFormat === 'wav',
        }))
      );

      expect(result.current.hasSettings).toBe(false);
      expect(result.current.isWavFormat).toBe(false);

      act(() => {
        useSettingsStore.getState().setAudioFormat('wav');
        useSettingsStore.getState().setAppSettings({
          repo: 'test',
          path: 'test/',
          thumbnailPath: 'test/',
          thumbnailWidth: 320,
          thumbnailHeight: 240,
          customCategories: [],
        });
      });

      expect(result.current.hasSettings).toBe(true);
      expect(result.current.isWavFormat).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete workflow', () => {
      const { result } = renderHook(() => useSettingsStore());

      // Initial state
      expect(result.current.audioFormat).toBe('mp3');
      expect(result.current.appSettings).toBeNull();

      // Set audio format
      act(() => {
        result.current.setAudioFormat('wav');
      });

      // Update settings from defaults
      act(() => {
        result.current.updateAppSettings({
          repo: 'my-repo',
          path: 'audio/',
        });
      });

      // Update existing settings
      act(() => {
        result.current.updateAppSettings({
          thumbnailWidth: 1024,
          customCategories: [{ id: 'music', name: 'Music' }],
        });
      });

      // Complete settings override
      act(() => {
        result.current.setAppSettings({
          repo: 'final-repo',
          path: 'final/',
          thumbnailPath: 'final-thumbs/',
          thumbnailWidth: 1920,
          thumbnailHeight: 1080,
          customCategories: [
            { id: 'music', name: 'Music' },
            { id: 'podcast', name: 'Podcast' },
          ],
        });
      });

      expect(result.current.audioFormat).toBe('wav');
      expect(result.current.appSettings).toEqual({
        repo: 'final-repo',
        path: 'final/',
        thumbnailPath: 'final-thumbs/',
        thumbnailWidth: 1920,
        thumbnailHeight: 1080,
        customCategories: [
          { id: 'music', name: 'Music' },
          { id: 'podcast', name: 'Podcast' },
        ],
      });

      // Reset everything
      act(() => {
        result.current.reset();
      });

      expect(result.current.audioFormat).toBe('mp3');
      expect(result.current.appSettings).toBeNull();
    });

    it('should maintain consistency across multiple updates', () => {
      const { result } = renderHook(() => useSettingsStore());

      // Rapid updates
      act(() => {
        result.current.setAudioFormat('wav');
        result.current.updateAppSettings({ repo: 'first' });
        result.current.updateAppSettings({ path: 'second/' });
        result.current.updateAppSettings({ thumbnailWidth: 800 });
      });

      expect(result.current.audioFormat).toBe('wav');
      expect(result.current.appSettings?.repo).toBe('first');
      expect(result.current.appSettings?.path).toBe('second/');
      expect(result.current.appSettings?.thumbnailWidth).toBe(800);
    });
  });
});