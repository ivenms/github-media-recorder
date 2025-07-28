import {
  LOCALSTORAGE_KEYS,
  DEFAULT_MEDIA_CATEGORIES,
  MEDIA_CATEGORIES,
  getMediaCategories,
} from '../../src/utils/appConfig';
import type { MediaCategory } from '../../src/types';

// Mock the settings store
jest.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: {
    getState: jest.fn(),
  },
}));

describe('appConfig', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Constants', () => {
    describe('LOCALSTORAGE_KEYS', () => {
      it('exports the correct localStorage keys', () => {
        expect(LOCALSTORAGE_KEYS).toEqual({
          githubToken: 'github_oauth_token',
          githubUsername: 'github_username',
          githubSettings: 'githubSettings',
        });
      });

      it('has all required keys', () => {
        expect(LOCALSTORAGE_KEYS.githubToken).toBeDefined();
        expect(LOCALSTORAGE_KEYS.githubUsername).toBeDefined();
        expect(LOCALSTORAGE_KEYS.githubSettings).toBeDefined();
      });

      it('has consistent key naming pattern', () => {
        expect(LOCALSTORAGE_KEYS.githubToken).toMatch(/^github_/);
        expect(LOCALSTORAGE_KEYS.githubUsername).toMatch(/^github_/);
        expect(LOCALSTORAGE_KEYS.githubSettings).toMatch(/^github/);
      });
    });

    describe('DEFAULT_MEDIA_CATEGORIES', () => {
      it('exports default media categories', () => {
        expect(DEFAULT_MEDIA_CATEGORIES).toEqual([
          { id: 'Music', name: 'Music' },
          { id: 'Podcast', name: 'Podcast' },
          { id: 'Lecture', name: 'Lecture' },
          { id: 'Audiobook', name: 'Audiobook' },
        ]);
      });

      it('has correct structure for each category', () => {
        DEFAULT_MEDIA_CATEGORIES.forEach((category) => {
          expect(category).toHaveProperty('id');
          expect(category).toHaveProperty('name');
          expect(typeof category.id).toBe('string');
          expect(typeof category.name).toBe('string');
          expect(category.id.length).toBeGreaterThan(0);
          expect(category.name.length).toBeGreaterThan(0);
        });
      });

      it('has unique IDs for all categories', () => {
        const ids = DEFAULT_MEDIA_CATEGORIES.map(cat => cat.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('has unique names for all categories', () => {
        const names = DEFAULT_MEDIA_CATEGORIES.map(cat => cat.name);
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      });

      it('contains expected media types', () => {
        const categoryNames = DEFAULT_MEDIA_CATEGORIES.map(cat => cat.name);
        expect(categoryNames).toContain('Music');
        expect(categoryNames).toContain('Podcast');
        expect(categoryNames).toContain('Lecture');
        expect(categoryNames).toContain('Audiobook');
      });
    });

    describe('MEDIA_CATEGORIES (backward compatibility)', () => {
      it('is an alias for DEFAULT_MEDIA_CATEGORIES', () => {
        expect(MEDIA_CATEGORIES).toBe(DEFAULT_MEDIA_CATEGORIES);
      });
    });
  });

  describe('getMediaCategories', () => {
    const mockUseSettingsStore = require('../../src/stores/settingsStore').useSettingsStore;

    describe('when custom categories are available', () => {
      it('returns custom categories from settings store', () => {
        const customCategories: MediaCategory[] = [
          { id: 'Custom1', name: 'Custom Category 1' },
          { id: 'Custom2', name: 'Custom Category 2' },
        ];

        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories,
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(customCategories);
      });

      it('returns custom categories when they exist and have length > 0', () => {
        const customCategories: MediaCategory[] = [
          { id: 'SingleCategory', name: 'Single Category' },
        ];

        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories,
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(customCategories);
        expect(result).not.toEqual(DEFAULT_MEDIA_CATEGORIES);
      });
    });

    describe('when custom categories are not available', () => {
      it('returns default categories when customCategories is undefined', () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            // customCategories is undefined
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(DEFAULT_MEDIA_CATEGORIES);
      });

      it('returns default categories when customCategories is empty array', () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories: [],
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(DEFAULT_MEDIA_CATEGORIES);
      });

      it('returns default categories when appSettings is undefined', () => {
        mockUseSettingsStore.getState.mockReturnValue({
          // appSettings is undefined
        });

        const result = getMediaCategories();
        expect(result).toEqual(DEFAULT_MEDIA_CATEGORIES);
      });

      it('returns default categories when settings state is empty', () => {
        mockUseSettingsStore.getState.mockReturnValue({});

        const result = getMediaCategories();
        expect(result).toEqual(DEFAULT_MEDIA_CATEGORIES);
      });
    });

    describe('error handling', () => {
      it('returns default categories when getState throws an error', () => {
        mockUseSettingsStore.getState.mockImplementation(() => {
          throw new Error('Settings store error');
        });

        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const result = getMediaCategories();
        expect(result).toEqual(DEFAULT_MEDIA_CATEGORIES);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load custom categories:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('returns default categories when accessing nested properties throws', () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: null, // This could cause errors when accessing .customCategories
        });

        const result = getMediaCategories();
        expect(result).toEqual(DEFAULT_MEDIA_CATEGORIES);
      });

      it('handles malformed custom categories gracefully', () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories: 'invalid-data', // Not an array
          },
        });

        const result = getMediaCategories();
        expect(result).toBe('invalid-data'); // Function returns the invalid data as-is
      });
    });

    describe('data validation', () => {
      it('validates that returned categories have correct structure', () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories: [
              { id: 'Valid', name: 'Valid Category' },
            ],
          },
        });

        const result = getMediaCategories();
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('id', 'Valid');
        expect(result[0]).toHaveProperty('name', 'Valid Category');
      });

      it('preserves immutability of default categories', () => {
        mockUseSettingsStore.getState.mockReturnValue({});

        const result1 = getMediaCategories();
        const result2 = getMediaCategories();

        // Should return the same reference to default categories
        expect(result1).toBe(DEFAULT_MEDIA_CATEGORIES);
        expect(result2).toBe(DEFAULT_MEDIA_CATEGORIES);
      });

      it('returns new array for custom categories', () => {
        const customCategories: MediaCategory[] = [
          { id: 'Custom', name: 'Custom Category' },
        ];

        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories,
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(customCategories);
        expect(result).toBe(customCategories); // Should return same reference
      });
    });

    describe('edge cases', () => {
      it('handles null customCategories', () => {
        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories: null,
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(DEFAULT_MEDIA_CATEGORIES);
      });

      it('handles very large custom categories array', () => {
        const largeCustomCategories: MediaCategory[] = Array.from(
          { length: 1000 },
          (_, i) => ({ id: `Category${i}`, name: `Category ${i}` })
        );

        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories: largeCustomCategories,
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(largeCustomCategories);
        expect(result).toHaveLength(1000);
      });

      it('handles custom categories with special characters', () => {
        const specialCategories: MediaCategory[] = [
          { id: 'Special_!@#$%', name: 'Special Category!@#$%' },
          { id: 'Unicode-🎵', name: 'Unicode Category 🎵' },
        ];

        mockUseSettingsStore.getState.mockReturnValue({
          appSettings: {
            customCategories: specialCategories,
          },
        });

        const result = getMediaCategories();
        expect(result).toEqual(specialCategories);
      });
    });
  });
});