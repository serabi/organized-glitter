/**
 * Organized Glitter - Diamond Art Project Management
 * Copyright (C) 2025 Sarah Wolff
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useEffect } from 'react';
import { createLogger } from '@/utils/logger';
import { AppProviders } from '@/components/layout/AppProviders.tsx';
import { AppRoutes } from '@/components/routing/AppRoutes.tsx';
import { useAppInitialization } from '@/hooks/useAppInitialization.ts';
import { useOnlineStatus } from '@/hooks/useOnlineStatus.ts';
import { OfflinePage } from '@/components/OfflinePage.tsx';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt.tsx';

/**
 * Main App component
 * Handles application layout, initialization, and routing
 */
const App: React.FC = () => {
  // Initialize global services and error handlers
  useAppInitialization();

  // Track online/offline status
  const isOnline = useOnlineStatus();

  // Register PWA service worker for auto-updates
  useEffect(() => {
    // Register service worker for PWA functionality
    if ('serviceWorker' in navigator) {
      import('virtual:pwa-register')
        .then(({ registerSW }) => {
          registerSW({
            onOfflineReady() {
              // PWA is ready to work offline
              const pwaLogger = createLogger('PWA');
              pwaLogger.info('PWA is ready to work offline');
            },
          });
        })
        .catch(() => {
          // PWA registration failed - not critical, app will still work
          const pwaLogger = createLogger('PWA');
          pwaLogger.debug('PWA registration not available');
        });
    }
  }, []);

  // Handle retry connection attempt
  const handleRetry = () => {
    // The useOnlineStatus hook will automatically update when connection is restored
    // No action needed - just provide user feedback for the retry button
  };

  // Handle PocketBase password reset redirect
  useEffect(() => {
    // Check if we're on the PocketBase password reset URL format
    const hash = window.location.hash;
    if (hash && hash.includes('#/auth/confirm-password-reset/')) {
      // Extract the token from the hash
      const tokenMatch = hash.match(/#\/auth\/confirm-password-reset\/([^/]+)/);
      if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];
        // Redirect to our proper route with the token
        window.location.href = `/auth/confirm-password-reset/${token}`;
      }
    }
  }, []);

  return (
    <div
      className="mobile-app-container min-h-screen bg-background text-foreground"
      style={{
        width: '100%',
        overflow: 'auto',
        // Use modern CSS instead of deprecated webkit properties
        overscrollBehavior: 'none',
        touchAction: 'manipulation',
      }}
    >
      <AppProviders>
        <AppRoutes />
        {/* Show PWA install prompt when applicable */}
        <PWAInstallPrompt />
      </AppProviders>

      {/* Show offline page when user is offline */}
      {!isOnline && <OfflinePage onRetry={handleRetry} />}
    </div>
  );
};

export default App;
