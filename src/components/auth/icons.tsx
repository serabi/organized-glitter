// icons.tsx
import React from 'react';

interface IconProps {
  className?: string;
}

export const BetaTesterIcon: React.FC<IconProps> = ({
  // icon displays on profile page for beta testers
  className = 'h-4 w-4',
}) => (
  <svg className={className} viewBox="0 0 24 24" fill="#FFD700" stroke="#FFA500" strokeWidth="0.5">
    <path d="M12 2L14.85 8.35L22 9.27L17 14.14L18.27 21.02L12 17.77L5.73 21.02L7 14.14L2 9.27L9.15 8.35L12 2Z" />
  </svg>
);
