import { useState } from 'react';
import { getMediaCategories } from '../utils/appConfig';
import { FILE_LIMITS } from '../utils/storageQuota';
import { useUIStore } from '../stores/uiStore';
import { getTodayDateString } from '../utils/date';

export function useAudioForm() {
  const { openModal } = useUIStore();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(() => getMediaCategories()[0].id);
  const [date, setDate] = useState(getTodayDateString());
  const [titleError, setTitleError] = useState<string | null>(null);
  const [authorError, setAuthorError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  const validateInputs = () => {
    let isValid = true;
    
    // Reset errors
    setTitleError(null);
    setAuthorError(null);
    
    // Validate title
    if (!title.trim()) {
      setTitleError('Title is required.');
      isValid = false;
    } else if (title.length > 100) {
      setTitleError('Title cannot exceed 100 characters.');
      isValid = false;
    } else if (title.includes('_')) {
      setTitleError('Underscore ( _ ) is not allowed in Title.');
      isValid = false;
    }
    
    // Validate author
    if (!author.trim()) {
      setAuthorError('Author is required.');
      isValid = false;
    } else if (author.length > 50) {
      setAuthorError('Author cannot exceed 50 characters.');
      isValid = false;
    } else if (author.includes('_')) {
      setAuthorError('Underscore ( _ ) is not allowed in Author.');
      isValid = false;
    }
    
    return isValid;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThumbnailError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        openModal({
          type: 'error',
          title: 'Invalid File Type',
          message: 'Please select a valid image file.',
          confirmText: 'OK'
        });
        setThumbnail(null);
        // Clear the input
        e.target.value = '';
        return;
      }
      if (file.size > FILE_LIMITS.MAX_THUMBNAIL_SIZE) {
        openModal({
          type: 'error',
          title: 'File Too Large',
          message: 'Thumbnail file is too large. Maximum size is 5MB.',
          confirmText: 'OK'
        });
        setThumbnail(null);
        // Clear the input
        e.target.value = '';
        return;
      }
      setThumbnail(file);
    }
  };

  return {
    title,
    setTitle,
    author,
    setAuthor,
    category,
    setCategory,
    date,
    setDate,
    titleError,
    authorError,
    thumbnail,
    setThumbnail,
    thumbnailError,
    setThumbnailError,
    validateInputs,
    handleThumbnailChange,
  };
} 