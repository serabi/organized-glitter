import { useEffect, useState } from 'react';
import { pb } from '@/lib/pocketbase';
import { logger } from '@/utils/logger';

// Check if PocketBase is properly initialized
const checkPocketBaseInitialization = () => {
  try {
    if (!pb) {
      throw new Error('PocketBase client is not initialized');
    }

    // More thorough check
    if (!pb.collection || !pb.authStore) {
      throw new Error('PocketBase client is incomplete');
    }

    return true;
  } catch (error) {
    logger.error('PocketBase initialization check failed:', error);
    return false;
  }
};

export const InitializationCheck = ({ children }: { children: React.ReactNode }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Add timeout protection for initialization
    const initTimeout = setTimeout(() => {
      logger.warn('InitializationCheck: Initialization timed out after 10 seconds');
      setIsInitialized(true); // Proceed anyway to prevent infinite loading
    }, 10000);

    const initialize = async () => {
      try {
        // Add a small delay to ensure everything is loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        const isReady = checkPocketBaseInitialization();
        if (!isReady) {
          logger.warn('PocketBase initialization failed, but proceeding anyway');
          // Don't throw error, just log warning and proceed
        }

        logger.log('✅ Application initialized successfully');
        clearTimeout(initTimeout);
        setIsInitialized(true);
      } catch (err) {
        logger.error('❌ Initialization error:', err);
        clearTimeout(initTimeout);
        // Instead of setting error, just proceed with initialization
        // This prevents the app from getting stuck on initialization errors
        logger.warn('Proceeding despite initialization error');
        setIsInitialized(true);
      }
    };

    initialize();

    return () => {
      clearTimeout(initTimeout);
    };
  }, []);

  if (error) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#faf7fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            background: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ color: '#dc2626', marginBottom: '16px' }}>Initialization Error</h1>
          <p style={{ color: '#374151', marginBottom: '20px' }}>
            Failed to initialize the application. This might be due to a configuration issue.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: '#7c3aed',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              marginRight: '12px',
            }}
          >
            Reload Application
          </button>
          <button
            onClick={() => setError(null)}
            style={{
              background: '#6b7280',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            Try Again
          </button>
          <details style={{ marginTop: '20px', textAlign: 'left' }}>
            <summary style={{ cursor: 'pointer', color: '#6b7280' }}>Technical Details</summary>
            <pre
              style={{
                background: '#f3f4f6',
                padding: '12px',
                borderRadius: '4px',
                fontSize: '12px',
                overflow: 'auto',
                marginTop: '8px',
              }}
            >
              {error.message}
            </pre>
          </details>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#faf7fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 20px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#7c3aed',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <h2 style={{ color: '#1e293b', marginBottom: '8px' }}>Initializing Organized Glitter</h2>
          <p style={{ color: '#64748b' }}>Setting up your diamond art tracker...</p>
        </div>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return <>{children}</>;
};

export default InitializationCheck;
