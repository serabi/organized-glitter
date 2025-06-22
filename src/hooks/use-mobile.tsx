import * as React from 'react';

const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(false);
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean>(false);

  React.useEffect(() => {
    // Check if device has touch capabilities (works across all mobile platforms)
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches
      );
    };

    // Check screen size for mobile layout
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const mqlTouch = window.matchMedia('(hover: none) and (pointer: coarse)');
    
    const onChange = () => {
      const screenSizeMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const touchDevice = checkTouchDevice();
      
      setIsMobile(screenSizeMobile);
      setIsTouchDevice(touchDevice);
    };

    mql.addEventListener('change', onChange);
    mqlTouch.addEventListener('change', onChange);
    
    // Initial check
    onChange();
    
    return () => {
      mql.removeEventListener('change', onChange);
      mqlTouch.removeEventListener('change', onChange);
    };
  }, []);

  return isMobile;
}

// Additional hook for touch device detection specifically
export function useIsTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = React.useState<boolean>(false);

  React.useEffect(() => {
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches
      );
    };

    const mqlTouch = window.matchMedia('(hover: none) and (pointer: coarse)');
    
    const onChange = () => {
      setIsTouchDevice(checkTouchDevice());
    };

    mqlTouch.addEventListener('change', onChange);
    onChange(); // Initial check
    
    return () => mqlTouch.removeEventListener('change', onChange);
  }, []);

  return isTouchDevice;
}

// Combined hook for comprehensive mobile detection
export function useMobileDevice() {
  const [deviceInfo, setDeviceInfo] = React.useState({
    isMobile: false,
    isTouchDevice: false,
    isMobileAndTouch: false,
  });

  React.useEffect(() => {
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        window.matchMedia('(hover: none) and (pointer: coarse)').matches
      );
    };

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
