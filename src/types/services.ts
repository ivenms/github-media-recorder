// Service-related type definitions

// Video Worker Service types
export interface VideoConversionResult {
  convertedData: Uint8Array;
  originalSize: number;
  convertedSize: number;
}

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

// Audio Worker Service types
export interface AudioConversionResult {
  convertedData: Uint8Array;
  originalSize: number;
  convertedSize: number;
}

export interface AudioConversionCallback {
  resolve: (result: AudioConversionResult) => void;
  reject: (error: Error) => void;
  onProgress?: (progress: number, phase: string) => void;
}

// Background processing callback interface for cross-screen notifications
export interface BackgroundProcessingCallbacks {
  onComplete?: (result: AudioConversionResult | VideoConversionResult, fileName?: string) => void;
  onError?: (error: Error, fileName?: string) => void;
  getCurrentScreen?: () => string;
}