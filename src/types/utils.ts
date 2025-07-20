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

// Web Worker types for video processing
export interface VideoConversionResult {
  convertedData: Uint8Array;
  originalSize: number;
  convertedSize: number;
}

export interface VideoProcessingMessage {
  type: 'convert-video' | 'ping';
  id: string;
  data?: {
    videoData: Uint8Array;
  };
}

export interface VideoProcessingResponse {
  type: 'conversion-complete' | 'ffmpeg-progress' | 'progress' | 'error' | 'pong';
  id?: string;
  progress?: number;
  phase?: string;
  data?: VideoConversionResult;
  error?: string;
}

// Video Worker Service types
export interface VideoConversionCallback {
  resolve: (result: VideoConversionResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number, phase: string) => void;
  metadata?: {
    title: string;
    author: string;
    category: string;
  };
}