import React from 'react';
import { useImageLoader } from '@/hooks/useImageLoader';
import { useLazyLoad } from '@/hooks/useLazyLoad';
import { Loader2, RefreshCw, Image as ImageIcon, Palette } from 'lucide-react';

interface ImageTableCellProps {
  imageUrl?: string;
  alt: string;
  size?: 'small' | 'medium';
}

const ImageTableCell: React.FC<ImageTableCellProps> = ({ imageUrl, alt, size = 'small' }) => {
  const sizeClasses = size === 'small' ? 'h-10 w-10' : 'h-16 w-16';

  // Add lazy loading
  const { ref, isVisible } = useLazyLoad({
    threshold: 0.1,
    rootMargin: '50px',
  });

  // Only load image when visible
  const {
    imageUrl: processedImageUrl,
    isLoading,
    error,
    retry,
  } = useImageLoader({
    src: isVisible ? imageUrl : undefined,
  });

  if (!imageUrl) {
    return (
      <div
        ref={ref}
        className={`${sizeClasses} flex flex-shrink-0 items-center justify-center overflow-hidden rounded`}
      >
        <Palette className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  if (!isVisible) {
    return (
      <div
        ref={ref}
        className={`${sizeClasses} flex flex-shrink-0 items-center justify-center overflow-hidden rounded border bg-gray-100 dark:bg-gray-800`}
      >
        <div className="h-4 w-4 animate-pulse rounded bg-gray-300 dark:bg-gray-600" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        ref={ref}
        className={`${sizeClasses} flex flex-shrink-0 items-center justify-center overflow-hidden rounded border bg-gray-100 dark:bg-gray-800`}
      >
        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !processedImageUrl) {
    return (
      <div
        ref={ref}
        className={`${sizeClasses} flex flex-shrink-0 flex-col items-center justify-center overflow-hidden rounded border bg-gray-100 p-1 dark:bg-gray-800`}
      >
        <ImageIcon className="mb-1 h-3 w-3 text-gray-400" />
        <button
          onClick={retry}
          className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          title="Retry loading image"
        >
          <RefreshCw className="h-2 w-2" />
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className={`${sizeClasses} flex-shrink-0 overflow-hidden rounded border`}>
      <img
        src={processedImageUrl}
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => {
          console.error('Table image render error:', processedImageUrl);
        }}
      />
    </div>
  );
};

export default ImageTableCell;
