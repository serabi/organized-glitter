/**
 * PWA installation prompt component with dismissible banner UI
 * Enhanced with better iOS Safari support and detailed installation instructions
 * @author @serabi
 * @created 2025-08-02
 * @updated 2025-01-04
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Share, Plus, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';
import { shouldShowIOSInstallPrompt } from '@/utils/deviceDetection';

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

  // Use enhanced iOS detection
  const shouldShowEnhancedIOSPrompt = shouldShowIOSInstallPrompt();

  // Show prompt with immediate animation - only for authenticated users
  useEffect(() => {
    // Show enhanced iOS prompt or standard prompt for other platforms
    const shouldShow = (canShowPrompt || shouldShowEnhancedIOSPrompt) && isAuthenticated && initialCheckComplete;
    
    if (shouldShow) {
      setIsVisible(true);
      setIsAnimating(true);
      logger.debug('PWA install prompt displayed', { 
        isIOSEnhanced: shouldShowEnhancedIOSPrompt,
        canShowPrompt 
      });
    } else if (!isAuthenticated && isVisible) {
      // Hide prompt if user logs out
      setIsAnimating(false);
      setIsVisible(false);
    }
  }, [canShowPrompt, shouldShowEnhancedIOSPrompt, isAuthenticated, initialCheckComplete, isVisible]);

  // Handle temporary dismiss (Got it button) - only dismisses for current session
  const handleTemporaryDismiss = () => {
    setIsAnimating(false);
    setIsVisible(false);
    dismissPrompt();
  };

  // Handle permanent dismiss (Don't show again button) - persists preference
  const handleDontShowAgain = () => {
    setIsAnimating(false);
    setIsVisible(false);
    dismissPrompt();
    // Persist the dismissal preference in localStorage
    localStorage.setItem('pwa-install-dismissed', 'true');
    logger.debug('PWA install prompt permanently dismissed');
  };

  // Handle install button click
  const handleInstall = async () => {
    try {
      await promptInstall();
      handleTemporaryDismiss();
    } catch (error) {
      logger.error('Failed to trigger install prompt', error);
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Enhanced iOS Safari installation guide
  if (shouldShowEnhancedIOSPrompt) {
    return (
      <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
        <div
          className={`transform transition-transform duration-300 ease-out ${
            isAnimating ? 'translate-y-0' : '-translate-y-full'
          }`}
        >
          {/* Backdrop */}
          <div className="bg-black/20 backdrop-blur-sm">
            {/* Banner Content */}
            <Card className="border-b border-border shadow-lg rounded-none">
              <div className="px-4 py-3 max-w-md mx-auto">
                {/* Header with close button */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Home className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Install Organized Glitter
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Add to your home screen for quick access
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleTemporaryDismiss}
                    className="h-6 w-6 p-0 hover:bg-muted flex-shrink-0"
                    aria-label="Close install banner"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Installation Steps */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">1</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-foreground">Tap the</span>
                      <div className="inline-flex items-center px-2 py-1 bg-muted rounded">
                        <Share className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-foreground">share button</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">2</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-foreground">Select</span>
                      <div className="inline-flex items-center px-2 py-1 bg-muted rounded">
                        <Plus className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs ml-1 text-muted-foreground">Add to Home Screen</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDontShowAgain}
                    className="flex-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Don't show again
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleTemporaryDismiss}
                    className="px-4 text-xs font-medium"
                  >
                    Got it
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
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
              onClick={handleTemporaryDismiss}
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
