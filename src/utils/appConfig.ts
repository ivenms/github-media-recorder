// Application-wide configuration constants

export const LOCALSTORAGE_KEYS = {
  githubToken: 'github_oauth_token',
  githubUsername: 'github_username',
  githubSettings: 'githubSettings', // Added SETTINGS_KEY here
};

import type { MediaCategory } from '../types';

export const MEDIA_CATEGORIES: MediaCategory[] = [
  { id: 'Music', name: 'Music' },
  { id: 'Podcast', name: 'Podcast' },
  { id: 'Lecture', name: 'Lecture' },
  { id: 'Audiobook', name: 'Audiobook' },
]; 