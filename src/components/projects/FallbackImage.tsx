import React from 'react';

interface FallbackImageProps {
  alt: string;
  className?: string;
  originalUrl?: string;
  error?: string;
}

/**
 * Enhanced fallback image component that displays when an image fails to load
 * This provides a nicer experience than broken image placeholders
 */
const FallbackImage: React.FC<FallbackImageProps> = ({
  alt,
  className = '',
  originalUrl,
  error,
}) => {
  // Generate a background color based on the alt text for variety
  const generateColorFromString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate hue between 0-360 for HSL
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 75%)`;
  };

  const bgColor = generateColorFromString(alt);

  // Create short display text from alt
  const displayText = alt.length > 30 ? `${alt.substring(0, 27)}...` : alt;

  // Determine if this is a Supabase storage URL issue
  const isSupabaseStorageError = originalUrl?.includes('supabase.co/storage');
  const isSignedUrlError = originalUrl?.includes('token=');

  // Create helpful error message
  const getErrorMessage = (): string => {
    if (!error && !originalUrl) return 'No image available';

    if (isSupabaseStorageError && isSignedUrlError) {
      return 'Image link expired';
    }

    if (isSupabaseStorageError) {
      return 'Storage error';
    }

    if (error?.includes('Failed to load')) {
      return 'Failed to load';
    }

    return 'Image unavailable';
  };

  const errorMessage = getErrorMessage();

  return (
    <div
      className={`flex h-full w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-muted-foreground/20 bg-muted ${className}`}
      style={{ backgroundColor: bgColor }}
      aria-label={`Fallback image for: ${alt}`}
      role="img"
      title={originalUrl ? `${errorMessage}: ${originalUrl}` : errorMessage}
    >
      {/* Icon based on error type */}
      {isSupabaseStorageError && isSignedUrlError ? (
        // Clock icon for expired signed URLs
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-2 h-8 w-8 text-background/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ) : (
        // Generic image icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mb-2 h-8 w-8 text-background/80"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      )}

      {/* Main text */}
      <p className="mb-1 max-w-full rounded bg-background/80 px-3 py-1 text-center text-sm font-medium">
        {displayText}
      </p>

      {/* Error message */}
      <p className="max-w-full rounded bg-background/60 px-2 py-0.5 text-center text-xs text-muted-foreground">
        {errorMessage}
      </p>

      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && originalUrl && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer text-background/70 hover:text-background">
            Debug
          </summary>
          <div className="mt-1 max-w-xs break-all rounded bg-background/90 p-2 text-foreground">
            <div>
              <strong>URL:</strong> {originalUrl}
            </div>
            {error && (
              <div>
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
};

export default FallbackImage;
