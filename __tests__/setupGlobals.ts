// Global setup for Jest tests - runs before setupTests.ts
import 'fake-indexeddb/auto';

// Global polyfills for browser APIs
global.structuredClone = global.structuredClone || ((val: unknown) => JSON.parse(JSON.stringify(val)));

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
  } as unknown as typeof URL;
}

// Mock Blob constructor - ALWAYS override to ensure arrayBuffer() method is available
class MockBlob {
  size: number;
  type: string;
  private _content: string;
  
  constructor(parts: BlobPart[] = [], options: BlobPropertyBag = {}) {
    this.type = options.type || '';
    
    // Process parts to build content and calculate size
    let content = '';
    let size = 0;
    
    for (const part of parts) {
      if (typeof part === 'string') {
        content += part;
        size += part.length;
      } else if (part instanceof ArrayBuffer) {
        // Convert ArrayBuffer to string representation for testing
        const view = new Uint8Array(part);
        const str = Array.from(view).map(b => String.fromCharCode(b)).join('');
        content += str;
        size += part.byteLength;
      } else if (part && typeof (part as unknown[]).length === 'number') {
        // Handle array-like objects
        const str = Array.from(part as unknown[]).join('');
        content += str;
        size += (part as unknown[]).length;
      }
    }
    
    this._content = content;
    this.size = size;
  }
  
  arrayBuffer() {
    const buffer = new ArrayBuffer(this.size);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < this._content.length; i++) {
      view[i] = this._content.charCodeAt(i);
    }
    return Promise.resolve(buffer);
  }
  
  text() {
    return Promise.resolve(this._content);
  }
  
  stream() {
    return new ReadableStream();
  }
  
  slice() {
    return new MockBlob();
  }
}

// Force override global Blob to ensure our mock is used
global.Blob = MockBlob as unknown as typeof Blob;

// Mock File constructor extending MockBlob
class MockFile extends MockBlob {
  name: string;
  lastModified: number;
  
  constructor(bits: BlobPart[], name: string, options: FilePropertyBag = {}) {
    super(bits, options);
    this.name = name;
    this.lastModified = options.lastModified || Date.now();
  }
}

// Force override global File to ensure our mock is used
global.File = MockFile as unknown as typeof File;

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

// Mock FileReader to work with our MockBlob - Force override to ensure compatibility
class MockFileReader {
  onload: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((event: ProgressEvent<FileReader>) => void) | null = null;
  onabort: ((event: ProgressEvent<FileReader>) => void) | null = null;
  result: string | ArrayBuffer | null = null;
  readyState: number = 0;
  
  readAsDataURL(blob: Blob) {
    // Simulate async file reading with proper base64 encoding
    queueMicrotask(async () => {
      try {
        const content = await blob.text();
        const base64 = btoa(content);
        this.result = 'data:' + (blob.type || 'application/octet-stream') + ';base64,' + base64;
        this.readyState = 2;
        if (this.onload) {
          this.onload({ target: this } as ProgressEvent<FileReader>);
        }
      }
      // @ts-expect-error - Testing error case
      catch {
        this.readyState = 2;
        if (this.onerror) {
          this.onerror({ target: this } as ProgressEvent<FileReader>);
        }
      }
    });
  }
  
  readAsText(blob: Blob) {
    queueMicrotask(async () => {
      try {
        this.result = await blob.text();
        this.readyState = 2;
        if (this.onload) {
          this.onload({ target: this } as ProgressEvent<FileReader>);
        }
      } catch {
        this.readyState = 2;
        if (this.onerror) {
          this.onerror({ target: this } as ProgressEvent<FileReader>);
        }
      }
    });
  }
  
  readAsArrayBuffer(blob: Blob) {
    queueMicrotask(async () => {
      try {
        this.result = await blob.arrayBuffer();
        this.readyState = 2; // DONE
        if (this.onload) {
          this.onload({ target: this } as ProgressEvent<FileReader>);
        }
      } catch {
        this.readyState = 2; // DONE
        if (this.onerror) {
          this.onerror({ target: this } as ProgressEvent<FileReader>);
        }
      }
    });
  }
  
  abort() {
    this.readyState = 2; // DONE
    if (this.onabort) {
      this.onabort({ target: this } as ProgressEvent<FileReader>);
    }
  }
}

// Force override global FileReader to ensure our mock is used
global.FileReader = MockFileReader as unknown as typeof FileReader;

// Mock crypto for secure random values
Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array | Uint16Array | Uint32Array) => {
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
  body: unknown;

  constructor(body?: unknown, init: { status?: number; statusText?: string; headers?: Record<string, string> } = {}) {
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
    return new Blob([this.body as BlobPart || '']);
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
  body: unknown;

  constructor(url: string, init: { method?: string; headers?: Record<string, string>; body?: unknown } = {}) {
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
  } as Response)
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

  postMessage(_message: unknown) {
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
  
  toBlob(callback: (blob: Blob | null) => void, type = 'image/png', _quality = 0.92) {
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
    // Simulate image load using microtask instead of timer
    queueMicrotask(() => {
      if (this.onload) this.onload();
    });
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
  
  decodeAudioData(_arrayBuffer: ArrayBuffer) {
    return Promise.resolve({
      length: 1000,
      sampleRate: this.sampleRate,
      numberOfChannels: 1,
      getChannelData: (_channel: number) => new Float32Array(1000).fill(0.1),
    });
  }
  
  close() {
    return Promise.resolve();
  }
};

// Add webkitAudioContext for compatibility
(global as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = global.AudioContext;

// Ensure window object has the same mocks when in browser-like environment
if (typeof window !== 'undefined') {
  (window as Window & { webkitAudioContext?: typeof AudioContext }).AudioContext = global.AudioContext;
  (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = global.AudioContext;
} else {
  // In Node/Jest environment, create a mock window object
  (global as typeof globalThis & { window?: unknown }).window = {
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

// Mock window.matchMedia for screen orientation detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: query === '(orientation: landscape)' ? false : true, // Default to portrait
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Note: Console suppression moved to setupTests.ts where beforeAll/afterAll are available
