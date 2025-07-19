import { useState } from 'react';
import { getMediaCategories } from '../utils/appConfig';

export function useAudioForm() {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(() => getMediaCategories()[0].id);
  const [date, setDate] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  const validateInputs = () => {
    if (!title.trim() || !author.trim()) {
      setInputError('Title and Author are required.');
      return false;
    }
    if (title.length > 100) {
      setInputError('Title cannot exceed 100 characters.');
      return false;
    }
    if (author.length > 50) {
      setInputError('Author cannot exceed 50 characters.');
      return false;
    }
    if (title.includes('_') || author.includes('_')) {
      setInputError('Underscore ( _ ) is not allowed in Title or Author.');
      return false;
    }
    setInputError(null);
    return true;
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setThumbnailError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setThumbnailError('Please select a valid image file.');
        setThumbnail(null);
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
    inputError,
    setInputError,
    thumbnail,
    setThumbnail,
    thumbnailError,
    setThumbnailError,
    validateInputs,
    handleThumbnailChange,
  };
} 