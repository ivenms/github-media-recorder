import { validatePWACriteria, logPWAValidation } from '../../src/utils/pwaValidation';
import type { PWAValidationResult } from '../../src/utils/pwaValidation';

// Mock console methods to prevent spam during tests
global.console.log = jest.fn();
global.console.error = jest.fn();
global.console.warn = jest.fn();
global.console.group = jest.fn();
global.console.groupEnd = jest.fn();
global.console.table = jest.fn();

// Mock global fetch
global.fetch = jest.fn();

// Mock document.querySelector
const mockQuerySelector = jest.fn();
Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector,
  configurable: true,
});

// Create a mock location object for tests
const mockLocation = {
  protocol: 'https:',
  hostname: 'example.com',
  href: 'https://example.com/',
  origin: 'https://example.com',
  pathname: '/',
  search: '',
  hash: '',
} as Location;

// Mock navigator.serviceWorker
const mockServiceWorker = {
  getRegistrations: jest.fn(),
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  configurable: true,
});

describe('pwaValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset location to default HTTPS
    mockLocation.protocol = 'https:';
    mockLocation.hostname = 'example.com';
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        name: 'Test App',
        short_name: 'TestApp',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      }),
    });
    
    // Reset service worker mock
    mockServiceWorker.getRegistrations.mockResolvedValue([
      { active: true },
    ]);
    
    // Restore service worker to navigator
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      configurable: true,
    });
    
    // Reset document.querySelector mock
    mockQuerySelector.mockReturnValue({
      href: '/manifest.json',
    });
  });

  describe('validatePWACriteria', () => {
    describe('HTTPS validation', () => {
      it('passes HTTPS validation for HTTPS sites', async () => {
        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.https).toBe(true);
        expect(result.errors).not.toContain('HTTPS is required for PWA installation');
      });

      it('passes HTTPS validation for localhost', async () => {
        mockLocation.protocol = 'http:';
        mockLocation.hostname = 'localhost';

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.https).toBe(true);
        expect(result.errors).not.toContain('HTTPS is required for PWA installation');
      });

      it('fails HTTPS validation for HTTP sites', async () => {
        mockLocation.protocol = 'http:';
        mockLocation.hostname = 'example.com';

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.https).toBe(false);
        expect(result.errors).toContain('HTTPS is required for PWA installation');
      });
    });

    describe('manifest validation', () => {
      it('passes manifest validation with valid manifest', async () => {
        // Set up manifest without maskable icons to trigger warning
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            short_name: 'TestApp',
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        
        expect(result.criteria.manifest).toBe(true);
        expect(result.criteria.name).toBe(true);
        expect(result.criteria.startUrl).toBe(true);
        expect(result.criteria.display).toBe(true);
        expect(result.criteria.icons).toBe(true);
        expect(result.warnings).toContain('Consider adding maskable icons for better Android integration');
      });

      it('handles manifest with short_name only', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            short_name: 'TestApp',
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.name).toBe(true);
      });

      it('handles manifest with fullscreen display', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'fullscreen',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.display).toBe(true);
      });

      it('handles manifest with maskable icons', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.icons).toBe(true);
        expect(result.warnings).not.toContain('Consider adding maskable icons for better Android integration');
      });

      it('fails when manifest is missing name and short_name', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.name).toBe(false);
        expect(result.errors).toContain('Manifest must have a name or short_name');
      });

      it('fails when manifest is missing start_url', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.startUrl).toBe(false);
        expect(result.errors).toContain('Manifest must have a start_url');
      });

      it('fails when manifest has invalid display mode', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'browser',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.display).toBe(false);
        expect(result.errors).toContain('Manifest display must be "standalone" or "fullscreen"');
      });

      it('fails when manifest has no icons', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'standalone',
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.icons).toBe(false);
        expect(result.errors).toContain('Manifest must have at least one PNG icon ≥192x192');
      });

      it('fails when manifest has icons but none meet size requirements', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon-128.png',
                sizes: '128x128',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.icons).toBe(false);
        expect(result.errors).toContain('Manifest must have at least one PNG icon ≥192x192');
      });

      it('fails when manifest has icons but wrong type', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.jpg',
                sizes: '192x192',
                type: 'image/jpeg',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.icons).toBe(false);
        expect(result.errors).toContain('Manifest must have at least one PNG icon ≥192x192');
      });

      it('handles manifest fetch failure', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 404,
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.manifest).toBe(false);
        expect(result.errors).toContain('Manifest file could not be loaded: 404');
      });

      it('handles manifest fetch error', async () => {
        (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.manifest).toBe(false);
        expect(result.errors).toContain('Error loading manifest: Error: Network error');
      });

      it('handles missing manifest link', async () => {
        mockQuerySelector.mockReturnValue(null);

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.manifest).toBe(false);
        expect(result.errors).toContain('No manifest link found in HTML');
      });

      it('handles icons with missing sizes property', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon.png',
                type: 'image/png',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.icons).toBe(false);
        expect(result.errors).toContain('Manifest must have at least one PNG icon ≥192x192');
      });

      it('handles icons with missing type property', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            name: 'Test App',
            start_url: '/',
            display: 'standalone',
            icons: [
              {
                src: '/icon-192.png',
                sizes: '192x192',
              },
            ],
          }),
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.icons).toBe(false);
        expect(result.errors).toContain('Manifest must have at least one PNG icon ≥192x192');
      });
    });

    describe('service worker validation', () => {
      it('passes service worker validation with active worker', async () => {
        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.serviceWorker).toBe(true);
        expect(result.errors).not.toContain('No active service worker found');
      });

      it('passes service worker validation with multiple registrations', async () => {
        mockServiceWorker.getRegistrations.mockResolvedValue([
          { active: false },
          { active: true },
        ]);

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.serviceWorker).toBe(true);
      });

      it('fails when no service worker registrations exist', async () => {
        mockServiceWorker.getRegistrations.mockResolvedValue([]);

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.serviceWorker).toBe(false);
        expect(result.errors).toContain('No active service worker found');
      });

      it('fails when registrations exist but none are active', async () => {
        mockServiceWorker.getRegistrations.mockResolvedValue([
          { active: false },
          { active: false },
        ]);

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.serviceWorker).toBe(false);
        expect(result.errors).toContain('No active service worker found');
      });

      it('handles service worker check error', async () => {
        mockServiceWorker.getRegistrations.mockRejectedValue(new Error('Service worker error'));

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.serviceWorker).toBe(false);
        expect(result.errors).toContain('Error checking service worker: Error: Service worker error');
      });

      it('handles missing service worker support', async () => {
        // Remove serviceWorker from navigator
        Object.defineProperty(navigator, 'serviceWorker', {
          value: undefined,
          configurable: true,
        });

        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria.serviceWorker).toBe(false);
        expect(result.errors).toContain('Service Worker not supported in this browser');
      });
    });

    describe('overall validation result', () => {
      it('returns valid result when all criteria pass', async () => {
        const result = await validatePWACriteria(mockLocation);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('returns invalid result when any criteria fail', async () => {
        mockLocation.protocol = 'http:';
        mockLocation.hostname = 'example.com';

        const result = await validatePWACriteria(mockLocation);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('returns proper criteria object structure', async () => {
        const result = await validatePWACriteria(mockLocation);
        expect(result.criteria).toHaveProperty('https');
        expect(result.criteria).toHaveProperty('manifest');
        expect(result.criteria).toHaveProperty('serviceWorker');
        expect(result.criteria).toHaveProperty('icons');
        expect(result.criteria).toHaveProperty('startUrl');
        expect(result.criteria).toHaveProperty('display');
        expect(result.criteria).toHaveProperty('name');
      });

      it('handles complex failure scenario', async () => {
        // Set up multiple failures
        mockLocation.protocol = 'http:';
        mockLocation.hostname = 'example.com';
        
        mockQuerySelector.mockReturnValue(null);
        mockServiceWorker.getRegistrations.mockResolvedValue([]);

        const result = await validatePWACriteria(mockLocation);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('HTTPS is required for PWA installation');
        expect(result.errors).toContain('No manifest link found in HTML');
        expect(result.errors).toContain('No active service worker found');
      });
    });
  });

  describe('logPWAValidation', () => {
    it('logs validation results with all criteria', () => {
      const mockResult: PWAValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Test warning'],
        criteria: {
          https: true,
          manifest: true,
          serviceWorker: true,
          icons: true,
          startUrl: true,
          display: true,
          name: true,
        },
      };

      logPWAValidation(mockResult);

      expect(console.group).toHaveBeenCalledWith('🔍 PWA Installation Criteria Validation');
      expect(console.log).toHaveBeenCalledWith('✅ Valid for installation:', true);
      expect(console.log).toHaveBeenCalledWith('📋 Criteria Status:');
      expect(console.table).toHaveBeenCalledWith(mockResult.criteria);
      expect(console.groupEnd).toHaveBeenCalled();
    });

    it('logs errors when validation fails', () => {
      const mockResult: PWAValidationResult = {
        isValid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: [],
        criteria: {
          https: false,
          manifest: false,
          serviceWorker: true,
          icons: true,
          startUrl: true,
          display: true,
          name: true,
        },
      };

      logPWAValidation(mockResult);

      expect(console.group).toHaveBeenCalledWith('❌ Errors (must fix for PWA installation):');
      expect(console.error).toHaveBeenCalledWith('• Error 1');
      expect(console.error).toHaveBeenCalledWith('• Error 2');
    });

    it('logs warnings when present', () => {
      const mockResult: PWAValidationResult = {
        isValid: true,
        errors: [],
        warnings: ['Warning 1', 'Warning 2'],
        criteria: {
          https: true,
          manifest: true,
          serviceWorker: true,
          icons: true,
          startUrl: true,
          display: true,
          name: true,
        },
      };

      logPWAValidation(mockResult);

      expect(console.group).toHaveBeenCalledWith('⚠️ Warnings (recommended improvements):');
      expect(console.warn).toHaveBeenCalledWith('• Warning 1');
      expect(console.warn).toHaveBeenCalledWith('• Warning 2');
    });

    it('handles empty errors and warnings arrays', () => {
      const mockResult: PWAValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        criteria: {
          https: true,
          manifest: true,
          serviceWorker: true,
          icons: true,
          startUrl: true,
          display: true,
          name: true,
        },
      };

      logPWAValidation(mockResult);

      expect(console.group).toHaveBeenCalledWith('🔍 PWA Installation Criteria Validation');
      expect(console.log).toHaveBeenCalledWith('✅ Valid for installation:', true);
      expect(console.groupEnd).toHaveBeenCalled();
      
      // Should not create error or warning groups
      expect(console.group).not.toHaveBeenCalledWith('❌ Errors (must fix for PWA installation):');
      expect(console.group).not.toHaveBeenCalledWith('⚠️ Warnings (recommended improvements):');
    });

    it('logs invalid result correctly', () => {
      const mockResult: PWAValidationResult = {
        isValid: false,
        errors: ['Critical error'],
        warnings: ['Recommendation'],
        criteria: {
          https: false,
          manifest: true,
          serviceWorker: true,
          icons: true,
          startUrl: true,
          display: true,
          name: true,
        },
      };

      logPWAValidation(mockResult);

      expect(console.log).toHaveBeenCalledWith('✅ Valid for installation:', false);
      expect(console.error).toHaveBeenCalledWith('• Critical error');
      expect(console.warn).toHaveBeenCalledWith('• Recommendation');
    });
  });

  // Cleanup after tests
  afterAll(() => {
    // Restore service worker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
      configurable: true,
    });
    
    // Reset location
    mockLocation.protocol = 'https:';
    mockLocation.hostname = 'example.com';
  });
});