// Mock Audio Worker Service
import type { 
  AudioProcessingMessage, 
  AudioProcessingResponse
} from '../../../src/types/workers';
import type {
  AudioConversionResult,
  AudioConversionCallback
} from '../../../src/types/services';

class MockAudioWorkerService {
  private pendingConversions = new Map<string, AudioConversionCallback>();
  private isWorkerLoaded = true; // Always loaded in tests

  async initialize(): Promise<void> {
    // Mock initialization - immediate resolve
    this.isWorkerLoaded = true;
  }

  async convertToMP3(
    webmBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<AudioConversionResult> {
    return this.mockConversion(webmBuffer, 'mp3', onProgress);
  }

  async convertToWAV(
    webmBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<AudioConversionResult> {
    return this.mockConversion(webmBuffer, 'wav', onProgress);
  }

  private async mockConversion(
    webmBuffer: ArrayBuffer,
    format: 'mp3' | 'wav',
    onProgress?: (progress: number) => void
  ): Promise<AudioConversionResult> {
    // Simulate conversion progress
    if (onProgress) {
      const steps = [0.1, 0.3, 0.6, 0.8, 1.0];
      for (const progress of steps) {
        await new Promise(resolve => setTimeout(resolve, 10));
        onProgress(progress);
      }
    }

    // Create mock output buffer
    const outputSize = Math.floor(webmBuffer.byteLength * 0.8); // Simulate compression
    const outputBuffer = new ArrayBuffer(outputSize);
    const view = new Uint8Array(outputBuffer);
    
    // Add format-specific headers
    if (format === 'mp3') {
      // Mock MP3 header
      view[0] = 0xFF; // MP3 sync word
      view[1] = 0xFB; // MP3 sync word + version + layer
    } else if (format === 'wav') {
      // Mock WAV header
      const header = 'RIFF';
      for (let i = 0; i < header.length; i++) {
        view[i] = header.charCodeAt(i);
      }
    }

    // Fill with mock audio data
    for (let i = 20; i < view.length; i++) {
      view[i] = Math.floor(Math.random() * 256);
    }

    return {
      buffer: outputBuffer,
      mimeType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
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
  simulateError(message: string = 'Mock conversion error'): void {
    throw new Error(message);
  }

  getPendingConversions(): number {
    return this.pendingConversions.size;
  }
}

// Export singleton instance
export const audioWorkerService = new MockAudioWorkerService();

// Default export for compatibility
export default audioWorkerService;