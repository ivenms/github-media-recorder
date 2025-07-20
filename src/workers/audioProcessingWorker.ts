// Audio Processing Web Worker for background MP3 conversion
// Handles WebM to MP3/WAV conversion using FFmpeg with progress reporting

import type { AudioProcessingMessage, AudioProcessingResponse } from '../types/workers';
import { FFmpeg } from '@ffmpeg/ffmpeg';

// FFmpeg instance for worker
const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;

// Initialize FFmpeg
async function ensureFFmpegLoaded(): Promise<void> {
  if (!ffmpegLoaded) {
    await ffmpeg.load();
    ffmpegLoaded = true;
  }
}

// Audio processing functions
async function convertAudioWithFFmpeg(
  audioData: Uint8Array, 
  format: 'mp3' | 'wav',
  onProgress?: (progress: number, phase: string) => void
): Promise<Uint8Array> {
  onProgress?.(5, 'Loading FFmpeg...');
  
  await ensureFFmpegLoaded();
  
  onProgress?.(15, 'Setting up conversion...');
  
  // Set up progress reporting
  ffmpeg.on('progress', ({ progress }: { progress: number }) => {
    // Map FFmpeg progress (0-1) to our progress range (20-90%)
    const mappedProgress = 20 + (progress * 70);
    onProgress?.(Math.round(mappedProgress), `Converting to ${format.toUpperCase()}...`);
  });
  
  onProgress?.(20, 'Writing input file...');
  
  // Write input file to FFmpeg filesystem
  await ffmpeg.writeFile('input.webm', audioData);
  
  let outputFile: string;
  let ffmpegArgs: string[];
  
  if (format === 'mp3') {
    outputFile = 'output.mp3';
    ffmpegArgs = [
      '-i', 'input.webm',
      '-vn', // No video
      '-ar', '44100', // Sample rate
      '-ac', '2', // Stereo
      '-b:a', '128k', // Bitrate
      outputFile
    ];
  } else { // wav
    outputFile = 'output.wav';
    ffmpegArgs = [
      '-i', 'input.webm',
      '-vn', // No video
      '-ar', '44100', // Sample rate
      '-ac', '2', // Stereo
      outputFile
    ];
  }
  
  onProgress?.(25, `Converting to ${format.toUpperCase()}...`);
  
  // Execute conversion
  await ffmpeg.exec(ffmpegArgs);
  
  onProgress?.(90, 'Reading converted file...');
  
  // Read the output file
  const fileData = await ffmpeg.readFile(outputFile);
  const result = fileData instanceof Uint8Array ? fileData : new Uint8Array([...fileData].map(c => c.charCodeAt(0)));
  
  onProgress?.(95, 'Cleaning up...');
  
  // Clean up files
  try {
    await ffmpeg.deleteFile('input.webm');
    await ffmpeg.deleteFile(outputFile);
  } catch (error) {
    // Ignore cleanup errors
    console.warn('Failed to clean up FFmpeg files:', error);
  }
  
  onProgress?.(100, 'Conversion complete!');
  
  return result;
}

// Worker message handler
self.onmessage = async (event: MessageEvent<AudioProcessingMessage>) => {
  const { type, id, data } = event.data;
  
  try {
    switch (type) {
      case 'convert-audio': {
        if (!data?.audioData) {
          throw new Error('No audio data provided');
        }
        
        const { audioData, format } = data;
        
        // Send initial progress
        const response: AudioProcessingResponse = {
          type: 'progress',
          id,
          progress: 0,
          phase: 'Starting audio conversion...'
        };
        self.postMessage(response);
        
        let convertedData: Uint8Array;
        
        // Use FFmpeg for both MP3 and WAV conversion
        convertedData = await convertAudioWithFFmpeg(audioData, format, (progress, phase) => {
          const progressResponse: AudioProcessingResponse = {
            type: 'progress',
            id,
            progress,
            phase
          };
          self.postMessage(progressResponse);
        });
        
        // Send completion message
        const completionResponse: AudioProcessingResponse = {
          type: 'conversion-complete',
          id,
          data: {
            convertedData,
            originalSize: audioData.length,
            convertedSize: convertedData.length
          }
        };
        self.postMessage(completionResponse);
        break;
      }
        
      case 'ping': {
        const pongResponse: AudioProcessingResponse = {
          type: 'pong',
          id
        };
        self.postMessage(pongResponse);
        break;
      }
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    const errorResponse: AudioProcessingResponse = {
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    self.postMessage(errorResponse);
  }
};

// Handle worker errors
self.onerror = (error) => {
  console.error('Audio Worker Error:', error);
};

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Audio Worker Unhandled Rejection:', event.reason);
});