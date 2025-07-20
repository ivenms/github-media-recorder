import React, { useState, useEffect } from 'react';
import { useGitHubUrl } from '../hooks/useGitHubUrl';

interface GitHubImageProps {
  filePath: string;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Component to display images from GitHub with dynamic URL generation
 * Handles token refresh and caching automatically
 */
const GitHubImage: React.FC<GitHubImageProps> = ({ 
  filePath, 
  alt, 
  className = "", 
  fallback 
}) => {
  const { getUrl, isLoading } = useGitHubUrl();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const loadUrl = async () => {
      try {
        setError(false);
        const url = await getUrl(filePath);
        setImageUrl(url);
      } catch (err) {
        console.error('Failed to load image URL:', err);
        setError(true);
      }
    };

    if (filePath) {
      loadUrl();
    }
  }, [filePath, getUrl]);

  if (error || !imageUrl) {
    return <>{fallback}</>;
  }

  if (isLoading(filePath)) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-pulse bg-gray-200 w-full h-full rounded"></div>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default GitHubImage;