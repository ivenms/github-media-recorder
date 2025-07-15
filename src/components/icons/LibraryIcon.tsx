import React from 'react';

const LibraryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="28" height="28" rx="8" fill="white" fillOpacity="0.7" />
    <rect x="8" y="9" width="3" height="10" rx="1.5" fill="#3B82F6" />
    <rect x="13" y="6" width="3" height="13" rx="1.5" fill="#3B82F6" />
    <rect x="18" y="12" width="3" height="7" rx="1.5" fill="#3B82F6" />
  </svg>
);

export default LibraryIcon; 