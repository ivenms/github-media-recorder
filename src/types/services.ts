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