// Application-wide configuration constants

export const LOCALSTORAGE_KEYS = {
  githubToken: 'github_oauth_token',
  githubUsername: 'github_username',
  githubSettings: 'githubSettings', // Added SETTINGS_KEY here
};

import type { MediaCategory, AppSettings } from '../types';

export const DEFAULT_MEDIA_CATEGORIES: MediaCategory[] = [
  { id: 'Music', name: 'Music' },
  { id: 'Podcast', name: 'Podcast' },
  { id: 'Lecture', name: 'Lecture' },
  { id: 'Audiobook', name: 'Audiobook' },
];

// Backward compatibility export
export const MEDIA_CATEGORIES = DEFAULT_MEDIA_CATEGORIES;

// Get categories from settings or use defaults
export function getMediaCategories(): MediaCategory[] {
  try {
    const settings = localStorage.getItem(LOCALSTORAGE_KEYS.githubSettings);
    if (settings) {
      const parsed: AppSettings = JSON.parse(settings);
      if (parsed.customCategories && parsed.customCategories.length > 0) {
        return parsed.customCategories;
      }
    }
  } catch (error) {
    console.warn('Failed to load custom categories:', error);
  }
  return DEFAULT_MEDIA_CATEGORIES;
} 