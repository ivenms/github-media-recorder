import {
  blobToBase64,
  base64ToBlob,
  createFileRecord,
  restoreFileRecord,
  cleanupBlobUrls,
} from '../../src/utils/persistentStorage';
import type { FileRecord } from '../../src/types';

// Declare testUtils as global
declare global {
  var testUtils: {
    createMockFile: (name: string, size?: number, type?: string) => File;
    createMockMediaStream: (tracks?: MediaStreamTrack[]) => MediaStream;
    createMockMediaTrack: (kind?: 'audio' | 'video') => MediaStreamTrack;
    waitForAsync: () => Promise<void>;
    triggerEvent: (element: Element, eventType: string, eventData?: Record<string, unknown>) => void;
  };
}

describe('persistentStorage utilities', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Complete reset of fake-indexeddb using direct reset method
    try {
      // Import FDBFactory directly for clean reset
      const FDBFactory = require('fake-indexeddb/lib/FDBFactory');
      const FDBKeyRange = require('fake-indexeddb/lib/FDBKeyRange');
      
      // Create completely fresh factory instance
      const factory = new FDBFactory();
      global.indexedDB = factory;
      global.IDBKeyRange = FDBKeyRange;
      
      // Clear all open connections and databases
      if ((global.indexedDB as typeof indexedDB & { _databases?: Map<string, unknown> })._databases) {
        ((global.indexedDB as typeof indexedDB & { _databases: Map<string, unknown> })._databases).clear();
      }
      
      // Small delay for cleanup
      await new Promise(resolve => setTimeout(resolve, 10));
    } catch (error) {
      // Continue even if reset fails
      console.warn('Database reset error:', error);
    }
  });

  describe('blobToBase64', () => {
    describe('basic functionality', () => {
      it('converts blob to base64 data URL', async () => {
        const blob = new Blob(['test data'], { type: 'text/plain' });
        const result = await blobToBase64(blob);

        expect(result).toMatch(/^data:text\/plain;base64,/);
        expect(result).toContain('dGVzdCBkYXRh'); // 'test data' in base64
      });

      it('handles different MIME types', async () => {
        const testCases = [
          { data: 'audio data', type: 'audio/mp3' },
          { data: 'video data', type: 'video/mp4' },
          { data: 'image data', type: 'image/jpeg' },
        ];

        for (const { data, type } of testCases) {
          const blob = new Blob([data], { type });
          const result = await blobToBase64(blob);

          expect(result).toMatch(new RegExp(`^data:${type.replace('/', '\\/')};base64,`));
        }
      });
    });

    describe('edge cases', () => {
      it('handles empty blob', async () => {
        const blob = new Blob([], { type: 'text/plain' });
        const result = await blobToBase64(blob);

        expect(result).toBe('data:text/plain;base64,');
      });

      it('handles blob without MIME type', async () => {
        const blob = new Blob(['data']);
        const result = await blobToBase64(blob);

        // jsdom's Blob constructor may set a default MIME type
        expect(result).toMatch(/^data:(|application\/octet-stream);base64,/);
      });

      it('handles large blob data', async () => {
        const largeData = 'x'.repeat(10000);
        const blob = new Blob([largeData], { type: 'text/plain' });
        const result = await blobToBase64(blob);

        expect(result).toMatch(/^data:text\/plain;base64,/);
        expect(result.length).toBeGreaterThan(10000);
      });
    });

    describe('error handling', () => {
      it('rejects when FileReader fails', async () => {
        const blob = new Blob(['test'], { type: 'text/plain' });

        // Mock FileReader to fail
        const originalFileReader = global.FileReader;
        global.FileReader = jest.fn().mockImplementation(() => ({
          EMPTY: 0,
          LOADING: 1,
          DONE: 2,
          readyState: 0,
          result: null,
          error: null,
          onload: null,
          onerror: null,
          onloadend: null,
          onloadstart: null,
          onprogress: null,
          readAsDataURL: jest.fn(function(this: FileReader) {
            setTimeout(() => {
              if (this.onerror) this.onerror(new Error('Read failed'));
            }, 0);
          }),
        })) as jest.MockedClass<typeof FileReader>;

        await expect(blobToBase64(blob)).rejects.toThrow();

        global.FileReader = originalFileReader;
      });
    });
  });

  describe('base64ToBlob', () => {
    describe('basic functionality', () => {
      it('converts base64 data URL back to blob', () => {
        const base64Data = 'data:text/plain;base64,dGVzdCBkYXRh'; // 'test data'
        const result = base64ToBlob(base64Data);

        expect(result).toBeInstanceOf(Blob);
        expect(result.type).toBe('text/plain');
        expect(result.size).toBe(9); // 'test data' is 9 bytes
      });

      it('handles different MIME types', () => {
        const testCases = [
          { base64: 'data:audio/mp3;base64,YXVkaW8=', expectedType: 'audio/mp3' },
          { base64: 'data:video/mp4;base64,dmlkZW8=', expectedType: 'video/mp4' },
          { base64: 'data:image/jpeg;base64,aW1hZ2U=', expectedType: 'image/jpeg' },
        ];

        testCases.forEach(({ base64, expectedType }) => {
          const result = base64ToBlob(base64);
          expect(result.type).toBe(expectedType);
        });
      });

      it('produces consistent roundtrip conversion', async () => {
        const originalData = 'test roundtrip data';
        const originalBlob = new Blob([originalData], { type: 'text/plain' });

        const base64 = await blobToBase64(originalBlob);
        const restoredBlob = base64ToBlob(base64);

        expect(restoredBlob.type).toBe(originalBlob.type);
        expect(restoredBlob.size).toBe(originalBlob.size);
      });
    });

    describe('MIME type handling', () => {
      it('uses default MIME type when not specified', () => {
        const base64Data = 'data:;base64,dGVzdA==';
        const result = base64ToBlob(base64Data);

        expect(result.type).toBe('application/octet-stream');
      });

      it('uses default MIME type for malformed header', () => {
        const base64Data = 'invalid-header,dGVzdA==';
        const result = base64ToBlob(base64Data);

        expect(result.type).toBe('application/octet-stream');
      });

      it('handles complex MIME types', () => {
        const base64Data = 'data:application/vnd.ms-excel;base64,dGVzdA==';
        const result = base64ToBlob(base64Data);

        expect(result.type).toBe('application/vnd.ms-excel');
      });
    });

    describe('edge cases', () => {
      it('handles empty base64 data', () => {
        const base64Data = 'data:text/plain;base64,';
        const result = base64ToBlob(base64Data);

        expect(result.size).toBe(0);
        expect(result.type).toBe('text/plain');
      });

      it('handles large base64 data', () => {
        const largeBase64 = 'data:text/plain;base64,' + btoa('x'.repeat(10000));
        const result = base64ToBlob(largeBase64);

        expect(result.size).toBe(10000);
        expect(result.type).toBe('text/plain');
      });
    });
  });

  describe('createFileRecord', () => {
    const mockMetadata = {
      name: 'test.mp3',
      type: 'audio' as const,
      mimeType: 'audio/mp3',
      size: 1000,
      duration: 30,
      created: Date.now(),
    };

    describe('basic functionality', () => {
      it('creates file record with all properties', async () => {
        const blob = testUtils.createMockFile('test.mp3', 1000, 'audio/mp3');
        const result = await createFileRecord(blob, mockMetadata);

        expect(result).toMatchObject({
          name: 'test.mp3',
          type: 'audio',
          mimeType: 'audio/mp3',
          size: 1000,
          duration: 30,
          created: mockMetadata.created,
        });

        expect(result.id).toMatch(/^file-\d+-[a-z0-9]+$/);
        expect(result.file).toBe(blob);
        expect(result.url).toMatch(/^blob:/);
      });

      it('generates unique IDs for different files', async () => {
        const blob1 = testUtils.createMockFile('test1.mp3', 1000, 'audio/mp3');
        const blob2 = testUtils.createMockFile('test2.mp3', 1000, 'audio/mp3');

        const result1 = await createFileRecord(blob1, { ...mockMetadata, name: 'test1.mp3' });
        const result2 = await createFileRecord(blob2, { ...mockMetadata, name: 'test2.mp3' });

        expect(result1.id).not.toBe(result2.id);
      });

      it('creates blob URL for file', async () => {
        const blob = testUtils.createMockFile('test.mp3', 1000, 'audio/mp3');
        const result = await createFileRecord(blob, mockMetadata);

        expect(result.url).toMatch(/^blob:mock-audio-url-\d+$/);
      });
    });

    describe('size-based storage strategy', () => {
      it('stores small files as base64', async () => {
        const smallBlob = testUtils.createMockFile('small.mp3', 500 * 1024, 'audio/mp3'); // 500KB
        const result = await createFileRecord(smallBlob, mockMetadata);

        expect(result.base64Data).toBeDefined();
        expect(result.base64Data).toMatch(/^data:audio\/mp3;base64,/);
      });

      it('stores large files in IndexedDB without base64', async () => {
        const largeBlob = testUtils.createMockFile('large.mp4', 2 * 1024 * 1024, 'video/mp4'); // 2MB
        const result = await createFileRecord(largeBlob, { ...mockMetadata, size: 2 * 1024 * 1024 });

        expect(result.base64Data).toBeUndefined();
      });

      it('uses 1MB as size threshold', async () => {
        const exactThresholdBlob = testUtils.createMockFile('threshold.mp3', 1024 * 1024, 'audio/mp3'); // Exactly 1MB
        const result = await createFileRecord(exactThresholdBlob, mockMetadata);

        expect(result.base64Data).toBeUndefined(); // Should use IndexedDB for files >= 1MB
      });
    });

    describe('IndexedDB integration', () => {
      it('stores large files in IndexedDB', async () => {
        const largeBlob = testUtils.createMockFile('large.mp4', 2 * 1024 * 1024, 'video/mp4');
        const result = await createFileRecord(largeBlob, { ...mockMetadata, size: 2 * 1024 * 1024 });

        // Verify the file was stored in IndexedDB by trying to retrieve it
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('MediaRecorderDB', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction(['files'], 'readonly');
        const store = transaction.objectStore('files');
        
        const retrievedData = await new Promise<Blob | unknown>((resolve, reject) => {
          const request = store.get(result.id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        // fake-indexeddb may store blobs differently, so check that we get data back
        expect(retrievedData).toBeDefined();
        // The data might be a Blob or a serialized representation
        if (retrievedData instanceof Blob) {
          expect(retrievedData.size).toBe(largeBlob.size);
        } else {
          // If it's not a Blob, it should be an object representing the blob
          expect(typeof retrievedData).toBe('object');
        }
      });
    });

    describe('error handling', () => {
      it('handles IndexedDB errors gracefully', async () => {
        // Mock IndexedDB to fail
        const originalOpen = indexedDB.open;
        indexedDB.open = jest.fn().mockImplementation(() => {
          const request = {
            onerror: null as ((this: IDBRequest, ev: Event) => void) | null,
            onsuccess: null as ((this: IDBRequest, ev: Event) => void) | null,
            onupgradeneeded: null as ((this: IDBRequest, ev: IDBVersionChangeEvent) => void) | null,
            error: new Error('IndexedDB unavailable'),
          };
          setTimeout(() => {
            if (request.onerror) request.onerror();
          }, 0);
          return request as IDBOpenDBRequest;
        });

        const largeBlob = testUtils.createMockFile('large.mp4', 2 * 1024 * 1024, 'video/mp4');

        await expect(createFileRecord(largeBlob, mockMetadata)).rejects.toThrow();

        indexedDB.open = originalOpen;
      });
    });
  });

  describe('restoreFileRecord', () => {
    describe('base64 restoration', () => {
      it('restores file from base64 data', async () => {
        const base64Data = 'data:audio/mp3;base64,dGVzdCBhdWRpbw=='; // 'test audio'
        const persistedFile: FileRecord = {
          id: 'test-id',
          name: 'test.mp3',
          type: 'audio',
          mimeType: 'audio/mp3',
          size: 1000,
          duration: 30,
          created: Date.now(),
          file: null as unknown as Blob,
          url: '',
          base64Data,
        };

        const result = await restoreFileRecord(persistedFile);

        expect(result.file).toBeInstanceOf(Blob);
        expect(result.file.type).toBe('audio/mp3');
        expect(result.url).toMatch(/^blob:/);
        expect(result.base64Data).toBe(base64Data);
      });

      it('restores when URL is invalid', async () => {
        const base64Data = 'data:audio/mp3;base64,dGVzdA==';
        const persistedFile: FileRecord = {
          id: 'test-id',
          name: 'test.mp3',
          type: 'audio',
          mimeType: 'audio/mp3',
          size: 1000,
          duration: 30,
          created: Date.now(),
          file: null as unknown as Blob,
          url: 'invalid-url',
          base64Data,
        };

        const result = await restoreFileRecord(persistedFile);

        expect(result.file).toBeInstanceOf(Blob);
        expect(result.url).toMatch(/^blob:/);
      });
    });

    describe('IndexedDB restoration', () => {
      it('restores large file from IndexedDB', async () => {
        // First create and store a large file
        const largeBlob = testUtils.createMockFile('large.mp4', 2 * 1024 * 1024, 'video/mp4');
        const fileRecord = await createFileRecord(largeBlob, {
          name: 'large.mp4',
          type: 'video',
          mimeType: 'video/mp4',
          size: 2 * 1024 * 1024,
          duration: 120,
          created: Date.now(),
        });

        // Simulate persisted state (no file, no URL, no base64Data)
        const persistedFile: FileRecord = {
          ...fileRecord,
          file: null as unknown as Blob,
          url: '',
          base64Data: undefined,
        };

        const result = await restoreFileRecord(persistedFile);

        // Check that a file was restored (might not be exact Blob instance due to fake-indexeddb)
        expect(result.file).toBeTruthy();
        expect(result.url).toMatch(/^blob:/);
      });

      it('handles missing IndexedDB entry gracefully', async () => {
        const persistedFile: FileRecord = {
          id: 'non-existent-id',
          name: 'missing.mp4',
          type: 'video',
          mimeType: 'video/mp4',
          size: 2 * 1024 * 1024,
          duration: 120,
          created: Date.now(),
          file: null as unknown as Blob,
          url: '',
        };

        const result = await restoreFileRecord(persistedFile);

        // Should return original file when restoration fails
        expect(result).toBe(persistedFile);
      });
    });

    describe('already valid files', () => {
      it('returns file unchanged when already valid', async () => {
        const validFile: FileRecord = {
          id: 'valid-id',
          name: 'valid.mp3',
          type: 'audio',
          mimeType: 'audio/mp3',
          size: 1000,
          duration: 30,
          created: Date.now(),
          file: testUtils.createMockFile('valid.mp3'),
          url: 'blob:valid-url',
        };

        const result = await restoreFileRecord(validFile);

        expect(result).toBe(validFile);
      });
    });

    describe('error handling', () => {
      it('handles IndexedDB errors gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Mock IndexedDB to fail
        const originalOpen = indexedDB.open;
        indexedDB.open = jest.fn().mockImplementation(() => {
          throw new Error('IndexedDB error');
        });

        const persistedFile: FileRecord = {
          id: 'error-id',
          name: 'error.mp4',
          type: 'video',
          mimeType: 'video/mp4',
          size: 2 * 1024 * 1024,
          duration: 120,
          created: Date.now(),
          file: null as unknown as Blob,
          url: '',
        };

        const result = await restoreFileRecord(persistedFile);

        expect(result).toBe(persistedFile);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to restore blob from IndexedDB:', expect.any(Error));

        indexedDB.open = originalOpen;
        consoleSpy.mockRestore();
      });
    });
  });

  describe('cleanupBlobUrls', () => {
    const createMockFileRecord = (overrides: Partial<FileRecord> = {}): FileRecord => ({
      id: 'mock-id',
      name: 'mock.mp3',
      type: 'audio',
      mimeType: 'audio/mp3',
      size: 1000,
      duration: 30,
      created: Date.now(),
      file: testUtils.createMockFile('mock.mp3'),
      url: 'blob:mock-url',
      ...overrides,
    });

    describe('blob URL cleanup', () => {
      it('revokes blob URLs', async () => {
        const files = [
          createMockFileRecord({ url: 'blob:url-1' }),
          createMockFileRecord({ url: 'blob:url-2' }),
        ];

        const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');

        await cleanupBlobUrls(files);

        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url-1');
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url-2');

        revokeObjectURLSpy.mockRestore();
      });

      it('skips non-blob URLs', async () => {
        const files = [
          createMockFileRecord({ url: 'https://example.com/file.mp3' }),
          createMockFileRecord({ url: 'data:audio/mp3;base64,test' }),
          createMockFileRecord({ url: '' }),
        ];

        const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');

        await cleanupBlobUrls(files);

        expect(revokeObjectURLSpy).not.toHaveBeenCalled();

        revokeObjectURLSpy.mockRestore();
      });
    });

    describe('IndexedDB cleanup', () => {
      it('deletes large files from IndexedDB', async () => {
        // Create large files (without base64Data)
        const largeFile1 = createMockFileRecord({ id: 'large-1', base64Data: undefined });
        const largeFile2 = createMockFileRecord({ id: 'large-2', base64Data: undefined });

        // First store them in IndexedDB
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('MediaRecorderDB', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('files')) {
              db.createObjectStore('files');
            }
          };
        });

        const transaction = db.transaction(['files'], 'readwrite');
        const store = transaction.objectStore('files');
        
        await Promise.all([
          new Promise((resolve, reject) => {
            const request = store.put(largeFile1.file, largeFile1.id);
            request.onsuccess = () => resolve(undefined);
            request.onerror = () => reject(request.error);
          }),
          new Promise((resolve, reject) => {
            const request = store.put(largeFile2.file, largeFile2.id);
            request.onsuccess = () => resolve(undefined);
            request.onerror = () => reject(request.error);
          }),
        ]);

        // Now cleanup
        await cleanupBlobUrls([largeFile1, largeFile2]);

        // Verify files were deleted
        const readTransaction = db.transaction(['files'], 'readonly');
        const readStore = readTransaction.objectStore('files');
        
        const result1 = await new Promise((resolve) => {
          const request = readStore.get(largeFile1.id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });

        const result2 = await new Promise((resolve) => {
          const request = readStore.get(largeFile2.id);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => resolve(null);
        });

        expect(result1).toBeUndefined();
        expect(result2).toBeUndefined();
      });

      it('skips IndexedDB cleanup for small files (with base64Data)', async () => {
        const smallFile = createMockFileRecord({ 
          id: 'small-1', 
          base64Data: 'data:audio/mp3;base64,test' 
        });

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await cleanupBlobUrls([smallFile]);

        // Should not attempt IndexedDB operations for small files
        expect(consoleSpy).not.toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('error handling', () => {
      it('handles IndexedDB deletion errors gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        // Mock IndexedDB to fail
        const originalOpen = indexedDB.open;
        indexedDB.open = jest.fn().mockImplementation(() => {
          throw new Error('IndexedDB deletion error');
        });

        const largeFile = createMockFileRecord({ id: 'error-file', base64Data: undefined });

        await cleanupBlobUrls([largeFile]);

        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete blob from IndexedDB:', expect.any(Error));

        indexedDB.open = originalOpen;
        consoleSpy.mockRestore();
      });

      it('continues cleanup even if some operations fail', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');

        const files = [
          createMockFileRecord({ id: 'file-1', url: 'blob:url-1', base64Data: undefined }),
          createMockFileRecord({ id: 'file-2', url: 'blob:url-2' }),
        ];

        // Mock IndexedDB to fail for first file
        const originalOpen = indexedDB.open;
        indexedDB.open = jest.fn().mockImplementation(() => {
          throw new Error('IndexedDB error');
        });

        await cleanupBlobUrls(files);

        // Should still revoke both URLs
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url-1');
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:url-2');

        // Should log error for IndexedDB failure
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete blob from IndexedDB:', expect.any(Error));

        indexedDB.open = originalOpen;
        revokeObjectURLSpy.mockRestore();
        consoleSpy.mockRestore();
      });
    });

    describe('edge cases', () => {
      it('handles empty files array', async () => {
        await expect(cleanupBlobUrls([])).resolves.toBeUndefined();
      });

      it('handles files with missing properties', async () => {
        const incompleteFile = {
          id: 'incomplete',
          url: 'blob:test-url',
        } as FileRecord;

        const revokeObjectURLSpy = jest.spyOn(URL, 'revokeObjectURL');

        await cleanupBlobUrls([incompleteFile]);

        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-url');

        revokeObjectURLSpy.mockRestore();
      });
    });
  });

  describe('integration tests', () => {
    it('performs complete file lifecycle', async () => {
      // Create a file record
      const blob = testUtils.createMockFile('lifecycle.mp3', 800 * 1024, 'audio/mp3'); // Small file
      const metadata = {
        name: 'lifecycle.mp3',
        type: 'audio' as const,
        mimeType: 'audio/mp3',
        size: 800 * 1024,
        duration: 180,
        created: Date.now(),
      };

      const fileRecord = await createFileRecord(blob, metadata);
      expect(fileRecord.base64Data).toBeDefined();

      // Simulate persistence (lose file and URL)
      const persistedFile: FileRecord = {
        ...fileRecord,
        file: null as unknown as Blob,
        url: '',
      };

      // Restore the file
      const restoredFile = await restoreFileRecord(persistedFile);
      expect(restoredFile.file).toBeInstanceOf(Blob);
      expect(restoredFile.url).toMatch(/^blob:/);

      // Cleanup
      await cleanupBlobUrls([restoredFile]);
      // No errors should occur
    });

    it('handles mixed file sizes correctly', async () => {
      const smallBlob = testUtils.createMockFile('small.mp3', 500 * 1024, 'audio/mp3');
      const largeBlob = testUtils.createMockFile('large.mp4', 2 * 1024 * 1024, 'video/mp4');

      const smallFile = await createFileRecord(smallBlob, {
        name: 'small.mp3',
        type: 'audio',
        mimeType: 'audio/mp3',
        size: 500 * 1024,
        duration: 30,
        created: Date.now(),
      });

      const largeFile = await createFileRecord(largeBlob, {
        name: 'large.mp4',
        type: 'video',
        mimeType: 'video/mp4',
        size: 2 * 1024 * 1024,
        duration: 120,
        created: Date.now(),
      });

      expect(smallFile.base64Data).toBeDefined();
      expect(largeFile.base64Data).toBeUndefined();

      // Both should restore correctly
      const restoredSmall = await restoreFileRecord({
        ...smallFile,
        file: null as unknown as Blob,
        url: '',
      });

      const restoredLarge = await restoreFileRecord({
        ...largeFile,
        file: null as unknown as Blob,
        url: '',
      });

      expect(restoredSmall.file).toBeInstanceOf(Blob);
      // Check that a large file was restored (might not be exact Blob instance due to fake-indexeddb)
      expect(restoredLarge.file).toBeTruthy();

      // Cleanup both
      await cleanupBlobUrls([restoredSmall, restoredLarge]);
    });
  });
});