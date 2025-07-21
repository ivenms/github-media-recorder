// Jest test setup - runs after setupGlobals.ts
import '@testing-library/jest-dom';
// import { server } from '../__tests__/__mocks__/server'; // Temporarily disabled
import '../__tests__/__mocks__/browser-apis/mediaRecorder';
import '../__tests__/__mocks__/browser-apis/webAudio';
import '../__tests__/__mocks__/browser-apis/getUserMedia';

// Console suppression during tests
const originalWarn = console.warn;
const originalError = console.error;

// Setup without MSW for now
beforeAll(() => {
  // Suppress console warnings during tests
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

afterAll(() => {
  // Restore console functions
  console.warn = originalWarn;
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Helper to create mock files
  createMockFile: (name: string, size: number = 1000, type: string = 'audio/webm') => {
    const file = new File(['mock-content'], name, { type });
    Object.defineProperty(file, 'size', { value: size });
    return file;
  },
  
  // Helper to create mock audio/video streams
  createMockMediaStream: (tracks: any[] = []) => {
    const stream = {
      id: 'mock-stream-id',
      active: true,
      getTracks: jest.fn(() => tracks),
      getAudioTracks: jest.fn(() => tracks.filter(t => t.kind === 'audio')),
      getVideoTracks: jest.fn(() => tracks.filter(t => t.kind === 'video')),
      addTrack: jest.fn(),
      removeTrack: jest.fn(),
      clone: jest.fn(() => stream),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
    return stream;
  },
  
  // Helper to create mock media tracks
  createMockMediaTrack: (kind: 'audio' | 'video' = 'audio') => ({
    id: `mock-track-${kind}`,
    kind,
    label: `Mock ${kind} track`,
    enabled: true,
    muted: false,
    readyState: 'live',
    stop: jest.fn(),
    clone: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    getSettings: jest.fn(() => ({})),
    getConstraints: jest.fn(() => ({})),
    getCapabilities: jest.fn(() => ({})),
    applyConstraints: jest.fn(() => Promise.resolve()),
  }),
  
  // Helper to simulate user interactions
  async waitForAsync() {
    await new Promise(resolve => setTimeout(resolve, 0));
  },
  
  // Helper to trigger events
  triggerEvent: (element: any, eventType: string, eventData: any = {}) => {
    const event = new Event(eventType, { bubbles: true });
    Object.assign(event, eventData);
    element.dispatchEvent(event);
  },
};

// Extend Jest matchers
expect.extend({
  toBeValidFile(received: any) {
    const pass = received instanceof File && received.name && received.size >= 0;
    return {
      message: () => `expected ${received} to be a valid File object`,
      pass,
    };
  },
  
  toHaveBeenCalledWithFile(received: any, filename?: string) {
    const calls = received.mock.calls;
    const pass = calls.some((call: any[]) => {
      const file = call.find((arg: any) => arg instanceof File);
      return file && (!filename || file.name === filename);
    });
    return {
      message: () => `expected ${received} to have been called with a File${filename ? ` named "${filename}"` : ''}`,
      pass,
    };
  },
});

// Type declarations for global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidFile(): R;
      toHaveBeenCalledWithFile(filename?: string): R;
    }
  }
  
  var testUtils: {
    createMockFile: (name: string, size?: number, type?: string) => File;
    createMockMediaStream: (tracks?: any[]) => any;
    createMockMediaTrack: (kind?: 'audio' | 'video') => any;
    waitForAsync: () => Promise<void>;
    triggerEvent: (element: any, eventType: string, eventData?: any) => void;
  };
}