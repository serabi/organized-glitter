import React, { memo } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuth } from '@/hooks/useAuth';
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

    // Use the user from context if available, otherwise use the prop
    const isLoggedIn = !!user || isAuthenticated;

    // Show loading state if auth is loading and the showLoader prop is true
    if (isLoading && showLoader) {
      return (
        <div className="flex min-h-screen flex-col">
          {!hideNav && <Navbar isAuthenticated={false} />}
          <main className="flex-grow">
            <LoadingState />
          </main>
          {!hideFooter && <Footer />}
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col">
        {!hideNav && <Navbar isAuthenticated={isLoggedIn} />}
        <main className="flex-grow">{children}</main>
        {!hideFooter && <Footer />}
      </div>
    );
  }
);

MainLayout.displayName = 'MainLayout';

export default MainLayout;
