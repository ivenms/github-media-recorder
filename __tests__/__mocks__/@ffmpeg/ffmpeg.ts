// FFmpeg.js mock
export class FFmpeg {
  loaded: boolean = false;
  progress: number = 0;
  private progressCallback?: (progress: { progress: number; time: number }) => void;
  private logCallback?: (log: { type: string; message: string }) => void;

  constructor() {
    this.loaded = false;
    this.progress = 0;
  }

  // Mock load method
  async load() {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        this.loaded = true;
        resolve();
      }, 100); // Simulate loading time
    });
  }

  // Mock writeFile method
  async writeFile(path: string, data: Uint8Array | string) {
    if (!this.loaded) {
      throw new Error('FFmpeg not loaded');
    }
    
    // Simulate file writing
    return Promise.resolve();
  }

  // Mock readFile method
  async readFile(path: string): Promise<Uint8Array> {
    if (!this.loaded) {
      throw new Error('FFmpeg not loaded');
    }

    // Create mock output data based on file extension
    const mockData = new Uint8Array(1000);
    
    // Fill with some mock data that resembles the expected format
    if (path.endsWith('.mp3')) {
      // Mock MP3 header
      mockData[0] = 0xFF; // MP3 sync word
      mockData[1] = 0xFB; // MP3 sync word + version + layer
    } else if (path.endsWith('.wav')) {
      // Mock WAV header
      const header = 'RIFF';
      for (let i = 0; i < header.length; i++) {
        mockData[i] = header.charCodeAt(i);
      }
    } else if (path.endsWith('.mp4')) {
      // Mock MP4 header
      const header = 'ftyp';
      for (let i = 4; i < 4 + header.length; i++) {
        mockData[i] = header.charCodeAt(i - 4);
      }
    }
    
    // Fill rest with random data
    for (let i = 20; i < mockData.length; i++) {
      mockData[i] = Math.floor(Math.random() * 256);
    }

    return mockData;
  }

  // Mock exec method
  async exec(args: string[]): Promise<void> {
    if (!this.loaded) {
      throw new Error('FFmpeg not loaded');
    }

    return new Promise((resolve, reject) => {
      let progress = 0;
      const totalDuration = 100; // Mock total duration in seconds
      
      // Simulate conversion progress
      const progressInterval = setInterval(() => {
        progress += Math.random() * 20;
        
        if (progress >= 100) {
          progress = 100;
          clearInterval(progressInterval);
          
          // Final progress callback
          if (this.progressCallback) {
            this.progressCallback({ progress: 1, time: totalDuration });
          }
          
          // Final log
          if (this.logCallback) {
            this.logCallback({ type: 'info', message: 'Conversion completed successfully' });
          }
          
          resolve();
        } else {
          // Progress callback
          if (this.progressCallback) {
            this.progressCallback({ 
              progress: progress / 100, 
              time: (progress / 100) * totalDuration 
            });
          }
          
          // Log callback
          if (this.logCallback) {
            this.logCallback({ 
              type: 'info', 
              message: `Processing... ${Math.round(progress)}%` 
            });
          }
        }
      }, 50);
      
      // Simulate potential errors
      if (args.includes('--error-test')) {
        setTimeout(() => {
          clearInterval(progressInterval);
          reject(new Error('Mock FFmpeg error'));
        }, 200);
      }
    });
  }

  // Mock terminate method
  terminate() {
    this.loaded = false;
    this.progress = 0;
    this.progressCallback = undefined;
    this.logCallback = undefined;
  }

  // Mock on method for event handling
  on(event: string, callback: any) {
    if (event === 'progress') {
      this.progressCallback = callback;
    } else if (event === 'log') {
      this.logCallback = callback;
    }
  }

  // Mock off method for removing event listeners
  off(event: string, callback?: any) {
    if (event === 'progress') {
      this.progressCallback = undefined;
    } else if (event === 'log') {
      this.logCallback = undefined;
    }
  }

  // Test utility methods
  simulateProgress(progress: number, time: number = 0) {
    if (this.progressCallback) {
      this.progressCallback({ progress, time });
    }
  }

  simulateLog(type: string, message: string) {
    if (this.logCallback) {
      this.logCallback({ type, message });
    }
  }

  simulateError(message: string = 'Mock FFmpeg error') {
    throw new Error(message);
  }
}

// Export default
export default FFmpeg;