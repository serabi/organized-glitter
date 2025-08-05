/**
 * PWA installation prompt component with dismissible banner UI
 * Enhanced with better iOS Safari support and detailed installation instructions
 * @author @serabi
 * @created 2025-08-02
 * @updated 2025-01-04
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Share, Plus, Home, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuth } from '@/hooks/useAuth';
import { createLogger } from '@/utils/logger';
import { shouldShowIOSInstallPrompt, shouldShowMacOSInstallPrompt } from '@/utils/deviceDetection';

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

  // Use enhanced platform detection
  const shouldShowEnhancedIOSPrompt = shouldShowIOSInstallPrompt();
  const shouldShowMacOSPrompt = shouldShowMacOSInstallPrompt();

  // Show prompt with immediate animation - only for authenticated users
  useEffect(() => {
    // Show enhanced iOS/macOS prompt or standard prompt for other platforms
    const shouldShow = (canShowPrompt || shouldShowEnhancedIOSPrompt || shouldShowMacOSPrompt) && isAuthenticated && initialCheckComplete;
    
    if (shouldShow) {
      setIsVisible(true);
      setIsAnimating(true);
      logger.debug('PWA install prompt displayed', { 
        isIOSEnhanced: shouldShowEnhancedIOSPrompt,
        isMacOSPrompt: shouldShowMacOSPrompt,
        canShowPrompt 
      });
    } else if (!isAuthenticated && isVisible) {
      // Hide prompt if user logs out
      setIsAnimating(false);
      setIsVisible(false);
    }
  }, [canShowPrompt, shouldShowEnhancedIOSPrompt, shouldShowMacOSPrompt, isAuthenticated, initialCheckComplete, isVisible]);

  // Handle dismiss with animation
  const handleDismiss = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      dismissPrompt();
    }, 300); // Wait for animation to complete
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

  // Enhanced iOS Safari installation guide
  if (shouldShowEnhancedIOSPrompt) {
    return (
      <div className={`fixed bottom-20 left-4 right-4 z-50 ${className}`}>
        <Card
          className={`transform border bg-background/95 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out ${
            isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
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
                    onClick={handleDismiss}
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
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleDismiss}
                    className="px-4 text-xs font-medium"
                  >
                    Got it
                  </Button>
                </div>
        </Card>
      </div>
    );
  }

  // Enhanced macOS Safari installation guide
  if (shouldShowMacOSPrompt) {
    return (
      <div className={`fixed bottom-20 left-4 right-4 z-50 ${className}`}>
        <Card
          className={`transform border bg-background/95 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 ease-out ${
            isAnimating ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
          }`}
        >
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
                        Add to your Dock for quick access
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDismiss}
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
                      <span className="text-foreground">Click</span>
                      <div className="inline-flex items-center px-2 py-1 bg-muted rounded">
                        <File className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs ml-1 text-muted-foreground">File</span>
                      </div>
                      <span className="text-foreground">menu</span>
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
                        <span className="text-xs ml-1 text-muted-foreground">Add to Dock</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-sm mt-3 pt-2 border-t border-muted">
                    <div className="flex-shrink-0 w-6 h-6 bg-green-500/10 rounded-full flex items-center justify-center">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-muted-foreground text-xs">Or use</span>
                      <div className="inline-flex items-center px-2 py-1 bg-muted rounded">
                        <Share className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <span className="text-muted-foreground text-xs">→ Add to Dock</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleDismiss}
                    className="px-4 text-xs font-medium"
                  >
                    Got it
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
