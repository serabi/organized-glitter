import { useImageLoader } from './useImageLoader';
import { useLazyLoad } from './useLazyLoad';

interface UseConditionalImageLoaderProps {
  src?: string;
  skipImageLoading: boolean;
}

export const useConditionalImageLoader = ({
  src,
  skipImageLoading,
}: UseConditionalImageLoaderProps) => {
  const { ref, isVisible } = useLazyLoad({
    threshold: 0.1,
    rootMargin: '200px',
    skip: skipImageLoading,
  });

  const imageLoaderResult = useImageLoader({
    src: !skipImageLoading && isVisible ? src : undefined,
  });

  return { ref, ...imageLoaderResult };
};
