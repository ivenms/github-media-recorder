// Global setup for Jest tests - runs before setupTests.ts
import 'fake-indexeddb/auto';

// Global polyfills for browser APIs
global.structuredClone = global.structuredClone || ((val: any) => JSON.parse(JSON.stringify(val)));

// Define global for compatibility (same as in vite.config.ts)
global.global = globalThis;

// Mock URL.createObjectURL and revokeObjectURL
if (!global.URL || !global.URL.createObjectURL) {
  let urlCounter = 0;
  global.URL = {
    createObjectURL: jest.fn(() => {
      urlCounter++;
      return `blob:mock-audio-url-${urlCounter}`;
    }),
    revokeObjectURL: jest.fn(),
  } as any;
}

// Mock File constructor
global.File = global.File || class MockFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  
  constructor(bits: any[], name: string, options: any = {}) {
    this.name = name;
    this.size = bits.reduce((acc, bit) => acc + (bit.length || 0), 0);
    this.type = options.type || '';
    this.lastModified = options.lastModified || Date.now();
  }
};

// Mock Blob constructor
global.Blob = global.Blob || class MockBlob {
  size: number;
  type: string;
  
  constructor(parts: any[] = [], options: any = {}) {
    this.size = parts.reduce((acc, part) => acc + (part.length || 0), 0);
    this.type = options.type || '';
  }
  
  arrayBuffer() {
    return Promise.resolve(new ArrayBuffer(this.size));
  }
  
  text() {
    return Promise.resolve('');
  }
  
  stream() {
    return new ReadableStream();
  }
  
  slice() {
    return new MockBlob();
  }
};

// Mock ReadableStream
global.ReadableStream = global.ReadableStream || class MockReadableStream {
  constructor() {}
  
  getReader() {
    return {
      read: () => Promise.resolve({ done: true, value: undefined }),
      releaseLock: () => {},
    };
  }
};

// Mock SharedArrayBuffer (required for FFmpeg)
global.SharedArrayBuffer = global.SharedArrayBuffer || ArrayBuffer;

// Mock crypto for secure random values
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    randomUUID: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    }),
  },
});

// Mock fetch for HTTP requests
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    blob: () => Promise.resolve(new Blob()),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    headers: new Map(),
    clone: jest.fn(),
  } as any)
);

// Note: Skip window.location and navigator mocking for now 
// as they are already provided by jsdom and can cause conflicts

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Note: Console suppression moved to setupTests.ts where beforeAll/afterAll are available