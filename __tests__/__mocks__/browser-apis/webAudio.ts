// Web Audio API mock - simplified version without external dependencies

// Create mock audio context
const createMockAudioContext = () => {
  const context = {
    // Mock methods used in waveform visualization
    createAnalyser: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      fftSize: 2048,
      frequencyBinCount: 1024,
      getByteFrequencyData: jest.fn((array: Uint8Array) => {
        // Fill with mock frequency data
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 255);
        }
      }),
      getByteTimeDomainData: jest.fn((array: Uint8Array) => {
        // Fill with mock time domain data (waveform)
        for (let i = 0; i < array.length; i++) {
          array[i] = 128 + Math.sin(i * 0.1) * 50; // Mock sine wave
        }
      }),
      getFloatFrequencyData: jest.fn(),
      getFloatTimeDomainData: jest.fn(),
      smoothingTimeConstant: 0.8,
      minDecibels: -100,
      maxDecibels: -30,
    })),
    
    createMediaStreamSource: jest.fn((stream: MediaStream) => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      mediaStream: stream,
    })),
    
    createGain: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      gain: {
        value: 1,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
    })),
    
    createOscillator: jest.fn(() => ({
      connect: jest.fn(),
      disconnect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      frequency: {
        value: 440,
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
      type: 'sine' as OscillatorType,
    })),
    
    // Mock timing and state
    currentTime: 0,
    sampleRate: 44100,
    state: 'running' as AudioContextState,
    
    // Mock lifecycle methods
    suspend: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    
    // Mock destination
    destination: {
      connect: jest.fn(),
      disconnect: jest.fn(),
      channelCount: 2,
      channelCountMode: 'max' as ChannelCountMode,
      channelInterpretation: 'speakers' as ChannelInterpretation,
    },
  };
  
  return context;
};

// Mock the global AudioContext
const MockWebAudioContext = jest.fn().mockImplementation(createMockAudioContext);
global.AudioContext = MockWebAudioContext;
global.webkitAudioContext = MockWebAudioContext;

// Mock MediaStreamAudioSourceNode
global.MediaStreamAudioSourceNode = jest.fn().mockImplementation((context, options) => ({
  context,
  mediaStream: options.mediaStream,
  connect: jest.fn(),
  disconnect: jest.fn(),
  channelCount: 2,
  channelCountMode: 'max' as ChannelCountMode,
  channelInterpretation: 'speakers' as ChannelInterpretation,
}));

// Mock AnalyserNode
global.AnalyserNode = jest.fn().mockImplementation((context) => ({
  context,
  connect: jest.fn(),
  disconnect: jest.fn(),
  fftSize: 2048,
  frequencyBinCount: 1024,
  getByteFrequencyData: jest.fn(),
  getByteTimeDomainData: jest.fn(),
  getFloatFrequencyData: jest.fn(),
  getFloatTimeDomainData: jest.fn(),
  smoothingTimeConstant: 0.8,
  minDecibels: -100,
  maxDecibels: -30,
  channelCount: 2,
  channelCountMode: 'max' as ChannelCountMode,
  channelInterpretation: 'speakers' as ChannelInterpretation,
}));

// Mock GainNode
global.GainNode = jest.fn().mockImplementation((context) => ({
  context,
  connect: jest.fn(),
  disconnect: jest.fn(),
  gain: {
    value: 1,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  },
  channelCount: 2,
  channelCountMode: 'max' as ChannelCountMode,
  channelInterpretation: 'speakers' as ChannelInterpretation,
}));

// Mock OscillatorNode
global.OscillatorNode = jest.fn().mockImplementation((context) => ({
  context,
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  frequency: {
    value: 440,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  },
  type: 'sine' as OscillatorType,
  channelCount: 2,
  channelCountMode: 'max' as ChannelCountMode,
  channelInterpretation: 'speakers' as ChannelInterpretation,
}));

// Export for testing
export { MockWebAudioContext, createMockAudioContext };

// Test utilities for Web Audio API
export const webAudioTestUtils = {
  // Create a mock analyser with specific frequency data
  createMockAnalyserWithData: (frequencyData: number[], timeData?: number[]) => {
    const analyser = createMockAudioContext().createAnalyser();
    
    analyser.getByteFrequencyData = jest.fn((array: Uint8Array) => {
      for (let i = 0; i < Math.min(array.length, frequencyData.length); i++) {
        array[i] = frequencyData[i];
      }
    });
    
    if (timeData) {
      analyser.getByteTimeDomainData = jest.fn((array: Uint8Array) => {
        for (let i = 0; i < Math.min(array.length, timeData.length); i++) {
          array[i] = timeData[i];
        }
      });
    }
    
    return analyser;
  },
  
  // Simulate audio context state changes
  simulateAudioContextStateChange: (context: any, newState: AudioContextState) => {
    context.state = newState;
    context.dispatchEvent(new Event('statechange'));
  },
  
  // Create mock media stream source
  createMockMediaStreamSource: (stream: MediaStream) => {
    const context = createMockAudioContext();
    return context.createMediaStreamSource(stream);
  },
};