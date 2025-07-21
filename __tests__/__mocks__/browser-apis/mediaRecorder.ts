// MediaRecorder API mock
class MockMediaRecorder extends EventTarget {
  static isTypeSupported = jest.fn((type: string) => {
    // Support common formats used in the app
    return ['audio/webm', 'video/webm', 'audio/mp4', 'video/mp4'].some(format => 
      type.includes(format)
    );
  });

  stream: MediaStream;
  mimeType: string;
  state: 'inactive' | 'recording' | 'paused';
  videoBitsPerSecond?: number;
  audioBitsPerSecond?: number;
  
  // Event handler properties
  ondataavailable: ((event: any) => void) | null = null;
  onstop: ((event: any) => void) | null = null;
  onstart: ((event: any) => void) | null = null;
  onpause: ((event: any) => void) | null = null;
  onresume: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  
  // Mock data for testing
  private chunks: Blob[] = [];
  private recordingStartTime: number = 0;

  constructor(stream: MediaStream, options: MediaRecorderOptions = {}) {
    super();
    this.stream = stream;
    this.mimeType = options.mimeType || 'audio/webm';
    this.state = 'inactive';
    this.videoBitsPerSecond = options.videoBitsPerSecond;
    this.audioBitsPerSecond = options.audioBitsPerSecond;
  }

  start = jest.fn((timeslice?: number) => {
    if (this.state !== 'inactive') {
      throw new DOMException('InvalidState', 'MediaRecorder is not in inactive state');
    }

    this.state = 'recording';
    this.recordingStartTime = Date.now();
    this.chunks = [];

    // Dispatch start event
    setTimeout(() => {
      const event = new Event('start');
      this.dispatchEvent(event);
      if (this.onstart) {
        this.onstart(event);
      }
    }, 0);

    // Simulate data available events
    if (timeslice) {
      this.simulateDataAvailable(timeslice);
    }
  });

  stop = jest.fn(() => {
    if (this.state === 'inactive') {
      throw new DOMException('InvalidState', 'MediaRecorder is not active');
    }

    this.state = 'inactive';

    // Dispatch final dataavailable event with all data
    setTimeout(() => {
      const finalBlob = this.createMockBlob();
      const dataEvent = new CustomEvent('dataavailable', { detail: { data: finalBlob } }) as any;
      dataEvent.data = finalBlob; // Also set data property directly
      this.dispatchEvent(dataEvent);
      if (this.ondataavailable) {
        this.ondataavailable(dataEvent);
      }
      
      // Dispatch stop event
      const stopEvent = new Event('stop');
      this.dispatchEvent(stopEvent);
      if (this.onstop) {
        this.onstop(stopEvent);
      }
    }, 0);
  });

  pause = jest.fn(() => {
    if (this.state !== 'recording') {
      throw new DOMException('InvalidState', 'MediaRecorder is not recording');
    }

    this.state = 'paused';
    setTimeout(() => {
      this.dispatchEvent(new Event('pause'));
    }, 0);
  });

  resume = jest.fn(() => {
    if (this.state !== 'paused') {
      throw new DOMException('InvalidState', 'MediaRecorder is not paused');
    }

    this.state = 'recording';
    setTimeout(() => {
      this.dispatchEvent(new Event('resume'));
    }, 0);
  });

  requestData = jest.fn(() => {
    if (this.state === 'inactive') {
      throw new DOMException('InvalidState', 'MediaRecorder is not active');
    }

    setTimeout(() => {
      const blob = this.createMockBlob();
      this.dispatchEvent(new CustomEvent('dataavailable', { detail: { data: blob } }));
    }, 0);
  });

  private simulateDataAvailable(interval: number) {
    if (this.state === 'recording') {
      setTimeout(() => {
        const blob = this.createMockBlob();
        const dataEvent = new CustomEvent('dataavailable', { detail: { data: blob } }) as any;
        dataEvent.data = blob; // Also set data property directly
        this.dispatchEvent(dataEvent);
        if (this.ondataavailable) {
          this.ondataavailable(dataEvent);
        }
        
        // Continue if still recording
        if (this.state === 'recording') {
          this.simulateDataAvailable(interval);
        }
      }, interval);
    }
  }

  private createMockBlob(): Blob {
    // Create a mock blob with appropriate MIME type
    const content = new Array(1000).fill(0).map(() => Math.random()).join('');
    const blob = new Blob([content], { type: this.mimeType });
    
    // Add to chunks for testing purposes
    this.chunks.push(blob);
    
    return blob;
  }

  // Test utility methods
  getMockChunks() {
    return this.chunks;
  }

  getRecordingDuration() {
    return this.recordingStartTime ? Date.now() - this.recordingStartTime : 0;
  }
}

// Store instances for testing
const instances: MockMediaRecorder[] = [];

// Mock the global MediaRecorder as a Jest mock function
const MediaRecorderMock = jest.fn().mockImplementation((stream: MediaStream, options?: MediaRecorderOptions) => {
  const instance = new MockMediaRecorder(stream, options);
  instances.push(instance);
  return instance;
});

// Add static method to the mock
(MediaRecorderMock as any).isTypeSupported = MockMediaRecorder.isTypeSupported;
// Add instances array for testing
(MediaRecorderMock as any).instances = instances;

// Assign to global
global.MediaRecorder = MediaRecorderMock as any;

// Export for use in tests
export { MockMediaRecorder };
export default MediaRecorderMock;

// Mock MediaRecorderOptions interface
export interface MediaRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
  videoBitsPerSecond?: number;
  bitsPerSecond?: number;
}