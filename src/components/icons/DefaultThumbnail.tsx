import React from 'react';

const DefaultThumbnail: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="4" y="4" width="40" height="40" rx="8" fill="#E0E7EF" />
    <circle cx="24" cy="20" r="8" fill="#A5B4FC" />
    <rect x="12" y="32" width="24" height="4" rx="2" fill="#A5B4FC" />
    <rect x="4" y="4" width="40" height="40" rx="8" stroke="#6366F1" strokeWidth="2" />
  </svg>
);

export default DefaultThumbnail; 