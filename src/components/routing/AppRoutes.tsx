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

// Lazy load password and email change pages
const ChangePassword = lazy(() => import('@/pages/ChangePassword.tsx'));
const ChangeEmail = lazy(() => import('@/pages/ChangeEmail'));
const ConfirmEmailChange = lazy(() => import('@/pages/ConfirmEmailChange'));

// Lazy load heavy pages for better initial bundle size
const Overview = lazy(() =>
  import('@/pages/Overview').catch(() => {
    console.error('Failed to load Overview page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);
const Dashboard = lazy(() =>
  import('@/pages/Dashboard').catch(() => {
    console.error('Failed to load Dashboard page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);
const Profile = lazy(() =>
  import('@/pages/Profile').catch(() => {
    console.error('Failed to load Profile page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);
const AdvancedView = lazy(() =>
  import('@/pages/AdvancedView').catch(() => {
    console.error('Failed to load AdvancedView page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);
const AdvancedEdit = lazy(() =>
  import('@/pages/AdvancedEdit').catch(() => {
    console.error('Failed to load AdvancedEdit page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);

// Lazy load project-related pages
const NewProject = lazy(() =>
  import('@/pages/NewProject').catch(() => {
    console.error('Failed to load NewProject page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);
const ProjectDetail = lazy(() =>
  import('@/pages/ProjectDetail').catch(() => {
    console.error('Failed to load ProjectDetail page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);
const EditProject = lazy(() =>
  import('@/pages/EditProject').catch(() => {
    console.error('Failed to load EditProject page chunk');
    return { default: () => <div>Error loading page. Please refresh.</div> };
  })
);

// Lazy load data management pages
const CompanyList = lazy(() => import('@/pages/CompanyList'));
const ArtistList = lazy(() => import('@/pages/ArtistList'));
const TagList = lazy(() => import('@/pages/TagList'));
const Import = lazy(() => import('@/pages/Import'));

// Lazy load utility pages
const DeleteAccount = lazy(() => import('@/pages/DeleteAccount'));
const SupportSuccess = lazy(() => import('@/pages/SupportSuccess'));

// Debug pages (temporary)
const DebugMobileInput = lazy(() => import('@/pages/DebugMobileInput'));

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
              <NewProject />
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

      {/* Debug routes (temporary for mobile testing) */}
      <Route
        path="/debug-mobile-input"
        element={
          <Suspense fallback={<PageLoading />}>
            <DebugMobileInput />
          </Suspense>
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
