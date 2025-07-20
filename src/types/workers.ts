// Web Worker type definitions

// Video Worker types
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
  data?: import('./services').VideoConversionResult;
  error?: string;
}

// Audio Worker types
export interface AudioProcessingMessage {
  type: 'convert-audio' | 'ping';
  id: string;
  data?: {
    audioData: Uint8Array;
    format: 'mp3' | 'wav';
  };
}

export interface AudioProcessingResponse {
  type: 'conversion-complete' | 'progress' | 'error' | 'pong';
  id?: string;
  progress?: number;
  phase?: string;
  data?: import('./services').AudioConversionResult;
  error?: string;
}