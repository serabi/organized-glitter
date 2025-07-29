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

import { createRoot } from 'react-dom/client';
import { StrictMode, lazy, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { InitializationCheck } from './components/InitializationCheck';
import { queryClient } from './lib/queryClient';
import { secureLogger } from './utils/secureLogger';
import { initializeUser } from './utils/userInitialization';
import {
  handleFatalError,
  dispatchAppLoadedEvent,
  setupGlobalErrorHandlers,
} from './utils/fatalErrorHandler';
import { initializePerformanceMonitoring } from './utils/performanceMonitoring';
import { enableDiagnosticConsoleAccess } from './utils/overviewDiagnostics';
import { initializeChunkLoadingRetry } from './utils/chunkLoadingRetry';
import { initializeResourceErrorTracking } from './utils/resourceErrorTracking';
import App from './App';
import './index.css';

/**
 * Main application bootstrap and initialization
 */

// Initialize application services
const initializeApp = (): void => {
  initializeUser();
  setupGlobalErrorHandlers();
  initializePerformanceMonitoring();
  initializeChunkLoadingRetry();
  initializeResourceErrorTracking();

  // Enable overview performance diagnostics in development
  if (import.meta.env.DEV) {
    enableDiagnosticConsoleAccess();
  }
};

// Get root element with error handling
const getRootElement = (): HTMLElement => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Failed to find the root element');
  }
  return rootElement;
};

// Render the React application
const renderApp = async (): Promise<void> => {
  try {
    secureLogger.info('🚀 Starting Organized Glitter application...');

    const rootElement = getRootElement();
    const root = createRoot(rootElement);

    // Conditionally define ReactQueryDevtools only in development
    let DevTools: React.ComponentType<{ initialIsOpen: boolean }> | null = null;
    if (import.meta.env.DEV) {
      const ReactQueryDevtools = lazy(() =>
        import('@tanstack/react-query-devtools').then(module => ({
          default: module.ReactQueryDevtools,
        }))
      );
      DevTools = ReactQueryDevtools;
    }

    // Render React app
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <InitializationCheck>
            <App />
          </InitializationCheck>
          {import.meta.env.DEV && DevTools && (
            <Suspense fallback={null}>
              <DevTools initialIsOpen={false} />
            </Suspense>
          )}
        </QueryClientProvider>
      </StrictMode>
    );

    secureLogger.info('✅ React app rendered successfully');

    // Dispatch app loaded after a short delay to ensure DOM is updated
    requestAnimationFrame(() => {
      setTimeout(() => {
        secureLogger.info('📱 Dispatching app-loaded event from main.tsx');
        dispatchAppLoadedEvent();
      }, 150);
    });
  } catch (error) {
    handleFatalError(error instanceof Error ? error : new Error(String(error)), 'React Render');
  }
};

// Bootstrap the application
const bootstrap = async (): Promise<void> => {
  initializeApp();
  await renderApp();
};

// Start the application
bootstrap().catch(error => {
  handleFatalError(
    error instanceof Error ? error : new Error(String(error)),
    'Application Bootstrap'
  );
});
