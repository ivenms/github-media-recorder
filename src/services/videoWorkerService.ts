// Global Video Worker Service
// Manages a persistent Web Worker for video conversion that survives component unmounts

import type { 
  VideoProcessingMessage, 
  VideoProcessingResponse
} from '../types/workers';
import type {
  VideoConversionResult,
  VideoConversionCallback
} from '../types/services';
import { useUIStore } from '../stores/uiStore';

class VideoWorkerService {
  private worker: Worker | null = null;
  private pendingConversions = new Map<string, VideoConversionCallback>();
  private isWorkerLoaded = false;

  // Show background alert if user is not on video screen
  private showBackgroundAlert(type: 'success' | 'error', error?: Error): void {
    const { currentScreen, openModal } = useUIStore.getState();
    
    if (currentScreen !== 'video') {
      if (type === 'success') {
        openModal({
          type: 'success',
          title: 'Video Conversion Complete',
          message: 'Your video file has been successfully converted and saved!',
          confirmText: 'View',
          onConfirm: () => {
            useUIStore.getState().setScreen('library');
          }
        });
      } else {
        openModal({
          type: 'error', 
          title: 'Video Conversion Failed',
          message: `Video conversion failed: ${error?.message || 'Unknown error'}`
        });
      }
    }
  }

  // Initialize the worker (singleton pattern)
  private async initializeWorker(): Promise<void> {
    if (this.worker || this.isWorkerLoaded) return;

    this.worker = new Worker(
      new URL('../workers/videoProcessingWorker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event: MessageEvent<VideoProcessingResponse>) => {
      this.handleWorkerMessage(event.data);
    };

    this.worker.onerror = (error) => {
      console.error('Video Worker Service error:', error);
      // Reject all pending conversions
      this.pendingConversions.forEach(({ reject }) => {
        reject(new Error('Worker failed to initialize'));
      });
      this.pendingConversions.clear();
    };

    this.isWorkerLoaded = true;
  }

  private handleWorkerMessage(message: VideoProcessingResponse): void {
    const { type, id, progress, phase, data, error } = message;

    if (!id) return;

    const callback = this.pendingConversions.get(id);
    if (!callback) return;

    switch (type) {
      case 'progress':
      case 'ffmpeg-progress':
        if (callback.onProgress && typeof progress === 'number' && phase) {
          callback.onProgress(progress, phase);
        }
        break;

      case 'conversion-complete':
        if (data) {
          callback.resolve(data);
          this.pendingConversions.delete(id);
          
          // Show background alert if user is not on video screen
          this.showBackgroundAlert('success');
        }
        break;

      case 'error':
        const errorObj = new Error(error || 'Unknown conversion error');
        callback.reject(errorObj);
        this.pendingConversions.delete(id);
        
        // Show background alert if user is not on video screen
        this.showBackgroundAlert('error', errorObj);
        break;
    }
  }

  // Convert video (public API)
  async convertVideo(
    videoData: Uint8Array, 
    onProgress?: (progress: number, phase: string) => void
  ): Promise<VideoConversionResult> {
    await this.initializeWorker();

    if (!this.worker) {
      throw new Error('Worker failed to initialize');
    }

    const id = `convert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return new Promise((resolve, reject) => {
      // Store callback
      this.pendingConversions.set(id, { resolve, reject, onProgress });

      // Send conversion request
      const message: VideoProcessingMessage = {
        type: 'convert-video',
        id,
        data: { videoData }
      };

      this.worker!.postMessage(message);

      // Set timeout (30 seconds)
      setTimeout(() => {
        const callback = this.pendingConversions.get(id);
        if (callback) {
          callback.reject(new Error('Conversion timeout'));
          this.pendingConversions.delete(id);
        }
      }, 30000);
    });
  }

  // Get current conversion count
  getPendingConversionsCount(): number {
    return this.pendingConversions.size;
  }


  // Cleanup (only call on app shutdown)
  destroy(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    
    // Reject all pending conversions
    this.pendingConversions.forEach(({ reject }) => {
      reject(new Error('Service destroyed'));
    });
    this.pendingConversions.clear();
    this.isWorkerLoaded = false;
  }
}

// Export singleton instance
export const videoWorkerService = new VideoWorkerService();