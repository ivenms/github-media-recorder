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

  // Updated to match actual API
  async convertVideo(
    videoData: Uint8Array,
    onProgress?: (progress: number, phase: string) => void
  ): Promise<VideoConversionResult> {
    return this.mockConversion(videoData, onProgress);
  }

  private async mockConversion(
    videoData: Uint8Array,
    onProgress?: (progress: number, phase: string) => void
  ): Promise<VideoConversionResult> {
    // Simulate conversion progress with phases
    if (onProgress) {
      const steps = [
        { progress: 5, phase: 'Loading FFmpeg...' },
        { progress: 15, phase: 'FFmpeg loaded successfully' },
        { progress: 20, phase: 'Writing input file...' },
        { progress: 30, phase: 'Starting conversion...' },
        { progress: 60, phase: 'Processing frames...' },
        { progress: 90, phase: 'Reading converted file...' },
        { progress: 95, phase: 'Conversion complete!' }
      ];
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 15));
        onProgress(step.progress, step.phase);
      }
    }

    // Create mock output - return the expected structure
    const convertedData = new Uint8Array(Math.floor(videoData.length * 0.9)); // Simulate compression
    
    // Mock MP4 header (ftyp box)
    convertedData[0] = 0x00;
    convertedData[1] = 0x00;
    convertedData[2] = 0x00;
    convertedData[3] = 0x20; // Box size
    convertedData[4] = 0x66;  // 'f'
    convertedData[5] = 0x74;  // 't'
    convertedData[6] = 0x79;  // 'y'
    convertedData[7] = 0x70;  // 'p'

    // Fill with mock video data
    for (let i = 20; i < convertedData.length; i++) {
      convertedData[i] = Math.floor(Math.random() * 256);
    }

    return {
      convertedData,
      originalSize: videoData.length,
      convertedSize: convertedData.length
    };
  }

  // Updated to match actual API
  getPendingConversionsCount(): number {
    return this.pendingConversions.size;
  }

  // Updated to match actual API
  destroy(): void {
    this.pendingConversions.clear();
    this.isWorkerLoaded = false;
  }

  // Test utilities
  simulateError(message: string = 'Mock video conversion error'): void {
    throw new Error(message);
  }

  // Legacy methods for backward compatibility
  async initialize(): Promise<void> {
    this.isWorkerLoaded = true;
  }

  async convertToMP4(
    webmBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<VideoConversionResult> {
    const videoData = new Uint8Array(webmBuffer);
    const progressWrapper = onProgress ? (progress: number, _phase: string) => onProgress(progress / 100) : undefined;
    return this.convertVideo(videoData, progressWrapper);
  }

  terminate(): void {
    this.destroy();
  }

  isReady(): boolean {
    return this.isWorkerLoaded;
  }

  getPendingConversions(): number {
    return this.getPendingConversionsCount();
  }
}

// Export singleton instance
export const videoWorkerService = new MockVideoWorkerService();

// Default export for compatibility
export default videoWorkerService;