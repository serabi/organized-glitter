/**
 * Hook for managing PWA installation prompt and state
 * @author @serabi
 * @created 2025-08-02
 */

import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('PWAInstall');

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface ExtendedNavigator extends Navigator {
  standalone?: boolean;
}

interface PWAInstallState {
  isInstallable: boolean;
  isInstalled: boolean;
  isPromptDismissed: boolean;
  canShowPrompt: boolean;
  promptEvent: BeforeInstallPromptEvent | null;
}

interface PWAInstallActions {
  promptInstall: () => Promise<void>;
  dismissPrompt: () => void;
  resetDismissal: () => void;
}

type PWAInstallHook = PWAInstallState & PWAInstallActions;

const DISMISSAL_KEY = 'pwa-install-dismissed';
const DISMISSAL_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
const INTERACTION_DELAY = 3000; // 3 seconds after page load

/**
 * Custom hook for managing PWA installation state and user interactions
 * @returns PWA installation state and actions
 */
export const usePWAInstall = (): PWAInstallHook => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isPromptDismissed, setIsPromptDismissed] = useState(false);
  const [canShowPrompt, setCanShowPrompt] = useState(false);

  // Check if prompt was previously dismissed
  const checkDismissalStatus = useCallback(() => {
    const dismissedTimestamp = localStorage.getItem(DISMISSAL_KEY);
    if (dismissedTimestamp) {
      const dismissedTime = parseInt(dismissedTimestamp, 10);
      const now = Date.now();
      const isStillDismissed = now - dismissedTime < DISMISSAL_DURATION;

      if (!isStillDismissed) {
        localStorage.removeItem(DISMISSAL_KEY);
        setIsPromptDismissed(false);
      } else {
        setIsPromptDismissed(true);
      }
    }
  }, []);

  // Check if PWA is already installed
  const checkInstallStatus = useCallback(() => {
    // Check if running in standalone mode (installed PWA)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebAppiOS = (window.navigator as ExtendedNavigator)?.standalone === true;
    const isInstalled = isStandaloneMode || isInWebAppiOS;

    setIsInstalled(isInstalled);
    logger.debug('PWA install status checked', { isInstalled, isStandaloneMode, isInWebAppiOS });
  }, []);

  // Handle beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;

      setPromptEvent(promptEvent);
      setIsInstallable(true);

      logger.debug('BeforeInstallPrompt event captured', {
        platforms: promptEvent.platforms,
      });

      // Delay showing prompt to allow user interaction first
      setTimeout(() => {
        setCanShowPrompt(true);
      }, INTERACTION_DELAY);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setPromptEvent(null);
      setCanShowPrompt(false);
      logger.info('PWA installed successfully');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Initial checks
    checkDismissalStatus();
    checkInstallStatus();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [checkDismissalStatus, checkInstallStatus]);

  // Prompt user to install PWA
  const promptInstall = useCallback(async (): Promise<void> => {
    if (!promptEvent) {
      logger.warn('No install prompt event available');
      return;
    }

    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;

      logger.debug('Install prompt result', { outcome });

      if (outcome === 'dismissed') {
        dismissPrompt();
      }

      // Clear the prompt event as it can only be used once
      setPromptEvent(null);
      setCanShowPrompt(false);
    } catch (error) {
      logger.error('Error showing install prompt', error);
    }
  }, [promptEvent, dismissPrompt]);

  // Dismiss the install prompt
  const dismissPrompt = useCallback(() => {
    const now = Date.now().toString();
    localStorage.setItem(DISMISSAL_KEY, now);
    setIsPromptDismissed(true);
    setCanShowPrompt(false);
    logger.debug('Install prompt dismissed');
  }, []);

  // Reset dismissal (for testing or user preference reset)
  const resetDismissal = useCallback(() => {
    localStorage.removeItem(DISMISSAL_KEY);
    setIsPromptDismissed(false);
    logger.debug('Install prompt dismissal reset');
  }, []);

  return {
    isInstallable,
    isInstalled,
    isPromptDismissed,
    canShowPrompt: canShowPrompt && !isInstalled && !isPromptDismissed,
    promptEvent,
    promptInstall,
    dismissPrompt,
    resetDismissal,
  };
};
