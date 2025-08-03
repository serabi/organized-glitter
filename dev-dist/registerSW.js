if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/dev-sw.js?dev-sw', { scope: '/', type: 'classic' })
    .then(registration => {
      // Service worker registered successfully
      if (process.env.NODE_ENV === 'development') {
        console.log('Service Worker registered successfully:', registration.scope);
      }
    })
    .catch(error => {
      // Classify and handle different types of registration errors
      let errorType = 'Unknown';
      let errorMessage = 'Service worker registration failed';

      if (error.name === 'SecurityError') {
        errorType = 'Security';
        errorMessage = 'Service worker registration blocked due to security restrictions';
      } else if (error.name === 'NetworkError' || error.message.includes('fetch')) {
        errorType = 'Network';
        errorMessage = 'Service worker registration failed due to network issues';
      } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
        errorType = 'SSL';
        errorMessage = 'Service worker registration failed due to SSL certificate issues';
      } else if (error.message.includes('scope')) {
        errorType = 'Scope';
        errorMessage = 'Service worker registration failed due to scope conflicts';
      }

      // Log error without exposing sensitive information
      console.error(`[SW Registration] ${errorType} Error: ${errorMessage}`);

      // Log additional context only in development
      if (process.env.NODE_ENV === 'development') {
        console.error('[SW Registration] Error details:', {
          type: error.name,
          message: error.message,
        });
      }
    });
}
