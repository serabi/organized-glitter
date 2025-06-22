import * as React from 'react';

const MOBILE_BREAKPOINT = 1024;

// Shared utility for touch device detection
const checkTouchDevice = (): boolean => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(hover: none) and (pointer: coarse)').matches
  );
};

// Base hook that provides all device detection logic
export function useMobileDevice() {
  const [deviceInfo, setDeviceInfo] = React.useState({
    isMobile: false,
    isTouchDevice: false,
    isMobileAndTouch: false,
  });

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const mqlTouch = window.matchMedia('(hover: none) and (pointer: coarse)');
    
    const onChange = () => {
      const screenSizeMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const touchDevice = checkTouchDevice();
      
      setDeviceInfo({
        isMobile: screenSizeMobile,
        isTouchDevice: touchDevice,
        isMobileAndTouch: screenSizeMobile && touchDevice,
      });
    };

    mql.addEventListener('change', onChange);
    mqlTouch.addEventListener('change', onChange);
    onChange(); // Initial check
    
    return () => {
      mql.removeEventListener('change', onChange);
      mqlTouch.removeEventListener('change', onChange);
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
