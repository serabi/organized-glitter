import React, { memo } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNavigation from './BottomNavigation';
import { useAuth } from '@/hooks/useAuth';
import { useMobileDevice } from '@/hooks/use-mobile';
import LoadingState from '@/components/projects/LoadingState';

interface MainLayoutProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
  showLoader?: boolean;
  hideNav?: boolean;
  hideFooter?: boolean;
}

const MainLayout = memo(
  ({
    children,
    isAuthenticated = false,
    showLoader = false,
    hideNav = false,
    hideFooter = false,
  }: MainLayoutProps) => {
    const { user, isLoading } = useAuth();
    const { isMobile, isTablet } = useMobileDevice();

    // Use the user from context if available, otherwise use the prop
    const isLoggedIn = !!user || isAuthenticated;

    // Determine if bottom navigation should be shown (authenticated users on mobile/tablet)
    const showBottomNav = isLoggedIn && (isMobile || isTablet);

    // Show loading state if auth is loading and the showLoader prop is true
    if (isLoading && showLoader) {
      return (
        <div className="flex min-h-screen flex-col">
          {!hideNav && <Navbar isAuthenticated={false} />}
          <main className="flex-grow">
            <LoadingState />
          </main>
          {!hideFooter && <Footer />}
          {showBottomNav && <BottomNavigation />}
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col">
        {!hideNav && <Navbar isAuthenticated={isLoggedIn} />}
        <main className={`flex-grow ${showBottomNav ? 'pb-16' : ''}`}>{children}</main>
        {!hideFooter && <Footer />}
        {showBottomNav && <BottomNavigation />}
      </div>
    );
  }
);

MainLayout.displayName = 'MainLayout';

export default MainLayout;
