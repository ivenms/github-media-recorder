import {
  getStandaloneStatus,
  requireStandaloneMode,
  debugStandaloneStatus,
} from '../../src/utils/standalone';

// Mock getMobilePlatform
jest.mock('../../src/utils/device', () => ({
  getMobilePlatform: jest.fn(() => null),
}));

// Mock console methods to prevent spam during tests
global.console.log = jest.fn();
global.console.group = jest.fn();
global.console.table = jest.fn();
global.console.groupEnd = jest.fn();

// Mock window.matchMedia
const mockMatchMedia = jest.fn();
if (typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    value: mockMatchMedia,
    configurable: true,
  });
} else {
  window.matchMedia = mockMatchMedia;
}

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
});

// Mock navigator
const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  standalone: undefined,
};
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  configurable: true,
});

// Mock document - use a more specific approach
const mockDocument = {
  referrer: '',
};
// Don't redefine document, just mock the specific property we need
Object.defineProperty(document, 'referrer', {
  value: mockDocument.referrer,
  configurable: true,
  writable: true,
});

// Store original location for restoration
const originalLocation = window.location;

describe('standalone utilities', () => {
  let mockGetMobilePlatform: jest.MockedFunction<() => string | null>;
  
  beforeAll(() => {
    // Use a simple object assignment approach - this is the most compatible approach
    // @ts-expect-error - Replacing window.location for testing
    window.location = {
      href: 'https://app.example.com',
      search: '',
      hostname: 'app.example.com',
      pathname: '/',
      protocol: 'https:',
      port: '',
      hash: '',
      origin: 'https://app.example.com',
    };
  });

  afterAll(() => {
    // Restore original location
    window.location = originalLocation;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mocked function
    mockGetMobilePlatform = require('../../src/utils/device').getMobilePlatform;
    
    // Reset mocks to default values
    mockGetMobilePlatform.mockReturnValue(null);
    mockLocalStorage.getItem.mockReturnValue(null);
    mockMatchMedia.mockReturnValue({ matches: false });
    mockNavigator.standalone = undefined;
    Object.defineProperty(document, 'referrer', { value: '', configurable: true, writable: true });
    
    // Reset mock location
    (window.location as any).search = '';
    (window.location as any).href = 'https://app.example.com';
    window.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
  });

  describe('getStandaloneStatus', () => {
    describe('basic functionality', () => {
      it('returns default status for desktop browsers', () => {
        mockGetMobilePlatform.mockReturnValue(null);
        mockMatchMedia.mockReturnValue({ matches: false });
        mockLocalStorage.getItem.mockReturnValue(null);

        const result = getStandaloneStatus();

        expect(result).toEqual({
          isStandalone: false,
          isStandaloneMedia: false,
          isIOSStandalone: false,
          isAndroidStandalone: false,
          isInPWAContext: false,
          wasInstalled: false,
        });
      });

      it('detects standalone mode via media query', () => {
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
        }));

        const result = getStandaloneStatus();

        expect(result.isStandaloneMedia).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('detects previously installed PWA via localStorage', () => {
        mockLocalStorage.getItem.mockImplementation((key) => 
          key === 'pwa-installed' ? 'true' : null
        );

        const result = getStandaloneStatus();

        expect(result.wasInstalled).toBe(true);
        expect(result.isStandalone).toBe(true);
      });
    });

    describe('iOS detection', () => {
      it('detects iOS standalone mode with Safari', () => {
        mockGetMobilePlatform.mockReturnValue('ios-safari');
        mockNavigator.standalone = true;

        const result = getStandaloneStatus();

        expect(result.isIOSStandalone).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('does not detect iOS standalone when not in standalone mode', () => {
        mockGetMobilePlatform.mockReturnValue('ios-safari');
        mockNavigator.standalone = false;

        const result = getStandaloneStatus();

        expect(result.isIOSStandalone).toBe(false);
      });

      it('does not detect iOS standalone for non-Safari iOS browsers', () => {
        mockGetMobilePlatform.mockReturnValue('ios-chrome');
        mockNavigator.standalone = true;

        const result = getStandaloneStatus();

        expect(result.isIOSStandalone).toBe(false);
      });

      it('handles missing navigator.standalone property', () => {
        mockGetMobilePlatform.mockReturnValue('ios-safari');
        delete mockNavigator.standalone;

        const result = getStandaloneStatus();

        expect(result.isIOSStandalone).toBe(false);
      });
    });

    describe('Android detection', () => {
      it('detects Android standalone mode with display-mode standalone', () => {
        mockGetMobilePlatform.mockReturnValue('android');
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
        }));

        const result = getStandaloneStatus();

        expect(result.isAndroidStandalone).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('detects Android standalone mode with display-mode fullscreen', () => {
        mockGetMobilePlatform.mockReturnValue('android');
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: fullscreen)',
        }));

        const result = getStandaloneStatus();

        expect(result.isAndroidStandalone).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('detects Android standalone mode with display-mode minimal-ui', () => {
        mockGetMobilePlatform.mockReturnValue('android');
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: minimal-ui)',
        }));

        const result = getStandaloneStatus();

        expect(result.isAndroidStandalone).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('does not detect Android standalone without display mode', () => {
        mockGetMobilePlatform.mockReturnValue('android');
        mockMatchMedia.mockReturnValue({ matches: false });

        const result = getStandaloneStatus();

        expect(result.isAndroidStandalone).toBe(false);
      });

      it('does not detect Android standalone for non-Android platforms', () => {
        mockGetMobilePlatform.mockReturnValue('ios-safari');
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
        }));

        const result = getStandaloneStatus();

        expect(result.isAndroidStandalone).toBe(false);
      });
    });

    describe('PWA context detection', () => {
      it('detects PWA context via android-app referrer', () => {
        Object.defineProperty(document, 'referrer', {
          value: 'android-app://com.example.app',
          configurable: true,
          writable: true,
        });

        const result = getStandaloneStatus();

        expect(result.isInPWAContext).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('detects PWA context via Android WebView with display mode', () => {
        mockGetMobilePlatform.mockReturnValue('android');
        mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.105 Mobile Safari/537.36 wv';
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
        }));

        const result = getStandaloneStatus();

        expect(result.isInPWAContext).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('does not detect PWA context via WebView without display mode', () => {
        mockGetMobilePlatform.mockReturnValue('android');
        mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.105 Mobile Safari/537.36 wv';
        mockMatchMedia.mockReturnValue({ matches: false });

        const result = getStandaloneStatus();

        expect(result.isInPWAContext).toBe(false);
      });

      it('does not detect PWA context via WebView on non-Android platforms', () => {
        mockGetMobilePlatform.mockReturnValue('ios-safari');
        mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/89.0.4389.105 Mobile Safari/537.36 wv';
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
        }));

        const result = getStandaloneStatus();

        expect(result.isInPWAContext).toBe(false);
      });
    });

    describe('complex scenarios', () => {
      it('handles multiple indicators simultaneously', () => {
        mockGetMobilePlatform.mockReturnValue('android');
        mockMatchMedia.mockImplementation((query) => ({
          matches: query === '(display-mode: standalone)',
        }));
        mockLocalStorage.getItem.mockImplementation((key) => 
          key === 'pwa-installed' ? 'true' : null
        );
        Object.defineProperty(document, 'referrer', {
          value: 'android-app://com.example.app',
          configurable: true,
          writable: true,
        });

        const result = getStandaloneStatus();

        expect(result.isStandaloneMedia).toBe(true);
        expect(result.isAndroidStandalone).toBe(true);
        expect(result.isInPWAContext).toBe(true);
        expect(result.wasInstalled).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('prioritizes reliable indicators over false positives', () => {
        // Set up scenario where display mode might give false positive
        // but we have reliable PWA installation flag
        mockGetMobilePlatform.mockReturnValue(null); // Desktop
        mockMatchMedia.mockReturnValue({ matches: false }); // No display mode
        mockLocalStorage.getItem.mockImplementation((key) => 
          key === 'pwa-installed' ? 'true' : null
        );

        const result = getStandaloneStatus();

        expect(result.wasInstalled).toBe(true);
        expect(result.isStandalone).toBe(true);
      });

      it('handles edge case with empty referrer and search', () => {
        Object.defineProperty(document, 'referrer', { value: '', configurable: true, writable: true });
        (window.location as any).search = '';
        mockGetMobilePlatform.mockReturnValue('android');
        mockNavigator.userAgent = 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36';

        const result = getStandaloneStatus();

        expect(result.isInPWAContext).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('handles null/undefined platform', () => {
        mockGetMobilePlatform.mockReturnValue(null);

        const result = getStandaloneStatus();

        expect(result.isIOSStandalone).toBe(false);
        expect(result.isAndroidStandalone).toBe(false);
      });

      it('handles localStorage errors gracefully', () => {
        mockLocalStorage.getItem.mockImplementation(() => {
          throw new Error('localStorage error');
        });

        // Currently throws error (standalone utility doesn't have error handling)
        expect(() => getStandaloneStatus()).toThrow('localStorage error');
      });

      it('handles matchMedia errors gracefully', () => {
        mockMatchMedia.mockImplementation(() => {
          throw new Error('matchMedia error');
        });

        // Currently throws error (standalone utility doesn't have error handling)
        expect(() => getStandaloneStatus()).toThrow('matchMedia error');
      });

      it('handles empty user agent', () => {
        mockNavigator.userAgent = '';
        mockGetMobilePlatform.mockReturnValue('android');

        const result = getStandaloneStatus();

        expect(result.isInPWAContext).toBe(false);
      });

      it('handles malformed URL search params', () => {
        (window.location as any).search = '?malformed&utm_source&=web_app_manifest';

        const result = getStandaloneStatus();

        expect(result.isInPWAContext).toBe(false);
      });
    });
  });

  describe('requireStandaloneMode', () => {
    it('returns true when in standalone mode', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
      }));

      const result = requireStandaloneMode();

      expect(result).toBe(true);
    });

    it('returns false when not in standalone mode', () => {
      mockMatchMedia.mockReturnValue({ matches: false });
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = requireStandaloneMode();

      expect(result).toBe(false);
    });

    it('returns true when PWA was previously installed', () => {
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'pwa-installed' ? 'true' : null
      );

      const result = requireStandaloneMode();

      expect(result).toBe(true);
    });

    it('returns true for iOS standalone mode', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      mockNavigator.standalone = true;

      const result = requireStandaloneMode();

      expect(result).toBe(true);
    });

    it('returns true for Android PWA mode', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
      }));

      const result = requireStandaloneMode();

      expect(result).toBe(true);
    });
  });

  describe('debugStandaloneStatus', () => {
    it('logs comprehensive debug information', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockNavigator.userAgent = 'Test User Agent';
      Object.defineProperty(document, 'referrer', {
        value: 'https://example.com',
        configurable: true,
        writable: true,
      });
      (window.location as any).href = 'https://app.example.com';
      mockMatchMedia.mockImplementation((query) => {
        switch (query) {
          case '(display-mode: standalone)':
            return { matches: true };
          case '(display-mode: fullscreen)':
            return { matches: false };
          case '(display-mode: minimal-ui)':
            return { matches: false };
          default:
            return { matches: false };
        }
      });
      mockNavigator.standalone = false;
      mockLocalStorage.getItem.mockImplementation((key) => 
        key === 'pwa-installed' ? 'true' : null
      );

      debugStandaloneStatus();

      expect(console.group).toHaveBeenCalledWith('🔍 Standalone Detection Debug');
      expect(console.log).toHaveBeenCalledWith('Platform:', 'android');
      expect(console.log).toHaveBeenCalledWith('User Agent:', 'Test User Agent');
      expect(console.log).toHaveBeenCalledWith('Referrer:', 'https://example.com');
      expect(console.log).toHaveBeenCalledWith('URL:', expect.any(String));
      expect(console.log).toHaveBeenCalledWith('Display Mode (standalone):', true);
      expect(console.log).toHaveBeenCalledWith('Display Mode (fullscreen):', false);
      expect(console.log).toHaveBeenCalledWith('Display Mode (minimal-ui):', false);
      expect(console.log).toHaveBeenCalledWith('iOS navigator.standalone:', false);
      expect(console.log).toHaveBeenCalledWith('localStorage pwa-installed:', 'true');
      expect(console.log).toHaveBeenCalledWith('Detection Results:');
      expect(console.table).toHaveBeenCalled();
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('logs debug info with null platform', () => {
      mockGetMobilePlatform.mockReturnValue(null);

      debugStandaloneStatus();

      expect(console.log).toHaveBeenCalledWith('Platform:', null);
    });

    it('logs debug info with undefined standalone property', () => {
      delete mockNavigator.standalone;

      debugStandaloneStatus();

      expect(console.log).toHaveBeenCalledWith('iOS navigator.standalone:', undefined);
    });

    it('logs debug info with null localStorage value', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      debugStandaloneStatus();

      expect(console.log).toHaveBeenCalledWith('localStorage pwa-installed:', null);
    });

    it('handles matchMedia errors in debug logging', () => {
      mockMatchMedia.mockImplementation(() => {
        throw new Error('matchMedia error');
      });

      // The function should throw the error immediately
      expect(() => debugStandaloneStatus()).toThrow('matchMedia error');
    });

    it('handles localStorage errors in debug logging', () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage error');
      });

      // Currently throws error (debug function doesn't have error handling)
      expect(() => debugStandaloneStatus()).toThrow('localStorage error');
    });
  });

  describe('integration tests', () => {
    it('provides consistent results across function calls', () => {
      mockGetMobilePlatform.mockReturnValue('android');
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
      }));

      const status1 = getStandaloneStatus();
      const status2 = getStandaloneStatus();
      const required1 = requireStandaloneMode();
      const required2 = requireStandaloneMode();

      expect(status1).toEqual(status2);
      expect(required1).toBe(required2);
      expect(status1.isStandalone).toBe(required1);
    });

    it('handles rapid successive calls', () => {
      mockMatchMedia.mockImplementation((query) => ({
        matches: query === '(display-mode: standalone)',
      }));

      const results = [];
      for (let i = 0; i < 10; i++) {
        results.push(getStandaloneStatus());
      }

      // All results should be identical
      results.forEach(result => {
        expect(result).toEqual(results[0]);
      });
    });

    it('works correctly with debug function', () => {
      mockGetMobilePlatform.mockReturnValue('ios-safari');
      mockNavigator.standalone = true;

      const status = getStandaloneStatus();
      
      expect(() => debugStandaloneStatus()).not.toThrow();
      
      expect(status.isIOSStandalone).toBe(true);
      expect(status.isStandalone).toBe(true);
    });
  });
});
