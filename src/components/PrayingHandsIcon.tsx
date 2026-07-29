import React from 'react';

export const PrayingHandsIcon = ({ className = "w-6 h-6", strokeWidth = 2, ...props }: any) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className} 
    {...props}
  >
    {/* Cross */}
    <path d="M12 2v5" />
    <path d="M9.5 4h5" />
    
    {/* Hands outer shapes (palms together) */}
    <path d="M11 9c-3 2-5 5-4 9l-2 2l2 2l3-3" />
    <path d="M13 9c3 2 5 5 4 9l2 2l-2 2l-3-3" />
    
    {/* Inner curves */}
    <path d="M11 11c-2 3-2 6-1 8" />
    <path d="M13 11c2 3 2 6 1 8" />
  </svg>
);
