// Web Worker for video processing
// Handles FFmpeg conversion and file operations in background

import { FFmpeg } from '@ffmpeg/ffmpeg';
import type { VideoProcessingMessage, VideoProcessingResponse } from '../types/workers';

// FFmpeg instance for worker
const ffmpeg = new FFmpeg();
let ffmpegLoaded = false;

// Initialize FFmpeg
async function initializeFFmpeg(): Promise<void> {
  if (!ffmpegLoaded) {
    postMessage({
      type: 'progress',
      phase: 'Loading FFmpeg...',
      progress: 5
    } as VideoProcessingResponse);
    
    // Setup progress listener
    ffmpeg.on('progress', ({ progress }: { progress: number }) => {
      postMessage({
        type: 'ffmpeg-progress',
        progress
      } as VideoProcessingResponse);
    });
    
    try {
      await ffmpeg.load();
      ffmpegLoaded = true;
      
      postMessage({
        type: 'progress',
        phase: 'FFmpeg loaded successfully',
        progress: 15
      } as VideoProcessingResponse);
    } catch (error) {
      postMessage({
        type: 'progress',
        phase: 'FFmpeg loading failed',
        progress: 0
      } as VideoProcessingResponse);
      throw new Error(`FFmpeg initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Convert video to MP4
async function convertToMp4(input: Uint8Array): Promise<Uint8Array> {
  try {
    await initializeFFmpeg();
    
    // Clean up any existing files
    try {
      await ffmpeg.deleteFile('input.webm');
    } catch {
      // File doesn't exist, ignore
    }
    try {
      await ffmpeg.deleteFile('output.mp4');
    } catch {
      // File doesn't exist, ignore
    }
    
    postMessage({
      type: 'progress',
      phase: 'Writing input file...',
      progress: 20
    } as VideoProcessingResponse);
    
    await ffmpeg.writeFile('input.webm', input);
    
    postMessage({
      type: 'progress',
      phase: 'Starting conversion...',
      progress: 30
    } as VideoProcessingResponse);
    
    // Standard conversion without any rotation corrections
    await ffmpeg.exec([
      '-i', 'input.webm',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-movflags', 'faststart',
      '-pix_fmt', 'yuv420p',
      'output.mp4',
    ]);
    
    postMessage({
      type: 'progress',
      phase: 'Reading converted file...',
      progress: 90
    } as VideoProcessingResponse);
    
    const fileData = await ffmpeg.readFile('output.mp4');
    
    // Clean up files after conversion
    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp4');
    } catch {
      // Cleanup failed, but conversion succeeded
    }
    
    postMessage({
      type: 'progress',
      phase: 'Conversion complete!',
      progress: 95
    } as VideoProcessingResponse);
    
    return fileData instanceof Uint8Array ? fileData : new Uint8Array([...fileData].map(c => c.charCodeAt(0)));
  } catch (error) {
    // Clean up files on error
    try {
      await ffmpeg.deleteFile('input.webm');
      await ffmpeg.deleteFile('output.mp4');
    } catch {
      // Cleanup failed
    }
    throw error;
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<VideoProcessingMessage>) => {
  const { type, id, data } = event.data;
  
  try {
    switch (type) {
      case 'convert-video': {
        if (!data?.videoData) {
          throw new Error('Video data is required');
        }
        
        postMessage({
          type: 'progress',
          id,
          phase: 'Starting video processing...',
          progress: 0
        } as VideoProcessingResponse);
        
        try {
          // Convert the video
          const convertedData = await convertToMp4(data.videoData);
          
          postMessage({
            type: 'conversion-complete',
            id,
            data: {
              convertedData,
              originalSize: data.videoData.length,
              convertedSize: convertedData.length
            }
          } as VideoProcessingResponse);
        } catch (conversionError) {
          // Re-throw with more context
          const errorMessage = conversionError instanceof Error ? conversionError.message : 'Unknown conversion error';
          throw new Error(`Video conversion failed: ${errorMessage}`);
        }
        break;
      }
      
      case 'ping':
        postMessage({
          type: 'pong',
          id
        } as VideoProcessingResponse);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    } as VideoProcessingResponse);
  }
});

// Export types for TypeScript (not actually exported in worker context)
export {};