import { useState, useEffect } from 'react';

type Orientation = 'portrait' | 'landscape';

export const useScreenOrientation = (): Orientation => {
  const [orientation, setOrientation] = useState<Orientation>('portrait');

  useEffect(() => {
    const getOrientation = () => {
      if (window.matchMedia('(orientation: landscape)').matches) {
        return 'landscape';
      }
      return 'portrait';
    };

    const handleOrientationChange = () => {
      setOrientation(getOrientation());
    };

    const mediaQuery = window.matchMedia('(orientation: landscape)');
    mediaQuery.addEventListener('change', handleOrientationChange);
    
    // Initial check
    handleOrientationChange();

    return () => {
      mediaQuery.removeEventListener('change', handleOrientationChange);
    };
  }, []);

  return orientation;
};
