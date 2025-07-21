// FFmpeg.js util mock

// Type definitions for fetchFile input
type FetchFileInput = File | Blob | Uint8Array | ArrayBuffer | string;

// Type for download progress callback
interface DownloadProgress {
  progress: number;
  total: number;
  loaded: number;
}

// Mock fetchFile function
export const fetchFile = jest.fn(async (input: FetchFileInput): Promise<Uint8Array> => {
  // Handle different input types
  if (input instanceof File || input instanceof Blob) {
    // Convert blob/file to Uint8Array
    const arrayBuffer = await input.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  } else if (input instanceof Uint8Array) {
    return input;
  } else if (typeof input === 'string') {
    // Handle URL or data URL
    if (input.startsWith('data:')) {
      // Handle data URL
      const base64 = input.split(',')[1];
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    } else {
      // Handle URL - return mock data
      const mockData = new Uint8Array(1000);
      mockData.fill(Math.floor(Math.random() * 256));
      return mockData;
    }
  } else if (input instanceof ArrayBuffer) {
    return new Uint8Array(input);
  }
  
  // Default fallback
  const mockData = new Uint8Array(1000);
  mockData.fill(42); // Fill with a recognizable pattern
  return mockData;
});

// Mock toBlobURL function
export const toBlobURL = jest.fn(async (url: string, mimeType: string = 'application/wasm'): Promise<string> => {
  // Return a mock blob URL
  return `blob:${mimeType}:${Math.random().toString(36).substr(2, 9)}`;
});

// Mock downloadWithProgress function
export const downloadWithProgress = jest.fn(async (
  url: string, 
  callback?: (progress: DownloadProgress) => void
): Promise<Uint8Array> => {
  // Simulate download progress
  return new Promise<Uint8Array>((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        if (callback) callback({ progress: 1, total: 100, loaded: 100 });
        resolve(new Uint8Array(1000));
      } else {
        if (callback) callback({ progress: progress / 100, total: 100, loaded: progress });
      }
    }, 50);
  });
});

// Export all as default object
export default {
  fetchFile,
  toBlobURL,
  downloadWithProgress,
};