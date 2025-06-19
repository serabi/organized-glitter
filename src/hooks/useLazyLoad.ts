import { useEffect, useRef, useState } from 'react';

interface UseLazyLoadProps {
  threshold?: number;
  rootMargin?: string;
  skip?: boolean; // Add skip property
}

export const useLazyLoad = ({
  threshold = 0.1,
  rootMargin = '100px',
  skip = false, // Default skip to false
}: UseLazyLoadProps = {}) => {
  const [isVisible, setIsVisible] = useState(skip); // If skipping, set to visible immediately
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This effect synchronizes the isVisible state with the skip prop.
    // When skip becomes false, isVisible is reset to false, allowing the
    // IntersectionObserver to determine visibility.
    setIsVisible(skip);
  }, [skip]);

  useEffect(() => {
    // If the element is already visible (because skip is true or it has intersected),
    // we don't need to set up an observer.
    if (isVisible) {
      return;
    }

    const element = ref.current;
    if (!element) return;

    // Fallback for environments without IntersectionObserver
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (element) {
            observer.unobserve(element);
          }
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [isVisible, rootMargin, threshold]);

  return { ref, isVisible };
};
