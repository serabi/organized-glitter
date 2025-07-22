import * as React from 'react';

// Enhanced breakpoint definitions to match our Tailwind config
const BREAKPOINTS = {
  xs: 480,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

// Legacy mobile breakpoint for backwards compatibility
const MOBILE_BREAKPOINT = BREAKPOINTS.lg;

// Shared utility for touch device detection
const checkTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  );
};

// Enhanced device info interface
interface DeviceInfo {
  isMobile: boolean;
  isTouchDevice: boolean;
  isMobileAndTouch: boolean;
  isTablet: boolean;
  isLandscape: boolean;
  screenSize: keyof typeof BREAKPOINTS | 'xs-' | '2xl+';
  width: number;
  height: number;
}

// Base hook that provides comprehensive device detection logic
export function useMobileDevice() {
  const [deviceInfo, setDeviceInfo] = React.useState<DeviceInfo>({
    isMobile: false,
    isTouchDevice: false,
    isMobileAndTouch: false,
    isTablet: false,
    isLandscape: false,
    screenSize: 'lg',
    width: 1024,
    height: 768,
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const mqlTouch = window.matchMedia('(hover: none) and (pointer: coarse)');

    const updateDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isLandscape = width > height;
      const touchDevice = checkTouchDevice();
      const screenSizeMobile = width < MOBILE_BREAKPOINT;

      // Determine screen size category
      let screenSize: DeviceInfo['screenSize'] = 'xs-';
      if (width >= BREAKPOINTS['2xl']) screenSize = '2xl+';
      else if (width >= BREAKPOINTS.xl) screenSize = 'xl';
      else if (width >= BREAKPOINTS.lg) screenSize = 'lg';
      else if (width >= BREAKPOINTS.md) screenSize = 'md';
      else if (width >= BREAKPOINTS.sm) screenSize = 'sm';
      else if (width >= BREAKPOINTS.xs) screenSize = 'xs';

      // Determine if this is a tablet (touch device with medium-large screen)
      const isTablet = touchDevice && width >= BREAKPOINTS.sm && width < BREAKPOINTS.xl;

      setDeviceInfo({
        isMobile: screenSizeMobile,
        isTouchDevice: touchDevice,
        isMobileAndTouch: screenSizeMobile && touchDevice,
        isTablet,
        isLandscape,
        screenSize,
        width,
        height,
      });
    };

    mql.addEventListener('change', updateDeviceInfo);
    mqlTouch.addEventListener('change', updateDeviceInfo);
    window.addEventListener('resize', updateDeviceInfo);
    updateDeviceInfo(); // Initial check

    return () => {
      mql.removeEventListener('change', updateDeviceInfo);
      mqlTouch.removeEventListener('change', updateDeviceInfo);
      window.removeEventListener('resize', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

// Simplified hooks that use the base hook
export function useIsMobile() {
  const { isMobile } = useMobileDevice();
  return isMobile;
}

export function useIsTouchDevice() {
  const { isTouchDevice } = useMobileDevice();
  return isTouchDevice;
}

// New convenience hooks for enhanced breakpoint detection
export function useIsTablet() {
  const { isTablet } = useMobileDevice();
  return isTablet;
}

export function useIsLandscape() {
  const { isLandscape } = useMobileDevice();
  return isLandscape;
}

export function useScreenSize() {
  const { screenSize } = useMobileDevice();
  return screenSize;
}

export function useWindowSize() {
  const { width, height } = useMobileDevice();
  return { width, height };
}

// Hook for checking specific breakpoints
export function useBreakpoint(breakpoint: keyof typeof BREAKPOINTS) {
  const { width } = useMobileDevice();
  return width >= BREAKPOINTS[breakpoint];
}

// Export breakpoints for external use
export { BREAKPOINTS };
