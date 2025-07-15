import React from 'react';

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="28" height="28" rx="8" fill="white" fillOpacity="0.7" />
    <circle cx="14" cy="14" r="4" stroke="#3B82F6" strokeWidth="2" fill="none" />
    <path d="M14 4V8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M14 20V24" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 14H8" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M20 14H24" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M7.05 7.05L9.88 9.88" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M18.12 18.12L20.95 20.95" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M7.05 20.95L9.88 18.12" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
    <path d="M18.12 9.88L20.95 7.05" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default SettingsIcon; 