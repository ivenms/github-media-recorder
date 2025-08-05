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

  // Updated to match actual API
  async convertAudio(
    audioData: Uint8Array,
    format: 'mp3' | 'wav',
    onProgress?: (progress: number, phase: string) => void
  ): Promise<AudioConversionResult> {
    return this.mockConversion(audioData, format, onProgress);
  }

  private async mockConversion(
    audioData: Uint8Array,
    format: 'mp3' | 'wav',
    onProgress?: (progress: number, phase: string) => void
  ): Promise<AudioConversionResult> {
    // Simulate conversion progress with phases
    if (onProgress) {
      const steps = [
        { progress: 10, phase: 'Loading FFmpeg...' },
        { progress: 25, phase: 'Setting up conversion...' },
        { progress: 50, phase: `Converting to ${format.toUpperCase()}...` },
        { progress: 75, phase: 'Processing audio...' },
        { progress: 90, phase: 'Finalizing...' },
        { progress: 100, phase: 'Conversion complete!' }
      ];
      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 10));
        onProgress(step.progress, step.phase);
      }
    }

    // Create mock output - return the expected structure
    const convertedData = new Uint8Array(Math.floor(audioData.length * 0.8)); // Simulate compression
    
    // Add format-specific headers
    if (format === 'mp3') {
      // Mock MP3 header
      convertedData[0] = 0xFF; // MP3 sync word
      convertedData[1] = 0xFB; // MP3 sync word + version + layer
    } else if (format === 'wav') {
      // Mock WAV header
      const header = 'RIFF';
      for (let i = 0; i < header.length; i++) {
        convertedData[i] = header.charCodeAt(i);
      }
    }

    // Fill with mock audio data
    for (let i = 20; i < convertedData.length; i++) {
      convertedData[i] = Math.floor(Math.random() * 256);
    }

    return {
      convertedData,
      originalSize: audioData.length,
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
  simulateError(message: string = 'Mock conversion error'): void {
    throw new Error(message);
  }

  // Legacy methods for backward compatibility
  async initialize(): Promise<void> {
    this.isWorkerLoaded = true;
  }

  async convertToMP3(
    webmBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<AudioConversionResult> {
    const audioData = new Uint8Array(webmBuffer);
    const progressWrapper = onProgress ? (progress: number, _phase: string) => onProgress(progress / 100) : undefined;
    return this.convertAudio(audioData, 'mp3', progressWrapper);
  }

  async convertToWAV(
    webmBuffer: ArrayBuffer,
    onProgress?: (progress: number) => void
  ): Promise<AudioConversionResult> {
    const audioData = new Uint8Array(webmBuffer);
    const progressWrapper = onProgress ? (progress: number, _phase: string) => onProgress(progress / 100) : undefined;
    return this.convertAudio(audioData, 'wav', progressWrapper);
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
export const audioWorkerService = new MockAudioWorkerService();

// Default export for compatibility
export default audioWorkerService;