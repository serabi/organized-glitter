/**
 * Bottom navigation bar component for mobile and tablet devices
 * @author @serabi
 * @created 2025-07-29
 */

import { memo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutDashboard, Shuffle, Settings } from 'lucide-react';
import { useMobileDevice } from '@/hooks/use-mobile';
import { createLogger } from '@/utils/logger';
import type { LucideIcon } from 'lucide-react';

interface NavigationItem {
  label: string;
  icon: LucideIcon;
  path: string;
}

const NAVIGATION_ITEMS: NavigationItem[] = [
  { label: 'Overview', icon: Home, path: '/overview' },
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Randomizer', icon: Shuffle, path: '/randomizer' },
  { label: 'Profile', icon: Settings, path: '/profile' },
];

const logger = createLogger('BottomNavigation');

const BottomNavigation = memo(() => {
  const location = useLocation();
  const { isMobile, isTablet } = useMobileDevice();

  // Only show on mobile and tablet devices (< 1024px)
  if (!isMobile && !isTablet) {
    return null;
  }

  const handleNavClick = (targetPath: string, linkName: string) => {
    logger.info(`🔗 Bottom navigation clicked: ${linkName}`, {
      from: location.pathname,
      to: targetPath,
      linkName,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <nav
      role="navigation"
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm"
    >
      <div className="flex h-16 items-center justify-around px-2">
        {NAVIGATION_ITEMS.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;

          return (
            <Link
              key={path}
              to={path}
              onClick={() => handleNavClick(path, label)}
              className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg p-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              } `}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Navigate to ${label}`}
            >
              <Icon size={24} className="mb-1" />
              <span className="text-xs font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with notches */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
});

BottomNavigation.displayName = 'BottomNavigation';

export default BottomNavigation;
