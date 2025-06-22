import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { RootRoute } from '@/components/auth/RootRoute';
import { MetadataProvider } from '@/contexts/MetadataContext';
import { PageLoading } from '@/components/ui/page-loading';
import { usePostHogPageTracking } from '@/hooks/usePostHogPageTracking';

// Import critical pages directly (auth flow, landing pages)
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import NotFound from '@/pages/NotFound';
import ForgotPassword from '@/pages/ForgotPassword.tsx';
import ResetPassword from '@/pages/ResetPassword.tsx';
import ConfirmPasswordReset from '@/pages/ConfirmPasswordReset.tsx';
import VerifyEmail from '@/pages/VerifyEmail';
import EmailConfirmation from '@/pages/EmailConfirmation';

import About from '@/pages/About';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';

// Enhanced chunk loading with retry logic
const createLazyComponent = (importFn: () => Promise<{ default: React.ComponentType<unknown> }>, componentName: string) => {
  return lazy(() =>
    importFn().catch((error) => {
      console.error(`Failed to load ${componentName} page chunk:`, error);
      
      // Return a more helpful error component with retry functionality
      return {
        default: () => (
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="mb-4 text-2xl font-bold">Failed to load page</h1>
            <p className="mb-6 text-muted-foreground">
              There was an error loading the {componentName} page. This may be due to a network issue or a recent deployment.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        ),
      };
    })
  );
};

// Lazy load password and email change pages
const ChangePassword = lazy(() => import('@/pages/ChangePassword.tsx'));
const ChangeEmail = lazy(() => import('@/pages/ChangeEmail'));
const ConfirmEmailChange = lazy(() => import('@/pages/ConfirmEmailChange'));

// Lazy load heavy pages for better initial bundle size with enhanced error handling
const Overview = createLazyComponent(() => import('@/pages/Overview'), 'Overview');
const Dashboard = createLazyComponent(() => import('@/pages/Dashboard'), 'Dashboard');
const Profile = createLazyComponent(() => import('@/pages/Profile'), 'Profile');
const AdvancedView = createLazyComponent(() => import('@/pages/AdvancedView'), 'AdvancedView');
const AdvancedEdit = createLazyComponent(() => import('@/pages/AdvancedEdit'), 'AdvancedEdit');

// Lazy load project-related pages with enhanced error handling
const NewProject = createLazyComponent(() => import('@/pages/NewProject'), 'NewProject');
const ProjectDetail = createLazyComponent(() => import('@/pages/ProjectDetail'), 'ProjectDetail');
const EditProject = createLazyComponent(() => import('@/pages/EditProject'), 'EditProject');

// Lazy load data management pages
const CompanyList = lazy(() => import('@/pages/CompanyList'));
const ArtistList = lazy(() => import('@/pages/ArtistList'));
const TagList = lazy(() => import('@/pages/TagList'));
const Import = lazy(() => import('@/pages/Import'));

// Lazy load utility pages
const DeleteAccount = lazy(() => import('@/pages/DeleteAccount'));
const SupportSuccess = lazy(() => import('@/pages/SupportSuccess'));


/**
 * Main application routing configuration
 * Handles all route definitions with proper authentication wrapping
 */
export const AppRoutes: React.FC = () => {
  // Track pageviews with PostHog
  usePostHogPageTracking();

  return (
    <Routes>
      {/* Root route with authentication redirect logic */}
      <Route path="/" element={<RootRoute />} />

      {/* Public authentication routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/confirm-password-reset/:token" element={<ConfirmPasswordReset />} />
      <Route path="/auth/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/_" element={<ConfirmPasswordReset />} />
      <Route path="/email-confirmation" element={<EmailConfirmation />} />

      {/* Protected application routes */}
      <Route
        path="/overview"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <Overview />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <Dashboard />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Project management routes */}
      <Route
        path="/projects/new"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <MetadataProvider>
                <NewProject />
              </MetadataProvider>
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:id"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <ProjectDetail />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/projects/:id/edit"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <EditProject />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* User management routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <Profile />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <ChangePassword />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/change-email"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <ChangeEmail />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/auth/confirm-email-change/:token"
        element={
          <Suspense fallback={<PageLoading />}>
            <ConfirmEmailChange />
          </Suspense>
        }
      />

      <Route
        path="/delete-account"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <DeleteAccount />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Data management routes */}
      <Route
        path="/companies"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <CompanyList />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/artists"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <ArtistList />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/tags"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <TagList />
            </Suspense>
          </ProtectedRoute>
        }
      />

      <Route
        path="/import"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <Import />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* Advanced view routes with metadata provider */}
      <Route
        path="/advanced"
        element={
          <ProtectedRoute>
            <MetadataProvider>
              <Suspense fallback={<PageLoading />}>
                <AdvancedView />
              </Suspense>
            </MetadataProvider>
          </ProtectedRoute>
        }
      />

      <Route
        path="/advanced-edit"
        element={
          <ProtectedRoute>
            <MetadataProvider>
              <Suspense fallback={<PageLoading />}>
                <AdvancedEdit />
              </Suspense>
            </MetadataProvider>
          </ProtectedRoute>
        }
      />

      {/* Support routes */}
      <Route
        path="/support/success"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageLoading />}>
              <SupportSuccess />
            </Suspense>
          </ProtectedRoute>
        }
      />


      {/* Public information routes */}
      <Route path="/about" element={<About />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* 404 catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};
