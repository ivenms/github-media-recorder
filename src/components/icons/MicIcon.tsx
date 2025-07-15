import React from 'react';

const MicIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="28" height="28" rx="8" fill="white" fillOpacity="0.7" />
    <rect x="10" y="7" width="8" height="12" rx="4" stroke="#3B82F6" strokeWidth="2" fill="none" />
    <path d="M14 21V19" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M10 15V14C10 16.2091 11.7909 18 14 18C16.2091 18 18 16.2091 18 14V15" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default MicIcon; 