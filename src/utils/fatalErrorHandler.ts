/**
 * Fatal error handler for application startup errors
 * Provides user-friendly error display when the app fails to load
 */

import { captureException } from './posthog';
import { logger } from './logger';

interface ErrorDisplayOptions {
  title?: string;
  description?: string;
  showTechnicalDetails?: boolean;
}

/**
 * Handle fatal errors by displaying a user-friendly error screen
 * Uses DOM manipulation to avoid any React dependencies
 */
export const handleFatalError = (
  error: Error,
  context: string,
  options: ErrorDisplayOptions = {}
): void => {
  logger.error(`❌ Fatal error in ${context}:`, error);

  // Capture exception in PostHog for analytics
  captureException(error, {
    type: 'fatal_error',
    context,
  });

  // Dispatch app loaded to hide loading screen even on error
  dispatchAppLoadedEvent();

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    logger.error('Root element not found, cannot display error UI');
    return;
  }

  // Clear existing content
  rootElement.innerHTML = '';

  // Create error display
  const errorContainer = createErrorContainer();
  const errorCard = createErrorCard();

  // Add components to card
  errorCard.appendChild(createErrorIcon());
  errorCard.appendChild(createErrorTitle(options.title));
  errorCard.appendChild(createErrorDescription(options.description));

  const buttonContainer = createButtonContainer();
  buttonContainer.appendChild(createReloadButton());
  buttonContainer.appendChild(createContactButton());
  errorCard.appendChild(buttonContainer);

  if (options.showTechnicalDetails !== false) {
    errorCard.appendChild(createTechnicalDetails(error, context));
  }

  errorContainer.appendChild(errorCard);
  rootElement.appendChild(errorContainer);
};

/**
 * Dispatch app-loaded event to hide loading screens
 */
export const dispatchAppLoadedEvent = (): void => {
  const event = new CustomEvent('app-loaded');
  window.dispatchEvent(event);
  logger.log('✅ App loaded event dispatched');
};

/**
 * Set up global error handlers for unhandled errors and promise rejections
 */
export const setupGlobalErrorHandlers = (): void => {
  window.addEventListener('error', event => {
    const originalError =
      event.error ||
      new Error(`${event.message} at ${event.filename}:${event.lineno}:${event.colno}`);

    captureException(originalError, {
      type: 'global_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    handleFatalError(originalError, 'Global Error');
  });

  window.addEventListener('unhandledrejection', event => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

    captureException(error, {
      type: 'unhandled_promise_rejection',
      reason: String(event.reason),
    });

    handleFatalError(error, 'Unhandled Promise Rejection');
  });
};

// Private helper functions

const createErrorContainer = (): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(135deg, #faf7fe 0%, #f3f4f6 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
    z-index: 10000;
  `;
  return container;
};

const createErrorCard = (): HTMLDivElement => {
  const card = document.createElement('div');
  card.style.cssText = `
    max-width: 500px;
    background: white;
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    text-align: center;
    border: 1px solid rgba(0,0,0,0.1);
  `;
  return card;
};

const createErrorIcon = (): HTMLDivElement => {
  const iconContainer = document.createElement('div');
  iconContainer.style.cssText = `
    width: 64px;
    height: 64px;
    background: #fee2e2;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
  `;
  iconContainer.innerHTML = `
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 8v4"/>
      <path d="M12 16h.01"/>
    </svg>
  `;
  return iconContainer;
};

const createErrorTitle = (customTitle?: string): HTMLHeadingElement => {
  const title = document.createElement('h1');
  title.style.cssText = `
    color: #1f2937;
    margin: 0 0 16px 0;
    font-size: 24px;
    font-weight: 600;
  `;
  title.textContent = customTitle || 'Unable to Load Application';
  return title;
};

const createErrorDescription = (customDescription?: string): HTMLParagraphElement => {
  const description = document.createElement('p');
  description.style.cssText = `
    color: #6b7280;
    margin: 0 0 24px 0;
    font-size: 16px;
    line-height: 1.5;
  `;
  description.textContent =
    customDescription ||
    'Organized Glitter encountered an error while starting up. This might be due to a temporary issue or a problem with your internet connection.';
  return description;
};

const createButtonContainer = (): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;';
  return container;
};

const createReloadButton = (): HTMLButtonElement => {
  const button = document.createElement('button');
  button.style.cssText = `
    background: #7c3aed;
    color: white;
    border: none;
    padding: 12px 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.2s;
  `;
  button.textContent = 'Reload Page';
  button.onclick = () => window.location.reload();
  button.onmouseover = () => (button.style.background = '#6d28d9');
  button.onmouseout = () => (button.style.background = '#7c3aed');
  return button;
};

const createContactButton = (): HTMLButtonElement => {
  const button = document.createElement('button');
  button.style.cssText = `
    background: transparent;
    color: #6b7280;
    border: 1px solid #d1d5db;
    padding: 12px 24px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
    font-weight: 500;
    transition: all 0.2s;
  `;
  button.textContent = 'Contact Support';
  button.onclick = () =>
    window.open('mailto:contact@organizedglitter.app?subject=App Loading Error', '_blank');
  button.onmouseover = () => (button.style.background = '#f9fafb');
  button.onmouseout = () => (button.style.background = 'transparent');
  return button;
};

const createTechnicalDetails = (error: Error, context: string): HTMLDetailsElement => {
  const details = document.createElement('details');
  details.style.cssText = 'margin-top: 24px; text-align: left;';

  const summary = document.createElement('summary');
  summary.style.cssText = `
    cursor: pointer;
    color: #9ca3af;
    font-size: 14px;
    padding: 8px 0;
  `;
  summary.textContent = 'Show Technical Details';

  const techDetails = document.createElement('div');
  techDetails.style.cssText = `
    background: #f9fafb;
    padding: 16px;
    border-radius: 8px;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    color: #374151;
    margin-top: 8px;
    border: 1px solid #e5e7eb;
    white-space: pre-wrap;
    word-break: break-word;
  `;
  techDetails.textContent = `${context}: ${error.stack || error.message}`;

  details.appendChild(summary);
  details.appendChild(techDetails);
  return details;
};
