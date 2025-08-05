import { renderHook, act } from '@testing-library/react';
import { useAudioForm } from '../../src/hooks/useAudioForm';
import { getMediaCategories } from '../../src/utils/appConfig';
import { FILE_LIMITS } from '../../src/utils/storageQuota';
import { getTodayDateString } from '../../src/utils/date';

// Mock dependencies
jest.mock('../../src/utils/appConfig', () => ({
  getMediaCategories: jest.fn(),
}));

jest.mock('../../src/utils/date', () => ({
  getTodayDateString: jest.fn(),
}));

jest.mock('../../src/stores/uiStore', () => ({
  useUIStore: jest.fn(),
}));

import { useUIStore } from '../../src/stores/uiStore';

const mockGetMediaCategories = getMediaCategories as jest.MockedFunction<typeof getMediaCategories>;
const mockGetTodayDateString = getTodayDateString as jest.MockedFunction<typeof getTodayDateString>;
const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;

const mockOpenModal = jest.fn();

describe('useAudioForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetMediaCategories.mockReturnValue([
      { id: 'music', name: 'Music' },
      { id: 'podcast', name: 'Podcast' },
      { id: 'voice', name: 'Voice' }
    ]);
    
    mockGetTodayDateString.mockReturnValue('2024-01-15');
    
    mockUseUIStore.mockReturnValue({
      openModal: mockOpenModal,
    });
  });

  describe('Initial State', () => {
    it('should return initial state values', () => {
      const { result } = renderHook(() => useAudioForm());

      expect(result.current.title).toBe('');
      expect(result.current.author).toBe('');
      expect(result.current.category).toBe('music'); // First category
      expect(result.current.date).toBe('2024-01-15');
      expect(result.current.titleError).toBeNull();
      expect(result.current.authorError).toBeNull();
      expect(result.current.thumbnail).toBeNull();
      expect(result.current.thumbnailError).toBeNull();
      expect(typeof result.current.validateInputs).toBe('function');
      expect(typeof result.current.handleThumbnailChange).toBe('function');
    });

    it('should initialize with first category from getMediaCategories', () => {
      mockGetMediaCategories.mockReturnValue([
        { id: 'podcast', name: 'Podcast' },
        { id: 'music', name: 'Music' }
      ]);

      const { result } = renderHook(() => useAudioForm());

      expect(result.current.category).toBe('podcast');
    });

    it('should initialize date with today\'s date', () => {
      mockGetTodayDateString.mockReturnValue('2024-12-25');

      const { result } = renderHook(() => useAudioForm());

      expect(result.current.date).toBe('2024-12-25');
    });
  });

  describe('State Setters', () => {
    it('should update title', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setTitle('New Title');
      });

      expect(result.current.title).toBe('New Title');
    });

    it('should update author', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setAuthor('John Doe');
      });

      expect(result.current.author).toBe('John Doe');
    });

    it('should update category', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setCategory('podcast');
      });

      expect(result.current.category).toBe('podcast');
    });

    it('should update date', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setDate('2024-02-01');
      });

      expect(result.current.date).toBe('2024-02-01');
    });

    it('should update thumbnail', () => {
      const { result } = renderHook(() => useAudioForm());
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

      act(() => {
        result.current.setThumbnail(mockFile);
      });

      expect(result.current.thumbnail).toBe(mockFile);
    });

    it('should update thumbnail error', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setThumbnailError('Test error');
      });

      expect(result.current.thumbnailError).toBe('Test error');
    });
  });

  describe('Input Validation', () => {
    describe('Title Validation', () => {
      it('should pass validation with valid title', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(true);
        expect(result.current.titleError).toBeNull();
      });

      it('should fail validation with empty title', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('');
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.titleError).toBe('Title is required.');
      });

      it('should fail validation with whitespace-only title', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('   ');
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.titleError).toBe('Title is required.');
      });

      it('should fail validation with title exceeding 100 characters', () => {
        const { result } = renderHook(() => useAudioForm());
        const longTitle = 'a'.repeat(101);

        act(() => {
          result.current.setTitle(longTitle);
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.titleError).toBe('Title cannot exceed 100 characters.');
      });

      it('should fail validation with title containing underscore', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Title_With_Underscore');
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.titleError).toBe('Underscore ( _ ) is not allowed in Title.');
      });

      it('should pass validation with title exactly 100 characters', () => {
        const { result } = renderHook(() => useAudioForm());
        const maxTitle = 'a'.repeat(100);

        act(() => {
          result.current.setTitle(maxTitle);
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(true);
        expect(result.current.titleError).toBeNull();
      });
    });

    describe('Author Validation', () => {
      it('should pass validation with valid author', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(true);
        expect(result.current.authorError).toBeNull();
      });

      it('should fail validation with empty author', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor('');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.authorError).toBe('Author is required.');
      });

      it('should fail validation with whitespace-only author', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor('   ');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.authorError).toBe('Author is required.');
      });

      it('should fail validation with author exceeding 50 characters', () => {
        const { result } = renderHook(() => useAudioForm());
        const longAuthor = 'a'.repeat(51);

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor(longAuthor);
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.authorError).toBe('Author cannot exceed 50 characters.');
      });

      it('should fail validation with author containing underscore', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor('Author_With_Underscore');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.authorError).toBe('Underscore ( _ ) is not allowed in Author.');
      });

      it('should pass validation with author exactly 50 characters', () => {
        const { result } = renderHook(() => useAudioForm());
        const maxAuthor = 'a'.repeat(50);

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor(maxAuthor);
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(true);
        expect(result.current.authorError).toBeNull();
      });
    });

    describe('Combined Validation', () => {
      it('should reset errors before validation', () => {
        const { result } = renderHook(() => useAudioForm());

        // Set invalid inputs first
        act(() => {
          result.current.setTitle('');
          result.current.setAuthor('');
        });

        act(() => {
          result.current.validateInputs();
        });

        expect(result.current.titleError).toBeTruthy();
        expect(result.current.authorError).toBeTruthy();

        // Now set valid inputs
        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(true);
        expect(result.current.titleError).toBeNull();
        expect(result.current.authorError).toBeNull();
      });

      it('should return false when both title and author are invalid', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('');
          result.current.setAuthor('');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.titleError).toBe('Title is required.');
        expect(result.current.authorError).toBe('Author is required.');
      });

      it('should return false when title is invalid but author is valid', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Title_With_Underscore');
          result.current.setAuthor('Valid Author');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.titleError).toBe('Underscore ( _ ) is not allowed in Title.');
        expect(result.current.authorError).toBeNull();
      });

      it('should return false when author is invalid but title is valid', () => {
        const { result } = renderHook(() => useAudioForm());

        act(() => {
          result.current.setTitle('Valid Title');
          result.current.setAuthor('Author_With_Underscore');
        });

        let isValid: boolean;
        act(() => {
          isValid = result.current.validateInputs();
        });

        expect(isValid!).toBe(false);
        expect(result.current.titleError).toBeNull();
        expect(result.current.authorError).toBe('Underscore ( _ ) is not allowed in Author.');
      });
    });
  });

  describe('Thumbnail Handling', () => {
    it('should accept valid image file', () => {
      const { result } = renderHook(() => useAudioForm());
      const validImageFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const mockEvent = {
        target: {
          files: [validImageFile],
          value: 'test.jpg'
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBe(validImageFile);
      expect(result.current.thumbnailError).toBeNull();
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should accept different image types', () => {
      const { result } = renderHook(() => useAudioForm());
      const pngFile = new File(['test'], 'test.png', { type: 'image/png' });
      
      const mockEvent = {
        target: {
          files: [pngFile],
          value: 'test.png'
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBe(pngFile);
    });

    it('should reject non-image files', () => {
      const { result } = renderHook(() => useAudioForm());
      const nonImageFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      const mockEvent = {
        target: {
          files: [nonImageFile],
          value: 'test.txt'
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBeNull();
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please select a valid image file.',
        confirmText: 'OK'
      });
      expect(mockEvent.target.value).toBe('');
    });

    it('should reject files exceeding size limit', () => {
      const { result } = renderHook(() => useAudioForm());
      const largeFile = new File(['test'], 'large.jpg', { type: 'image/jpeg' });
      
      // Mock file size to exceed limit
      Object.defineProperty(largeFile, 'size', {
        value: FILE_LIMITS.MAX_THUMBNAIL_SIZE + 1,
        writable: false
      });
      
      const mockEvent = {
        target: {
          files: [largeFile],
          value: 'large.jpg'
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBeNull();
      expect(mockOpenModal).toHaveBeenCalledWith({
        type: 'error',
        title: 'File Too Large',
        message: 'Thumbnail file is too large. Maximum size is 5MB.',
        confirmText: 'OK'
      });
      expect(mockEvent.target.value).toBe('');
    });

    it('should handle file within size limit', () => {
      const { result } = renderHook(() => useAudioForm());
      const validFile = new File(['test'], 'valid.jpg', { type: 'image/jpeg' });
      
      // Mock file size to be within limit
      Object.defineProperty(validFile, 'size', {
        value: FILE_LIMITS.MAX_THUMBNAIL_SIZE - 1,
        writable: false
      });
      
      const mockEvent = {
        target: {
          files: [validFile],
          value: 'valid.jpg'
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBe(validFile);
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should handle file exactly at size limit', () => {
      const { result } = renderHook(() => useAudioForm());
      const validFile = new File(['test'], 'valid.jpg', { type: 'image/jpeg' });
      
      // Mock file size to be exactly at limit
      Object.defineProperty(validFile, 'size', {
        value: FILE_LIMITS.MAX_THUMBNAIL_SIZE,
        writable: false
      });
      
      const mockEvent = {
        target: {
          files: [validFile],
          value: 'valid.jpg'
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBe(validFile);
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should handle empty file selection', () => {
      const { result } = renderHook(() => useAudioForm());
      
      const mockEvent = {
        target: {
          files: [],
          value: ''
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBeNull();
      expect(result.current.thumbnailError).toBeNull();
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should handle null files array', () => {
      const { result } = renderHook(() => useAudioForm());
      
      const mockEvent = {
        target: {
          files: null,
          value: ''
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnail).toBeNull();
      expect(result.current.thumbnailError).toBeNull();
      expect(mockOpenModal).not.toHaveBeenCalled();
    });

    it('should reset thumbnail error when handling new file', () => {
      const { result } = renderHook(() => useAudioForm());
      
      // Set initial error
      act(() => {
        result.current.setThumbnailError('Previous error');
      });
      
      expect(result.current.thumbnailError).toBe('Previous error');
      
      const validFile = new File(['test'], 'valid.jpg', { type: 'image/jpeg' });
      const mockEvent = {
        target: {
          files: [validFile],
          value: 'valid.jpg'
        }
      } as unknown as React.ChangeEvent<HTMLInputElement>;

      act(() => {
        result.current.handleThumbnailChange(mockEvent);
      });

      expect(result.current.thumbnailError).toBeNull();
      expect(result.current.thumbnail).toBe(validFile);
    });
  });

  describe('Edge Cases', () => {
    it('should handle getMediaCategories returning empty array', () => {
      mockGetMediaCategories.mockReturnValue([]);

      expect(() => {
        renderHook(() => useAudioForm());
      }).toThrow('Cannot read properties of undefined (reading \'id\')');
    });

    it('should handle validation with trimmed strings', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setTitle('  Valid Title  ');
        result.current.setAuthor('  Valid Author  ');
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateInputs();
      });

      expect(isValid!).toBe(true);
      expect(result.current.titleError).toBeNull();
      expect(result.current.authorError).toBeNull();
    });

    it('should handle multiple underscores in title', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setTitle('Title_With_Multiple_Underscores');
        result.current.setAuthor('Valid Author');
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateInputs();
      });

      expect(isValid!).toBe(false);
      expect(result.current.titleError).toBe('Underscore ( _ ) is not allowed in Title.');
    });

    it('should handle multiple underscores in author', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setTitle('Valid Title');
        result.current.setAuthor('Author_With_Multiple_Underscores');
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateInputs();
      });

      expect(isValid!).toBe(false);
      expect(result.current.titleError).toBeNull();
      expect(result.current.authorError).toBe('Underscore ( _ ) is not allowed in Author.');
    });

    it('should handle special characters except underscore', () => {
      const { result } = renderHook(() => useAudioForm());

      act(() => {
        result.current.setTitle('Title-With-Special Characters');
        result.current.setAuthor('Author-With-Special Characters');
      });

      let isValid: boolean;
      act(() => {
        isValid = result.current.validateInputs();
      });

      expect(isValid!).toBe(true);
      expect(result.current.titleError).toBeNull();
      expect(result.current.authorError).toBeNull();
    });
  });

  describe('Hook Stability', () => {
    it('should create new function references on each render', () => {
      const { result, rerender } = renderHook(() => useAudioForm());

      const firstValidateInputs = result.current.validateInputs;
      const firstHandleThumbnailChange = result.current.handleThumbnailChange;

      rerender();

      // Functions are recreated on each render since they're not memoized
      expect(result.current.validateInputs).not.toBe(firstValidateInputs);
      expect(result.current.handleThumbnailChange).not.toBe(firstHandleThumbnailChange);
      
      // But they should still be functions
      expect(typeof result.current.validateInputs).toBe('function');
      expect(typeof result.current.handleThumbnailChange).toBe('function');
    });

    it('should properly cleanup on unmount', () => {
      const { unmount } = renderHook(() => useAudioForm());

      // Should not throw any errors
      expect(() => unmount()).not.toThrow();
    });
  });
});