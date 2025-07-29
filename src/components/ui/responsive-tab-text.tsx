/**
 * @fileoverview Responsive Tab Text Component
 *
 * A responsive text component that automatically abbreviates tab labels on smaller screens
 * to prevent text overflow while maintaining full accessibility with proper aria-labels.
 * Uses window dimensions to determine when to show abbreviated vs full text.
 *
 * Features:
 * - Smart text abbreviation based on screen width
 * - Maintains accessibility with aria-label for full text
 * - Smooth transitions between text states
 * - Configurable breakpoints for responsive behavior
 *
 * @author serabi
 * @created 2025-07-04
 * @version 1.0.0 - Initial responsive tab text implementation
 */

import { useState, useEffect } from 'react';

/**
 * Custom hook to get window dimensions
 */
const useWindowDimensions = () => {
  const [windowDimensions, setWindowDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  return windowDimensions;
};

interface ResponsiveTabTextProps {
  fullText: string;
  abbreviatedText?: string;
  breakpoint?: number;
  className?: string;
}

const ResponsiveTabText = ({
  fullText,
  abbreviatedText,
  breakpoint = 375,
  className = '',
}: ResponsiveTabTextProps) => {
  const { width } = useWindowDimensions();
  const shouldAbbreviate = width < breakpoint && abbreviatedText;
  const displayText = shouldAbbreviate ? abbreviatedText : fullText;

  return (
    <span
      className={`transition-all duration-200 ${className}`}
      aria-label={fullText}
      title={fullText}
    >
      {displayText}
    </span>
  );
};



export default ResponsiveTabText;
export { useWindowDimensions };
