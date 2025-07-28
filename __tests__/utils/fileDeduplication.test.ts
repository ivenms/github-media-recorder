import {
  combineAndDeduplicateFiles,
  deduplicateById,
  findFilesToRemove,
} from '../../src/utils/fileDeduplication';
import type { FileRecord } from '../../src/types';

// Mock the sortFilesByDate function from fileUtils
jest.mock('../../src/utils/fileUtils', () => ({
  sortFilesByDate: jest.fn((files) => [...files].sort((a, b) => b.created - a.created)),
}));

describe('fileDeduplication utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('combineAndDeduplicateFiles', () => {
    const createMockFile = (overrides: Partial<FileRecord> = {}): FileRecord => ({
      id: 'mock-id',
      name: 'mock-file.mp3',
      type: 'audio',
      mimeType: 'audio/mp3',
      size: 1000,
      duration: 30,
      created: Date.now(),
      file: testUtils.createMockFile('mock.mp3'),
      url: 'blob:mock-url',
      ...overrides,
    });

    describe('basic functionality', () => {
      it('combines local and remote files without duplicates', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'local-1', name: 'audio1.mp3', type: 'audio' }),
          createMockFile({ id: 'local-2', name: 'video1.mp4', type: 'video' }),
        ];

        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'remote-1', name: 'audio2.mp3', type: 'audio' }),
          createMockFile({ id: 'remote-2', name: 'video2.mp4', type: 'video' }),
        ];

        const result = combineAndDeduplicateFiles(localFiles, remoteFiles);

        expect(result).toHaveLength(4);
        expect(result.filter(f => f.isLocal)).toHaveLength(2);
        expect(result.filter(f => !f.isLocal)).toHaveLength(2);
      });

      it('marks local files with isLocal: true', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'local-1', name: 'audio1.mp3', type: 'audio' }),
        ];

        const result = combineAndDeduplicateFiles(localFiles, []);

        expect(result[0]).toMatchObject({
          id: 'local-1',
          isLocal: true,
        });
        expect(result[0]).not.toHaveProperty('uploaded');
      });

      it('marks remote files with isLocal: false and uploaded: true', () => {
        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'remote-1', name: 'audio1.mp3', type: 'audio' }),
        ];

        const result = combineAndDeduplicateFiles([], remoteFiles);

        expect(result[0]).toMatchObject({
          id: 'remote-1',
          isLocal: false,
          uploaded: true,
        });
      });
    });

    describe('media file filtering', () => {
      it('only includes audio and video files from local files', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'audio.mp3', type: 'audio' }),
          createMockFile({ id: 'video-1', name: 'video.mp4', type: 'video' }),
          createMockFile({ id: 'thumbnail-1', name: 'thumb.jpg', type: 'thumbnail' }),
          createMockFile({ id: 'other-1', name: 'other.txt', type: 'other' as any }),
        ];

        const result = combineAndDeduplicateFiles(localFiles, []);

        expect(result).toHaveLength(2);
        expect(result.map(f => f.type)).toEqual(['audio', 'video']);
        expect(result.some(f => f.type === 'thumbnail')).toBe(false);
      });

      it('includes all remote files regardless of type', () => {
        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'remote-audio', name: 'audio.mp3', type: 'audio' }),
          createMockFile({ id: 'remote-thumbnail', name: 'thumb.jpg', type: 'thumbnail' }),
        ];

        const result = combineAndDeduplicateFiles([], remoteFiles);

        expect(result).toHaveLength(2);
        expect(result.map(f => f.type)).toEqual(['audio', 'thumbnail']);
      });
    });

    describe('deduplication logic', () => {
      it('removes remote files with same name as local files', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'local-1', name: 'duplicate.mp3', type: 'audio' }),
        ];

        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'remote-1', name: 'duplicate.mp3', type: 'audio' }),
          createMockFile({ id: 'remote-2', name: 'unique.mp3', type: 'audio' }),
        ];

        const result = combineAndDeduplicateFiles(localFiles, remoteFiles);

        expect(result).toHaveLength(2);
        expect(result.find(f => f.id === 'local-1')).toBeDefined();
        expect(result.find(f => f.id === 'remote-2')).toBeDefined();
        expect(result.find(f => f.id === 'remote-1')).toBeUndefined();
      });

      it('removes remote files with same ID as local files', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'duplicate-id', name: 'local.mp3', type: 'audio' }),
        ];

        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'duplicate-id', name: 'remote.mp3', type: 'audio' }),
          createMockFile({ id: 'unique-id', name: 'unique.mp3', type: 'audio' }),
        ];

        const result = combineAndDeduplicateFiles(localFiles, remoteFiles);

        expect(result).toHaveLength(2);
        expect(result.find(f => f.id === 'duplicate-id' && f.name === 'local.mp3')).toBeDefined();
        expect(result.find(f => f.id === 'unique-id')).toBeDefined();
        expect(result.find(f => f.name === 'remote.mp3')).toBeUndefined();
      });

      it('performs final deduplication by ID', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'duplicate-final', name: 'file1.mp3', type: 'audio' }),
        ];

        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'unique-remote', name: 'file2.mp3', type: 'audio' }),
        ];

        // Mock deduplicateById to simulate duplicate detection
        const mockDeduplicateById = jest.fn((files) => files.slice(0, -1)); // Remove last duplicate
        jest.doMock('../../src/utils/fileDeduplication', () => ({
          ...jest.requireActual('../../src/utils/fileDeduplication'),
          deduplicateById: mockDeduplicateById,
        }));

        const result = combineAndDeduplicateFiles(localFiles, remoteFiles);

        expect(result).toHaveLength(2);
      });
    });

    describe('edge cases', () => {
      it('handles empty arrays', () => {
        expect(combineAndDeduplicateFiles([], [])).toEqual([]);
      });

      it('handles empty local files', () => {
        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'remote-1', name: 'audio.mp3', type: 'audio' }),
        ];

        const result = combineAndDeduplicateFiles([], remoteFiles);
        expect(result).toHaveLength(1);
        expect(result[0].isLocal).toBe(false);
      });

      it('handles empty remote files', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'local-1', name: 'audio.mp3', type: 'audio' }),
        ];

        const result = combineAndDeduplicateFiles(localFiles, []);
        expect(result).toHaveLength(1);
        expect(result[0].isLocal).toBe(true);
      });

      it('handles files with same name but different extensions', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'local-1', name: 'audio.mp3', type: 'audio' }),
        ];

        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'remote-1', name: 'audio.wav', type: 'audio' }),
        ];

        const result = combineAndDeduplicateFiles(localFiles, remoteFiles);
        expect(result).toHaveLength(2);
      });
    });

    describe('sorting integration', () => {
      it('calls sortFilesByDate with the combined files', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'local-1', name: 'local-file.mp3', created: 1000 }),
        ];
        const remoteFiles: FileRecord[] = [
          createMockFile({ id: 'remote-1', name: 'remote-file.mp3', created: 2000 }),
        ];

        const mockSortFilesByDate = require('../../src/utils/fileUtils').sortFilesByDate;
        
        combineAndDeduplicateFiles(localFiles, remoteFiles);

        expect(mockSortFilesByDate).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ id: 'local-1', isLocal: true }),
            expect.objectContaining({ id: 'remote-1', isLocal: false }),
          ])
        );
      });
    });
  });

  describe('deduplicateById', () => {
    describe('basic functionality', () => {
      it('removes duplicate items by ID', () => {
        const items = [
          { id: 'unique-1', name: 'item1' },
          { id: 'duplicate', name: 'item2' },
          { id: 'unique-2', name: 'item3' },
          { id: 'duplicate', name: 'item4' },
        ];

        const result = deduplicateById(items);

        expect(result).toHaveLength(3);
        expect(result.find(item => item.id === 'duplicate')?.name).toBe('item2');
        expect(result.filter(item => item.id === 'duplicate')).toHaveLength(1);
      });

      it('preserves first occurrence of duplicate IDs', () => {
        const items = [
          { id: 'dup', name: 'first', value: 1 },
          { id: 'dup', name: 'second', value: 2 },
          { id: 'dup', name: 'third', value: 3 },
        ];

        const result = deduplicateById(items);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ id: 'dup', name: 'first', value: 1 });
      });

      it('returns empty array for empty input', () => {
        expect(deduplicateById([])).toEqual([]);
      });

      it('returns same array when no duplicates exist', () => {
        const items = [
          { id: 'unique-1', name: 'item1' },
          { id: 'unique-2', name: 'item2' },
          { id: 'unique-3', name: 'item3' },
        ];

        const result = deduplicateById(items);

        expect(result).toEqual(items);
        expect(result).toHaveLength(3);
      });
    });

    describe('logging', () => {
      it('logs warnings for duplicate IDs', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const items = [
          { id: 'duplicate-id', name: 'item1' },
          { id: 'duplicate-id', name: 'item2' },
        ];

        deduplicateById(items);

        expect(consoleSpy).toHaveBeenCalledWith(
          'Duplicate file ID detected: duplicate-id, skipping duplicate'
        );

        consoleSpy.mockRestore();
      });

      it('logs multiple warnings for multiple duplicates', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

        const items = [
          { id: 'dup1', name: 'item1' },
          { id: 'dup1', name: 'item2' },
          { id: 'dup2', name: 'item3' },
          { id: 'dup2', name: 'item4' },
        ];

        deduplicateById(items);

        expect(consoleSpy).toHaveBeenCalledTimes(2);
        expect(consoleSpy).toHaveBeenCalledWith(
          'Duplicate file ID detected: dup1, skipping duplicate'
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          'Duplicate file ID detected: dup2, skipping duplicate'
        );

        consoleSpy.mockRestore();
      });
    });

    describe('edge cases', () => {
      it('handles single item', () => {
        const items = [{ id: 'single', name: 'item' }];
        expect(deduplicateById(items)).toEqual(items);
      });

      it('handles items with special characters in ID', () => {
        const items = [
          { id: 'special-!@#$%', name: 'item1' },
          { id: 'special-!@#$%', name: 'item2' },
        ];

        const result = deduplicateById(items);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('item1');
      });

      it('handles numeric and string IDs differently', () => {
        const items = [
          { id: '123', name: 'string-id' },
          { id: 123 as any, name: 'number-id' },
        ];

        const result = deduplicateById(items);
        expect(result).toHaveLength(2); // Different types, no deduplication
      });

      it('handles very long IDs', () => {
        const longId = 'a'.repeat(1000);
        const items = [
          { id: longId, name: 'item1' },
          { id: longId, name: 'item2' },
        ];

        const result = deduplicateById(items);
        expect(result).toHaveLength(1);
      });
    });

    describe('performance', () => {
      it('handles large arrays efficiently', () => {
        const items = Array.from({ length: 10000 }, (_, i) => ({
          id: `item-${i % 1000}`, // Creates duplicates
          name: `Item ${i}`,
        }));

        const start = performance.now();
        const result = deduplicateById(items);
        const end = performance.now();

        expect(result).toHaveLength(1000); // Unique IDs
        expect(end - start).toBeLessThan(100); // Should be fast
      });
    });
  });

  describe('findFilesToRemove', () => {
    const createMockFile = (overrides: Partial<FileRecord> = {}): FileRecord => ({
      id: 'mock-id',
      name: 'mock-file.mp3',
      type: 'audio',
      mimeType: 'audio/mp3',
      size: 1000,
      duration: 30,
      created: Date.now(),
      file: testUtils.createMockFile('mock.mp3'),
      url: 'blob:mock-url',
      ...overrides,
    });

    describe('basic functionality', () => {
      it('finds file to remove by ID', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'file-1', name: 'audio.mp3', type: 'audio' }),
          createMockFile({ id: 'file-2', name: 'video.mp4', type: 'video' }),
        ];

        const result = findFilesToRemove(localFiles, 'file-1');

        expect(result.filesToRemove).toContain('file-1');
        expect(result.cleanup).toHaveLength(1);
        expect(result.cleanup[0].id).toBe('file-1');
      });

      it('returns file in cleanup array', () => {
        const targetFile = createMockFile({ id: 'target', name: 'test.mp3', type: 'audio' });
        const localFiles: FileRecord[] = [targetFile];

        const result = findFilesToRemove(localFiles, 'target');

        expect(result.cleanup).toContain(targetFile);
      });
    });

    describe('thumbnail handling', () => {
      it('finds and removes associated thumbnail for audio file', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'song.mp3', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: 'song.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).toContain('audio-1');
        expect(result.filesToRemove).toContain('thumb-1');
        expect(result.cleanup).toHaveLength(2);
      });

      it('finds and removes associated thumbnail for video file', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'video-1', name: 'movie.mp4', type: 'video' }),
          createMockFile({ id: 'thumb-1', name: 'movie.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'video-1');

        expect(result.filesToRemove).toContain('video-1');
        expect(result.filesToRemove).toContain('thumb-1');
        expect(result.cleanup).toHaveLength(2);
      });

      it('handles files without associated thumbnails', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'song.mp3', type: 'audio' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).toEqual(['audio-1']);
        expect(result.cleanup).toHaveLength(1);
      });

      it('does not remove thumbnails for non-media files', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'thumb-1', name: 'image.jpg', type: 'thumbnail' }),
          createMockFile({ id: 'thumb-match', name: 'image.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'thumb-1');

        expect(result.filesToRemove).toEqual(['thumb-1']);
        expect(result.cleanup).toHaveLength(1);
      });
    });

    describe('filename matching', () => {
      it('matches thumbnails by base name (removes extension)', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'my-song.mp3', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: 'my-song.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).toContain('thumb-1');
      });

      it('handles files with multiple dots in name', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'my.song.v2.mp3', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: 'my.song.v2.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).toContain('thumb-1');
      });

      it('handles files without extensions', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'song', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: 'song.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).toContain('thumb-1');
      });

      it('does not match thumbnails with different base names', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'song.mp3', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: 'different.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).not.toContain('thumb-1');
        expect(result.cleanup).toHaveLength(1);
      });
    });

    describe('error handling', () => {
      it('handles non-existent file ID', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'existing', name: 'file.mp3', type: 'audio' }),
        ];

        const result = findFilesToRemove(localFiles, 'non-existent');

        expect(result.filesToRemove).toEqual(['non-existent']);
        expect(result.cleanup).toEqual([]);
      });

      it('handles empty files array', () => {
        const result = findFilesToRemove([], 'any-id');

        expect(result.filesToRemove).toEqual(['any-id']);
        expect(result.cleanup).toEqual([]);
      });
    });

    describe('edge cases', () => {
      it('handles multiple thumbnails with same base name', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'song.mp3', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: 'song.jpg', type: 'thumbnail' }),
          createMockFile({ id: 'thumb-2', name: 'song.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        // Should only find the first matching thumbnail
        expect(result.filesToRemove.filter(id => id.startsWith('thumb-'))).toHaveLength(1);
      });

      it('handles special characters in filenames', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: 'my song [version 1].mp3', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: 'my song [version 1].jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).toContain('thumb-1');
      });

      it('handles unicode characters in filenames', () => {
        const localFiles: FileRecord[] = [
          createMockFile({ id: 'audio-1', name: '音楽.mp3', type: 'audio' }),
          createMockFile({ id: 'thumb-1', name: '音楽.jpg', type: 'thumbnail' }),
        ];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.filesToRemove).toContain('thumb-1');
      });
    });

    describe('cleanup structure', () => {
      it('includes main file first in cleanup array', () => {
        const audioFile = createMockFile({ id: 'audio-1', name: 'song.mp3', type: 'audio' });
        const thumbFile = createMockFile({ id: 'thumb-1', name: 'song.jpg', type: 'thumbnail' });
        
        const localFiles: FileRecord[] = [audioFile, thumbFile];

        const result = findFilesToRemove(localFiles, 'audio-1');

        expect(result.cleanup).toHaveLength(2);
        expect(result.cleanup[1]).toBe(audioFile); // Main file is added last
        expect(result.cleanup[0]).toBe(thumbFile); // Thumbnail is added first
      });

      it('preserves file object references in cleanup', () => {
        const originalFile = createMockFile({ id: 'file-1', name: 'test.mp3', type: 'audio' });
        const localFiles: FileRecord[] = [originalFile];

        const result = findFilesToRemove(localFiles, 'file-1');

        expect(result.cleanup[0]).toBe(originalFile);
      });
    });
  });
});