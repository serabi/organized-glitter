/**
 * PWA installation prompt component with dismissible banner UI
 * @author @serabi
 * @created 2025-08-02
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('PWAInstallPrompt');

interface PWAInstallPromptProps {
  className?: string;
}

/**
 * Displays a dismissible banner prompting users to install the PWA
 * Shows platform-specific instructions and handles installation flow
 */
export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
  const { canShowPrompt, promptInstall, dismissPrompt } = usePWAInstall();
  const { isAuthenticated, initialCheckComplete } = useAuth();

  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Detect platform for specific messaging
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Show prompt with immediate animation - only for authenticated users
  useEffect(() => {
    if (canShowPrompt && isAuthenticated && initialCheckComplete) {
      setIsVisible(true);
      setIsAnimating(true);
      logger.debug('PWA install prompt displayed for authenticated user');
    } else if (!isAuthenticated && isVisible) {
      // Hide prompt if user logs out
      setIsAnimating(false);
      setIsVisible(false);
    }
  }, [canShowPrompt, isAuthenticated, initialCheckComplete, isVisible]);

  // Handle dismiss with immediate state changes (CSS handles animation)
  const handleDismiss = () => {
    setIsAnimating(false);
    setIsVisible(false);
    dismissPrompt();
  };

  // Handle install button click
  const handleInstall = async () => {
    try {
      await promptInstall();
      handleDismiss();
    } catch (error) {
      logger.error('Failed to trigger install prompt', error);
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // iOS Safari specific messaging (manual installation)
  if (isIOS && isSafari) {
    return (
      <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
        <Card
          className={`transform border bg-background/95 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} `}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">Install Organized Glitter</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Tap the share button, then "Add to Home Screen" to install the app.
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 flex-shrink-0 p-0 hover:bg-muted"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Standard install prompt for other browsers
  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
      <Card
        className={`transform border bg-background/95 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out ${isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'} `}
      >
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
            <Download className="h-5 w-5 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-foreground">Install Organized Glitter</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Get quick access and offline functionality
            </p>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <Button size="sm" onClick={handleInstall} className="h-8 px-3 text-xs font-medium">
              Install
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 hover:bg-muted"
              aria-label="Dismiss install prompt"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
