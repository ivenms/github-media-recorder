import React from 'react';

const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="28" height="28" rx="8" fill="white" fillOpacity="0.7" />
    <path
      d="M8 13L14 8L20 13V20C20 20.5523 19.5523 21 19 21H9C8.44772 21 8 20.5523 8 20V13Z"
      stroke="#3B82F6"
      strokeWidth="2"
      strokeLinejoin="round"
      fill="none"
    />
    <rect x="12" y="16" width="4" height="5" rx="1" fill="#3B82F6" />
  </svg>
);

export default HomeIcon; 