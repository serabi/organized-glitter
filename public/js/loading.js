// Elements
const loadingEl = document.getElementById('app-loading');
const errorEl = document.getElementById('app-error');
const errorDetailsEl = document.getElementById('error-details');
const retryButton = document.getElementById('retry-button');
const slowLoadWarning = document.getElementById('slow-load-warning');

// Global state
let isAppLoaded = false;
let hasError = false;

// Show slow load warning after 10 seconds
const slowLoadTimeout = setTimeout(() => {
  if (
    !isAppLoaded &&
    !hasError &&
    loadingEl &&
    getComputedStyle(loadingEl).display !== 'none' &&
    parseFloat(getComputedStyle(loadingEl).opacity) > 0
  ) {
    if (slowLoadWarning) {
      slowLoadWarning.style.display = 'block';
      console.log('Slow load warning displayed');
    }
  }
}, 10000);

// Handle retry button click
if (retryButton) {
  retryButton.addEventListener('click', () => {
    console.log('Retry button clicked');
    if (errorEl) errorEl.style.display = 'none';
    if (loadingEl) {
      loadingEl.style.opacity = '1';
      loadingEl.style.display = 'flex';
    }
    hasError = false;
    isAppLoaded = false;
    window.location.reload();
  });
}

// Show error with better error handling
const showError = errorMessage => {
  if (hasError) return; // Prevent multiple error displays

  hasError = true;
  clearTimeout(slowLoadTimeout);
  console.error('Showing error:', errorMessage);

  if (loadingEl) {
    loadingEl.style.opacity = '0';
  }

  setTimeout(() => {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'flex';
    if (errorDetailsEl) {
      errorDetailsEl.textContent = errorMessage || 'An unknown error occurred';
    }
  }, 300);
};

// Global error handler
window.addEventListener('error', function (event) {
  const errorMessage = event.error
    ? event.error.stack || event.error.message || 'Unknown error'
    : `Error: ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;

  console.error('Global error:', event.error || event.message);
  showError(errorMessage);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', function (event) {
  const errorMessage = event.reason
    ? event.reason.stack || event.reason.message || 'Unknown promise rejection'
    : 'An unknown error occurred';

  console.error('Unhandled rejection:', event.reason);
  showError(errorMessage);
});

// Hide loading when app starts - improved with better checks
window.addEventListener('app-loaded', function () {
  if (isAppLoaded || hasError) return; // Prevent multiple calls

  isAppLoaded = true;
  clearTimeout(slowLoadTimeout);
  console.log('App loaded event received, hiding loading screen');

  if (loadingEl) {
    loadingEl.style.opacity = '0';
  }

  setTimeout(() => {
    if (loadingEl) {
      loadingEl.style.display = 'none';
    }
    // Ensure React content is visible
    const root = document.getElementById('root');
    if (root) {
      root.style.opacity = '1';
    }
    console.log('Loading screen hidden successfully');
  }, 200);
});

// Auto-hide loading after 30 seconds as failsafe
setTimeout(() => {
  if (!isAppLoaded && !hasError) {
    console.warn('App failed to load within 30 seconds, hiding loading screen as failsafe');
    window.dispatchEvent(new CustomEvent('app-loaded'));
  }
}, 30000);

// Debug logging
console.log('Loading script initialized', {
  loadingEl: !!loadingEl,
  errorEl: !!errorEl,
  retryButton: !!retryButton,
  slowLoadWarning: !!slowLoadWarning,
});
