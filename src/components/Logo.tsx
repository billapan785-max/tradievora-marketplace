import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => (
  <svg 
    viewBox="0 0 100 100" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="tradiora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ea580c" /> {/* orange-600 */}
        <stop offset="100%" stopColor="#f97316" /> {/* orange-500 */}
      </linearGradient>
    </defs>
    <path 
      d="M50 5 L90 25 L90 75 L50 95 L10 75 L10 25 Z" 
      stroke="url(#tradiora-grad)" 
      strokeWidth="8" 
      strokeLinejoin="round"
    />
    <path 
      d="M50 5 L50 45 L90 25 M50 45 L10 25 M50 45 L50 95" 
      stroke="url(#tradiora-grad)" 
      strokeWidth="6" 
      strokeLinejoin="round"
    />
    <circle cx="50" cy="45" r="8" fill="#ea580c" />
  </svg>
);
