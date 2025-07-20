// Utility-related type definitions

// tokenAuth utility
export interface TokenValidationResult {
  isValid: boolean;
  isExpired: boolean;
  username?: string;
  error?: string;
}

// device utility
export type MobilePlatform = 'android' | 'ios-safari' | 'ios-chrome' | null;

// imageUtils utility
export interface ImageProcessOptions {
  width: number;
  height: number;
  quality?: number; // 0-1, default 0.9
  format?: 'jpeg' | 'jpg'; // Always JPG for our use case
}

// githubUtils utility
export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string | null;
  type: 'file' | 'dir';
}