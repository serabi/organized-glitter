import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NotFound');

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error('404 Error: User attempted to access non-existent route:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      state: location.state,
      browserPathname: window.location.pathname,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 100),
    });
  }, [location.pathname, location.search, location.hash, location.state]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
