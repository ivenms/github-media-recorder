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
global.Blob = class MockBlob {
  size: number;
  type: string;
  
  constructor(parts: any[] = [], options: any = {}) {
    // Calculate size more accurately for ArrayBuffers
    this.size = parts.reduce((acc, part) => {
      if (part instanceof ArrayBuffer) {
        return acc + part.byteLength;
      } else if (part && typeof part.length === 'number') {
        return acc + part.length;
      } else if (typeof part === 'string') {
        return acc + part.length;
      }
      return acc;
    }, 0);
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

// Mock WritableStream
global.WritableStream = global.WritableStream || class MockWritableStream {
  constructor() {}
  
  getWriter() {
    return {
      write: () => Promise.resolve(),
      close: () => Promise.resolve(),
      abort: () => Promise.resolve(),
      releaseLock: () => {},
    };
  }
};

// Mock TransformStream
global.TransformStream = global.TransformStream || class MockTransformStream {
  readable: ReadableStream;
  writable: WritableStream;
  
  constructor() {
    this.readable = new ReadableStream();
    this.writable = new WritableStream();
  }
};

// Mock SharedArrayBuffer (required for FFmpeg)
global.SharedArrayBuffer = global.SharedArrayBuffer || ArrayBuffer;

// Mock TextEncoder and TextDecoder for MSW
global.TextEncoder = global.TextEncoder || class MockTextEncoder {
  encode(input: string) {
    const utf8 = unescape(encodeURIComponent(input));
    const result = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) {
      result[i] = utf8.charCodeAt(i);
    }
    return result;
  }
};

global.TextDecoder = global.TextDecoder || class MockTextDecoder {
  decode(input?: Uint8Array) {
    if (!input) return '';
    let result = '';
    for (let i = 0; i < input.length; i++) {
      result += String.fromCharCode(input[i]);
    }
    return decodeURIComponent(escape(result));
  }
};

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

// Mock Response for MSW compatibility
global.Response = global.Response || class MockResponse {
  ok: boolean;
  status: number;
  statusText: string;
  headers: Map<string, string>;
  url: string;
  body: any;

  constructor(body?: any, init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.ok = this.status >= 200 && this.status < 300;
    this.headers = new Map(Object.entries(init.headers || {}));
    this.url = '';
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }

  async blob() {
    return new Blob([this.body || '']);
  }

  async arrayBuffer() {
    const text = await this.text();
    return new ArrayBuffer(text.length);
  }

  clone() {
    return new MockResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers),
    });
  }
};

// Mock Request for MSW compatibility
global.Request = global.Request || class MockRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  body: any;

  constructor(url: string, init: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body;
  }

  async json() {
    return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body || '');
  }

  clone() {
    return new MockRequest(this.url, {
      method: this.method,
      headers: Object.fromEntries(this.headers),
      body: this.body,
    });
  }
};

// Mock Headers for MSW compatibility
global.Headers = global.Headers || class MockHeaders extends Map<string, string> {
  constructor(init?: Record<string, string> | [string, string][]) {
    super();
    if (init) {
      if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.set(key, value));
      } else {
        Object.entries(init).forEach(([key, value]) => this.set(key, value));
      }
    }
  }

  append(name: string, value: string) {
    const existing = this.get(name);
    this.set(name, existing ? `${existing}, ${value}` : value);
  }
};

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

// Mock BroadcastChannel for MSW
global.BroadcastChannel = global.BroadcastChannel || class MockBroadcastChannel {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  postMessage(message: any) {
    // Mock implementation - do nothing
  }

  close() {
    // Mock implementation - do nothing
  }

  addEventListener() {
    // Mock implementation
  }

  removeEventListener() {
    // Mock implementation
  }
};

// Mock Canvas and Image for image processing tests
global.HTMLCanvasElement = global.HTMLCanvasElement || class MockCanvas {
  width = 0;
  height = 0;
  
  getContext(contextType?: string) {
    if (contextType === '2d') {
      return {
        drawImage: jest.fn(),
        fillRect: jest.fn(),
        clearRect: jest.fn(),
        getImageData: jest.fn(),
        putImageData: jest.fn(),
      };
    }
    return null;
  }
  
  toBlob(callback: (blob: Blob | null) => void, type = 'image/png', quality = 0.92) {
    // Simulate successful conversion immediately using queueMicrotask
    queueMicrotask(() => {
      callback(new Blob(['mock-image-data'], { type }));
    });
  }
};

global.HTMLImageElement = global.HTMLImageElement || class MockImage {
  width = 100;
  height = 100;
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  set src(value: string) {
    // Simulate image load
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
};

// Mock Image constructor
global.Image = global.Image || class MockImageConstructor {
  width = 100;
  height = 100;
  private _src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  constructor() {}
  
  get src() {
    return this._src;
  }
  
  set src(value: string) {
    this._src = value;
    // Simulate image load success for blob URLs and data URLs
    // Use queueMicrotask for more immediate execution
    queueMicrotask(() => {
      if (value && this.onload) {
        // Accept any blob URL (including our mock URLs)
        if (value.startsWith('blob:') || value.startsWith('data:')) {
          this.onload();
        }
      } else if (value && this.onerror && !value.startsWith('blob:') && !value.startsWith('data:')) {
        this.onerror();
      }
    });
  }
};

// Mock AudioContext for audio processing tests
global.AudioContext = global.AudioContext || class MockAudioContext {
  sampleRate = 44100;
  
  decodeAudioData(arrayBuffer: ArrayBuffer) {
    return Promise.resolve({
      length: 1000,
      sampleRate: this.sampleRate,
      numberOfChannels: 1,
      getChannelData: (channel: number) => new Float32Array(1000).fill(0.1),
    });
  }
  
  close() {
    return Promise.resolve();
  }
};

// Add webkitAudioContext for compatibility
(global as any).webkitAudioContext = global.AudioContext;

// Ensure window object has the same mocks when in browser-like environment
if (typeof window !== 'undefined') {
  (window as any).AudioContext = global.AudioContext;
  (window as any).webkitAudioContext = global.AudioContext;
} else {
  // In Node/Jest environment, create a mock window object
  (global as any).window = {
    AudioContext: global.AudioContext,
    webkitAudioContext: global.AudioContext,
  };
}

// Mock document.createElement for tests
const originalCreateElement = global.document?.createElement;
if (global.document) {
  global.document.createElement = jest.fn().mockImplementation((tagName: string) => {
    if (tagName.toLowerCase() === 'canvas') {
      // Create canvas instance directly without going through global constructors
      const canvas = Object.create(global.HTMLCanvasElement.prototype);
      global.HTMLCanvasElement.call(canvas);
      return canvas;
    }
    return originalCreateElement ? originalCreateElement.call(global.document, tagName) : {};
  });
}

// Note: Console suppression moved to setupTests.ts where beforeAll/afterAll are available