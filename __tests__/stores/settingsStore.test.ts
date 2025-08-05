import { act, renderHook } from '@testing-library/react';
import { useSettingsStore } from '../../src/stores/settingsStore';
import type { AppSettings } from '../../src/types';

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
    const mockAppSettings: AppSettings = {
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

      const initialSettings: AppSettings = {
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
    const mockAppSettings: AppSettings = {
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

      const mockAppSettings: AppSettings = {
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

  describe('Default Settings Values', () => {
    it('should use correct default values in updateAppSettings', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.updateAppSettings({ repo: 'test-repo' });
      });

      expect(result.current.appSettings).toEqual({
        repo: 'test-repo',
        path: '',
        thumbnailPath: '',
        thumbnailWidth: 320,
        thumbnailHeight: 240,
        customCategories: [],
      });
    });

    it('should preserve existing settings when updating', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      const initialSettings: AppSettings = {
        repo: 'original-repo',
        path: 'original-path/',
        thumbnailPath: 'original-thumbs/',
        thumbnailWidth: 640,
        thumbnailHeight: 480,
        customCategories: [{ id: 'test', name: 'Test' }],
      };

      act(() => {
        result.current.setAppSettings(initialSettings);
      });

      act(() => {
        result.current.updateAppSettings({ repo: 'updated-repo' });
      });

      expect(result.current.appSettings).toEqual({
        ...initialSettings,
        repo: 'updated-repo',
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty updateAppSettings call', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.updateAppSettings({});
      });

      expect(result.current.appSettings).toEqual({
        repo: '',
        path: '',
        thumbnailPath: '',
        thumbnailWidth: 320,
        thumbnailHeight: 240,
        customCategories: [],
      });
    });

    it('should handle undefined values in updateAppSettings', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.updateAppSettings({
          repo: 'test',
          path: undefined,
        });
      });

      expect(result.current.appSettings?.repo).toBe('test');
      expect(result.current.appSettings?.path).toBeUndefined();
    });

    it('should handle multiple consecutive updates', () => {
      const { result } = renderHook(() => useSettingsStore());
      
      act(() => {
        result.current.updateAppSettings({ repo: 'first' });
        result.current.updateAppSettings({ path: 'second/' });
        result.current.updateAppSettings({ thumbnailWidth: 800 });
      });

      expect(result.current.appSettings).toEqual({
        repo: 'first',
        path: 'second/',
        thumbnailPath: '',
        thumbnailWidth: 800,
        thumbnailHeight: 240,
        customCategories: [],
      });
    });
  });
});