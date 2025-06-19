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
import { AppProviders } from '@/components/layout/AppProviders';
import { AppRoutes } from '@/components/routing/AppRoutes';
import { useAppInitialization } from '@/hooks/useAppInitialization';

/**
 * Main App component
 * Handles application layout, initialization, and routing
 */
const App: React.FC = () => {
  // Initialize global services and error handlers
  useAppInitialization();

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
      className="min-h-screen bg-background text-foreground"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </div>
  );
};

export default App;
