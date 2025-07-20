import React, { useState, useEffect } from 'react';
import { useGitHubUrl } from '../hooks/useGitHubUrl';

interface GitHubMediaProps {
  filePath: string;
  type: 'audio' | 'video';
  controls?: boolean;
  className?: string;
  fallback?: React.ReactNode;
}

/**
 * Component to display audio/video from GitHub with dynamic URL generation
 * Handles token refresh and caching automatically
 */
const GitHubMedia: React.FC<GitHubMediaProps> = ({ 
  filePath, 
  type,
  controls = true,
  className = "", 
  fallback 
}) => {
  const { getUrl, isLoading } = useGitHubUrl();
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    const loadUrl = async () => {
      try {
        setError(false);
        const url = await getUrl(filePath);
        setMediaUrl(url);
      } catch (err) {
        console.error('Failed to load media URL:', err);
        setError(true);
      }
    };

    if (filePath) {
      loadUrl();
    }
  }, [filePath, getUrl]);

  if (error || !mediaUrl) {
    return <>{fallback}</>;
  }

  if (isLoading(filePath)) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-pulse bg-gray-200 w-full h-full rounded flex items-center justify-center">
          <span className="text-gray-500 text-sm">Loading {type}...</span>
        </div>
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <audio
        src={mediaUrl}
        controls={controls}
        className={className}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <video
      src={mediaUrl}
      controls={controls}
      className={className}
      onError={() => setError(true)}
    />
  );
};

export default GitHubMedia;