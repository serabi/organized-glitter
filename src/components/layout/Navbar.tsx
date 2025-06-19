import { useState, useCallback, memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, Home, LayoutDashboard, Settings, LogOut, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { showUserReportDialog } from '@/components/FeedbackDialogProvider';

interface NavbarProps {
  isAuthenticated?: boolean;
}

const Navbar = memo(({ isAuthenticated = false }: NavbarProps) => {
  // Get auth state from context
  const { user, signOut: authSignOut, isLoading } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const handleFeedback = useCallback(() => {
    showUserReportDialog({
      title: 'Share Your Feedback',
      subtitle: "We'd love to hear what you think about Organized Glitter!",
    });
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      if (isSigningOut) return;

      setIsSigningOut(true);

      // addBreadcrumb removed

      if (authSignOut) {
        const result = await authSignOut();

        if (result.success) {
          toast({
            title: 'Logged out',
            description: 'You have been successfully logged out.',
          });

          // Navigate to login page using React Router
          navigate('/login', { replace: true });
        } else {
          toast({
            title: 'Logout Failed',
            description: result.error?.message || 'An unexpected error occurred during logout.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Logout Failed',
          description: 'Logout function is not available. Please try again later.',
          variant: 'destructive',
        });
      }

      // addBreadcrumb removed
    } catch (error) {
      console.error('Logout error:', error); // Keep general error logging
      toast({
        title: 'Logout Failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // Reset signing out state after a delay to prevent rapid re-clicks
      setTimeout(() => {
        setIsSigningOut(false);
      }, 1000);
    }
  }, [isSigningOut, authSignOut, toast, navigate]);

  // Use the user from context if available, otherwise use the prop
  const isLoggedIn = !!user || isAuthenticated;

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border bg-gradient-to-r from-primary to-mauve-400 text-white shadow-sm backdrop-blur-sm dark:bg-gradient-to-r dark:from-primary dark:to-mauve-600 dark:text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex flex-shrink-0 items-center">
              <span className="bg-gradient-to-r from-white to-peach-100 bg-clip-text text-xl font-bold text-transparent dark:from-white dark:to-flamingo-200">
                Organized Glitter
              </span>
            </Link>
          </div>

          {/* Navigation Menu */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 hover:text-peach-100 dark:text-flamingo-100 dark:hover:text-white"
                  >
                    <Menu className="mr-2 h-4 w-4" />
                    Menu
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      to="/overview"
                      className="flex items-center"
                      aria-current={location.pathname === '/overview' ? 'page' : undefined}
                    >
                      <Home className="mr-2 h-4 w-4" />
                      Overview
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/dashboard"
                      className="flex items-center"
                      aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                    >
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      to="/profile"
                      className="flex items-center"
                      aria-current={location.pathname === '/profile' ? 'page' : undefined}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleFeedback}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Send Feedback
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div
                    className={isSigningOut || isLoading ? 'pointer-events-none' : ''}
                    {...(isSigningOut || isLoading ? { inert: true } : {})}
                  >
                    <DropdownMenuItem
                      onClick={handleLogout}
                      disabled={isSigningOut || isLoading}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {isSigningOut ? 'Logging out...' : 'Logout'}
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login">
                  <Button
                    variant="outline"
                    className="border-input text-primary hover:bg-accent hover:text-primary-foreground dark:border-white/20 dark:text-white dark:hover:bg-white/10"
                  >
                    Login
                  </Button>
                </Link>
                <Link to="/register">
                  <Button
                    variant="secondary"
                    className="font-medium text-primary hover:bg-flamingo-100"
                  >
                    Register
                  </Button>
                </Link>
              </div>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
});

Navbar.displayName = 'Navbar';

export default Navbar;
