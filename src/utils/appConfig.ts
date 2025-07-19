// Application-wide configuration constants

export const LOCALSTORAGE_KEYS = {
  githubToken: 'github_oauth_token',
  githubUsername: 'github_username',
  githubSettings: 'githubSettings', // Added SETTINGS_KEY here
};

import type { MediaCategory } from '../types';
import { useSettingsStore } from '../stores/settingsStore';

export const DEFAULT_MEDIA_CATEGORIES: MediaCategory[] = [
  { id: 'Music', name: 'Music' },
  { id: 'Podcast', name: 'Podcast' },
  { id: 'Lecture', name: 'Lecture' },
  { id: 'Audiobook', name: 'Audiobook' },
];

// Backward compatibility export
export const MEDIA_CATEGORIES = DEFAULT_MEDIA_CATEGORIES;

// Get categories from settings store or use defaults
export function getMediaCategories(): MediaCategory[] {
  try {
    const settingsState = useSettingsStore.getState();
    
    if (settingsState.appSettings?.customCategories && settingsState.appSettings.customCategories.length > 0) {
      return settingsState.appSettings.customCategories;
    }
  } catch (error) {
    console.warn('Failed to load custom categories:', error);
  }
  return DEFAULT_MEDIA_CATEGORIES;
} 