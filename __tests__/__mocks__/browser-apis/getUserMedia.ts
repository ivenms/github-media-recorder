// getUserMedia and MediaDevices API mock

// Mock MediaStreamTrack
class MockMediaStreamTrack extends EventTarget {
  id: string;
  kind: 'audio' | 'video';
  label: string;
  enabled: boolean;
  muted: boolean;
  readyState: 'live' | 'ended';
  
  constructor(kind: 'audio' | 'video' = 'audio', label?: string) {
    super();
    this.id = `mock-track-${kind}-${Math.random().toString(36).substr(2, 9)}`;
    this.kind = kind;
    this.label = label || `Mock ${kind} track`;
    this.enabled = true;
    this.muted = false;
    this.readyState = 'live';
  }

  stop() {
    this.readyState = 'ended';
    this.dispatchEvent(new Event('ended'));
  }

  clone() {
    return new MockMediaStreamTrack(this.kind, this.label);
  }

  getSettings() {
    return {
      deviceId: `mock-device-${this.kind}`,
      groupId: 'mock-group',
      ...(this.kind === 'audio' && {
        sampleRate: 44100,
        sampleSize: 16,
        channelCount: 2,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }),
      ...(this.kind === 'video' && {
        width: 1280,
        height: 720,
        frameRate: 30,
        facingMode: 'user',
      }),
    };
  }

  getConstraints() {
    return {
      ...(this.kind === 'audio' && {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }),
      ...(this.kind === 'video' && {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      }),
    };
  }

  getCapabilities() {
    return {
      deviceId: `mock-device-${this.kind}`,
      groupId: 'mock-group',
      ...(this.kind === 'audio' && {
        sampleRate: { min: 8000, max: 48000 },
        sampleSize: { min: 8, max: 32 },
        channelCount: { min: 1, max: 2 },
        echoCancellation: [true, false],
        noiseSuppression: [true, false],
        autoGainControl: [true, false],
      }),
      ...(this.kind === 'video' && {
        width: { min: 320, max: 1920 },
        height: { min: 240, max: 1080 },
        frameRate: { min: 10, max: 60 },
        facingMode: ['user', 'environment'],
      }),
    };
  }

  applyConstraints(_constraints: any) {
    return Promise.resolve();
  }
}

// Mock MediaStream
class MockMediaStream extends EventTarget {
  id: string;
  active: boolean;
  private tracks: MockMediaStreamTrack[];

  constructor(tracks: MockMediaStreamTrack[] = []) {
    super();
    this.id = `mock-stream-${Math.random().toString(36).substr(2, 9)}`;
    this.active = true;
    this.tracks = tracks;
  }

  getTracks() {
    return [...this.tracks];
  }

  getAudioTracks() {
    return this.tracks.filter(track => track.kind === 'audio');
  }

  getVideoTracks() {
    return this.tracks.filter(track => track.kind === 'video');
  }

  getTrackById(trackId: string) {
    return this.tracks.find(track => track.id === trackId) || null;
  }

  addTrack(track: MockMediaStreamTrack) {
    if (!this.tracks.includes(track)) {
      this.tracks.push(track);
      this.dispatchEvent(new Event('addtrack'));
    }
  }

  removeTrack(track: MockMediaStreamTrack) {
    const index = this.tracks.indexOf(track);
    if (index !== -1) {
      this.tracks.splice(index, 1);
      this.dispatchEvent(new Event('removetrack'));
    }
  }

  clone() {
    const clonedTracks = this.tracks.map(track => track.clone());
    return new MockMediaStream(clonedTracks);
  }
}

