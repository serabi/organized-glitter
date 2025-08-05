/**
 * Device and browser detection utilities for PWA functionality
 * @author @serabi
 * @created 2025-01-04
 */

/**
 * Detects if the current device is running iOS
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Detects if the current browser is Safari
 */
export const isSafari = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent;
  return /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(userAgent);
};

/**
 * Detects if the app is currently running as a standalone PWA
 */
export const isStandalone = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  // Check for iOS standalone mode
  if ('standalone' in window.navigator) {
    return (window.navigator as { standalone?: boolean }).standalone === true;
  }
  
  // Check for Android/Chrome standalone mode
  if (window.matchMedia) {
    return window.matchMedia('(display-mode: standalone)').matches;
  }
  
  return false;
};

/**
 * Detects if the current device is macOS Safari
 */
export const isMacOSSafari = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  return /Safari/.test(userAgent) && 
         /Mac/.test(platform) && 
         !/Chrome|CriOS|FxiOS|EdgiOS/.test(userAgent);
};

/**
 * Detects if the current device is iOS Safari and not already installed as PWA
 */
export const shouldShowIOSInstallPrompt = (): boolean => {
  return isIOS() && isSafari() && !isStandalone();
};

/**
 * Detects if the current device is macOS Safari and not already installed as PWA
 */
export const shouldShowMacOSInstallPrompt = (): boolean => {
  return isMacOSSafari() && !isStandalone();
};

/**
 * Gets the device type for analytics or UI customization
 */
export const getDeviceType = (): 'ios' | 'android' | 'desktop' | 'unknown' => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'unknown';
  }
  
  const userAgent = navigator.userAgent;
  
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return 'ios';
  }
  
  if (/Android/.test(userAgent)) {
    return 'android';
  }
  
  if (/Windows|Mac|Linux/.test(userAgent)) {
    return 'desktop';
  }
  
  return 'unknown';
};

/**
 * Checks if the browser supports PWA installation
 */
export const supportsPWAInstallation = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // iOS Safari supports manual installation
  if (isIOS() && isSafari()) {
    return true;
  }
  
  // macOS Safari supports manual installation (Sonoma 14+)
  if (isMacOSSafari()) {
    return true;
  }
  
  // Check for beforeinstallprompt event support (Chrome/Edge)
  return 'BeforeInstallPromptEvent' in window || 
         'onbeforeinstallprompt' in window;
};