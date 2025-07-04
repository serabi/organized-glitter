import React, { memo, useMemo } from 'react';
import { AvatarDisplayProps, AVATAR_COLORS } from '@/types/avatar';
import { logger } from '@/utils/logger';

const AvatarDisplay: React.FC<AvatarDisplayProps> = memo(
  ({ config, size = 64, className = '', fallbackInitials = 'U' }) => {
    // Memoize style object to prevent re-renders
    const sizeStyle = useMemo(
      () => ({
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        maxWidth: size,
        maxHeight: size,
      }),
      [size]
    );

    // Handle uploaded avatar
    if (config?.type === 'upload' && config.uploadUrl) {
      return (
        <div style={sizeStyle} className="relative">
          <img
            key={config.uploadUrl} // Force re-render when URL changes
            src={config.uploadUrl}
            alt="User avatar"
            className={`rounded-full object-cover ${className}`}
            style={sizeStyle}
            onError={e => {
              logger.log('[AvatarDisplay] Failed to load avatar image:', config.uploadUrl);
              // Fallback to initials avatar if upload fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallbackDiv = target.nextElementSibling as HTMLElement;
              if (fallbackDiv) {
                fallbackDiv.style.display = 'flex';
              }
            }}
            onLoad={() => {
              logger.log('[AvatarDisplay] Successfully loaded avatar image:', config.uploadUrl);
            }}
          />
          {/* Fallback initials (initially hidden) */}
          <div
            className={`flex items-center justify-center overflow-hidden rounded-full font-semibold text-white ${className}`}
            style={{
              ...sizeStyle,
              backgroundColor: AVATAR_COLORS[config?.colorIndex || 0],
              fontSize: `${Math.max(12, size * 0.4)}px`,
              position: 'absolute',
              top: 0,
              left: 0,
              display: 'none',
            }}
          >
            {config?.initials || fallbackInitials}
          </div>
        </div>
      );
    }

    // Handle initials avatar or fallback
    const initials = config?.initials || fallbackInitials;
    const colorIndex = config?.colorIndex || 0;
    const backgroundColor = AVATAR_COLORS[colorIndex];
    const fontSize = Math.max(12, size * 0.4);

    return (
      <div
        className={`flex items-center justify-center overflow-hidden rounded-full font-semibold text-white ${className}`}
        style={{
          ...sizeStyle,
          backgroundColor,
          fontSize: `${fontSize}px`,
        }}
      >
        {initials}
      </div>
    );
  }
);

AvatarDisplay.displayName = 'AvatarDisplay';

export default AvatarDisplay;
