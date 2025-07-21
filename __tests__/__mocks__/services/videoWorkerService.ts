// Mock Video Worker Service
import type { 
  VideoProcessingMessage, 
  VideoProcessingResponse
} from '../../../src/types/workers';
import type {
  VideoConversionResult,
  VideoConversionCallback
} from '../../../src/types/services';

class MockVideoWorkerService {
  private pendingConversions = new Map<string, VideoConversionCallback>();
  private isWorkerLoaded = true; // Always loaded in tests

  async initialize(): Promise<void> {
    // Mock initialization - immediate resolve
    this.isWorkerLoaded = true;
  }

  async convertToMP4(
    webmBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<VideoConversionResult> {
    return this.mockConversion(webmBuffer, onProgress);
  }

  private async mockConversion(
    webmBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<VideoConversionResult> {
    // Simulate conversion progress
    if (onProgress) {
      const steps = [0.1, 0.25, 0.4, 0.6, 0.75, 0.9, 1.0];
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 15));
        onProgress(progress);
      }
    }

    // Create mock output buffer
    const outputSize = Math.floor(webmBuffer.byteLength * 0.9); // Simulate slight compression
    const outputBuffer = new ArrayBuffer(outputSize);
    const view = new Uint8Array(outputBuffer);
    
    // Mock MP4 header
    const header = 'ftyp';
    for (let i = 4; i < 4 + header.length; i++) {
      view[i] = header.charCodeAt(i - 4);
    }

    // Fill with mock video data
    for (let i = 20; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }

    return {
      buffer: outputBuffer,
      mimeType: 'video/mp4',
      size: outputBuffer.byteLength
    };
  }

  terminate(): void {
    this.pendingConversions.clear();
    this.isWorkerLoaded = false;
  }

  isReady(): boolean {
    return this.isWorkerLoaded;
  }

  // Test utilities
  simulateError(message: string = 'Mock video conversion error'): void {
    throw new Error(message);
  }

  getPendingConversions(): number {
    return this.pendingConversions.size;
  }
}

// Export singleton instance
export const videoWorkerService = new MockVideoWorkerService();

// Default export for compatibility
export default videoWorkerService;