// Mock MediaDevices
const mockMediaDevices = {
  getUserMedia: jest.fn((constraints: MediaStreamConstraints = {}) => {
    return new Promise<MediaStream>((resolve, reject) => {
      // Simulate async behavior
      setTimeout(() => {
        try {
          const tracks: MockMediaStreamTrack[] = [];
          
          // Add audio track if requested
          if (constraints.audio) {
            tracks.push(new MockMediaStreamTrack('audio'));
          }
          
          // Add video track if requested
          if (constraints.video) {
            tracks.push(new MockMediaStreamTrack('video'));
          }
          
          const stream = new MockMediaStream(tracks);
          resolve(stream as any);
        } catch (error) {
          reject(new DOMException('NotAllowedError', 'Permission denied'));
        }
      }, 10);
    });
  }),

  enumerateDevices: jest.fn(() => {
    return Promise.resolve([
      {
        deviceId: 'mock-audio-input-1',
        kind: 'audioinput' as MediaDeviceKind,
        label: 'Mock Microphone 1',
        groupId: 'mock-group-1',
      },
      {
        deviceId: 'mock-audio-input-2',
        kind: 'audioinput' as MediaDeviceKind,
        label: 'Mock Microphone 2',
        groupId: 'mock-group-2',
      },
      {
        deviceId: 'mock-video-input-1',
        kind: 'videoinput' as MediaDeviceKind,
        label: 'Mock Camera 1',
        groupId: 'mock-group-3',
      },
      {
        deviceId: 'mock-video-input-2',
        kind: 'videoinput' as MediaDeviceKind,
        label: 'Mock Camera 2',
        groupId: 'mock-group-4',
      },
      {
        deviceId: 'mock-audio-output-1',
        kind: 'audiooutput' as MediaDeviceKind,
        label: 'Mock Speaker 1',
        groupId: 'mock-group-5',
      },
    ]);
  }),

  getDisplayMedia: jest.fn((_constraints: any = {}) => {
    return Promise.resolve(new MockMediaStream([
      new MockMediaStreamTrack('video', 'Screen capture'),
      new MockMediaStreamTrack('audio', 'System audio'),
    ]) as any);
  }),

  getSupportedConstraints: jest.fn(() => ({
    width: true,
    height: true,
    frameRate: true,
    facingMode: true,
    sampleRate: true,
    sampleSize: true,
    channelCount: true,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  })),
};

// Mock navigator.mediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

// Legacy getUserMedia for older browsers
Object.defineProperty(navigator, 'getUserMedia', {
  value: mockMediaDevices.getUserMedia,
  writable: true,
});

// Add webkit prefixed versions
Object.defineProperty(navigator, 'webkitGetUserMedia', {
  value: mockMediaDevices.getUserMedia,
  writable: true,
});

Object.defineProperty(navigator, 'mozGetUserMedia', {
  value: mockMediaDevices.getUserMedia,
  writable: true,
});

// Export for testing
export { MockMediaStream, MockMediaStreamTrack, mockMediaDevices };

// Test utilities for getUserMedia
export const getUserMediaTestUtils = {
  // Mock permission denied
  mockPermissionDenied: () => {
    mockMediaDevices.getUserMedia.mockRejectedValueOnce(
      new DOMException('Permission denied', 'NotAllowedError')
    );
  },

  // Mock device not found
  mockDeviceNotFound: () => {
    mockMediaDevices.getUserMedia.mockRejectedValueOnce(
      new DOMException('Requested device not found', 'NotFoundError')
    );
  },

  // Mock not supported
  mockNotSupported: () => {
    mockMediaDevices.getUserMedia.mockRejectedValueOnce(
      new DOMException('getUserMedia is not supported', 'NotSupportedError')
    );
  },

  // Mock overconstrained
  mockOverconstrained: (constraint: string = 'width') => {
    const error = new Error('Overconstrained') as any;
    error.name = 'OverconstrainedError';
    error.constraint = constraint;
    mockMediaDevices.getUserMedia.mockRejectedValueOnce(error);
  },

  // Create mock stream with specific tracks
  createMockStream: (audioTracks: number = 1, videoTracks: number = 0) => {
    const tracks: MockMediaStreamTrack[] = [];
    
    for (let i = 0; i < audioTracks; i++) {
      tracks.push(new MockMediaStreamTrack('audio', `Audio track ${i + 1}`));
    }
    
    for (let i = 0; i < videoTracks; i++) {
      tracks.push(new MockMediaStreamTrack('video', `Video track ${i + 1}`));
    }
    
    return new MockMediaStream(tracks);
  },

  // Simulate track ending
  simulateTrackEnded: (track: MockMediaStreamTrack) => {
    track.readyState = 'ended';
    track.dispatchEvent(new Event('ended'));
  },

  // Reset all mocks
  resetMocks: () => {
    jest.clearAllMocks();
    mockMediaDevices.getUserMedia.mockImplementation((constraints: MediaStreamConstraints = {}) => {
      return Promise.resolve(getUserMediaTestUtils.createMockStream(
        constraints.audio ? 1 : 0,
        constraints.video ? 1 : 0
      ) as any);
    });
  },
};