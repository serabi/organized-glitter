import { useRef, useEffect, useCallback } from 'react';

/**
 * Custom hook for synchronizing scroll positions between multiple elements
 * @param elementCount Number of elements to sync (default: 3 for top, main, bottom)
 * @returns Array of refs to be attached to scroll elements
 */
export function useExplicitScrollSync(elementCount: number = 3) {
  // Create refs using individual useRef calls based on elementCount
  const ref1 = useRef<HTMLDivElement>(null);
  const ref2 = useRef<HTMLDivElement>(null);
  const ref3 = useRef<HTMLDivElement>(null);
  const ref4 = useRef<HTMLDivElement>(null);
  const ref5 = useRef<HTMLDivElement>(null);

  // Return only the number of refs requested
  const refs = [ref1, ref2, ref3, ref4, ref5].slice(0, elementCount);

  const syncScroll = useCallback(
    (sourceIndex: number, scrollLeft: number) => {
      refs.forEach((ref, index) => {
        if (index !== sourceIndex && ref.current) {
          ref.current.scrollLeft = scrollLeft;
        }
      });
    },
    [refs]
  );

  useEffect(() => {
    const elements = refs.map(ref => ref.current).filter(Boolean);

    if (elements.length === 0) return;

    const handleScroll = (sourceIndex: number) => (event: Event) => {
      const target = event.target as HTMLElement;
      syncScroll(sourceIndex, target.scrollLeft);
    };

    const handlers = elements.map((_, index) => handleScroll(index));

    // Add event listeners with passive option for better performance
    elements.forEach((element, index) => {
      if (element) {
        element.addEventListener('scroll', handlers[index], { passive: true });
      }
    });

    // Cleanup function
    return () => {
      elements.forEach((element, index) => {
        if (element) {
          element.removeEventListener('scroll', handlers[index]);
        }
      });
    };
  }, [syncScroll, refs]);

  return refs;
}

/**
 * Alternative hook with explicit ref management for complex cases
 * Uses throttling to prevent scroll synchronization from interfering with natural scroll behavior
 */
export function useScrollSync() {
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef<{ [key: string]: boolean }>({});

  const throttle = useCallback(<T extends unknown[]>(func: (...args: T) => void, delay: number) => {
    let timeoutId: number | null = null;
    return (...args: T) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => func(...args), delay);
    };
  }, []);

  useEffect(() => {
    const topEl = topScrollRef.current;
    const tableEl = tableScrollRef.current;
    const bottomEl = bottomScrollRef.current;

    if (!topEl || !tableEl || !bottomEl) return;

    const syncScroll = throttle((sourceEl: HTMLElement, targetElements: HTMLElement[]) => {
      const scrollLeft = sourceEl.scrollLeft;
      targetElements.forEach(target => {
        if (target !== sourceEl && target.scrollLeft !== scrollLeft) {
          // Temporarily disable scroll syncing for target to prevent loops
          const targetKey = target === topEl ? 'top' : target === tableEl ? 'table' : 'bottom';
          isScrollingRef.current[targetKey] = true;
          target.scrollLeft = scrollLeft;
          // Re-enable after a brief delay
          setTimeout(() => {
            isScrollingRef.current[targetKey] = false;
          }, 50);
        }
      });
    }, 16); // ~60fps throttling

    const handleTopScroll = (e: Event) => {
      if (isScrollingRef.current.top) return;
      const target = e.target as HTMLElement;
      syncScroll(target, [tableEl, bottomEl]);
    };

    const handleTableScroll = (e: Event) => {
      if (isScrollingRef.current.table) return;
      const target = e.target as HTMLElement;
      syncScroll(target, [topEl, bottomEl]);
    };

    const handleBottomScroll = (e: Event) => {
      if (isScrollingRef.current.bottom) return;
      const target = e.target as HTMLElement;
      syncScroll(target, [topEl, tableEl]);
    };

    // Use passive listeners for better performance and non-blocking behavior
    topEl.addEventListener('scroll', handleTopScroll, { passive: true });
    tableEl.addEventListener('scroll', handleTableScroll, { passive: true });
    bottomEl.addEventListener('scroll', handleBottomScroll, { passive: true });

    return () => {
      topEl.removeEventListener('scroll', handleTopScroll);
      tableEl.removeEventListener('scroll', handleTableScroll);
      bottomEl.removeEventListener('scroll', handleBottomScroll);
    };
  }, [throttle]);

  return {
    topScrollRef,
    tableScrollRef,
    bottomScrollRef,
  };
}
