import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all dependencies
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    authStore: {
      isValid: true,
      model: {
        id: 'lf87xt8u569dei6',
        email: 'test@example.com',
        username: 'testuser',
      },
    },
  },
}));

vi.mock('@/hooks/mutations/useCreateProject');
vi.mock('@/hooks/useUserMetadata');
vi.mock('@/hooks/mutations/useCreateCompany');
vi.mock('@/hooks/mutations/useCreateArtist');
vi.mock('@/contexts/MetadataContext', () => ({
  useMetadata: vi.fn(),
}));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));
vi.mock('@/components/projects/ProjectForm', () => ({
  default: vi.fn(),
}));
vi.mock('@/components/layout/MainLayout', () => ({
  default: vi.fn(),
}));
vi.mock('@/components/projects/NewProjectHeader', () => ({
  default: vi.fn(),
}));
vi.mock('lucide-react', () => ({
  Loader2: vi.fn(),
  AlertTriangle: vi.fn(),
}));
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

// Import everything after mocks
import NewProject from '../NewProject';
import { useCreateProject } from '@/hooks/mutations/useCreateProject';
import { useUserMetadata } from '@/hooks/useUserMetadata';
import { useCreateCompany } from '@/hooks/mutations/useCreateCompany';
import { useCreateArtist } from '@/hooks/mutations/useCreateArtist';
import { useMetadata } from '@/contexts/MetadataContext';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ProjectForm from '@/components/projects/ProjectForm';
import MainLayout from '@/components/layout/MainLayout';
import NewProjectHeader from '@/components/projects/NewProjectHeader';
import { Loader2, AlertTriangle } from 'lucide-react';

const mockUseCreateProject = useCreateProject as Mock;
const mockUseUserMetadata = useUserMetadata as Mock;
const mockUseCreateCompany = useCreateCompany as Mock;
const mockUseCreateArtist = useCreateArtist as Mock;
const mockUseMetadata = useMetadata as Mock;
const mockUseAuth = useAuth as Mock;
const mockUseNavigate = useNavigate as Mock;
const mockProjectForm = ProjectForm as unknown as Mock;
const mockMainLayout = MainLayout as unknown as Mock;
const mockNewProjectHeader = NewProjectHeader as Mock;
const mockLoader2 = Loader2 as unknown as Mock;
const mockAlertTriangle = AlertTriangle as unknown as Mock;

describe('NewProject', () => {
  let mockNavigate: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNavigate = vi.fn();
    mockUseNavigate.mockReturnValue(mockNavigate);

    // Setup default mocks
    const mockMutateAsync = vi.fn();
    mockUseCreateProject.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    mockUseCreateCompany.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseCreateArtist.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseUserMetadata.mockReturnValue({
      companies: ['Company A', 'Company B'],
      artists: ['Artist 1', 'Artist 2'],
      authChecked: true,
      loading: false,
      refreshMetadata: vi.fn(),
    });

    mockUseMetadata.mockReturnValue({
      companies: [
        { id: '1', name: 'Company A', website_url: '', user: 'user1', created: '', updated: '' },
        { id: '2', name: 'Company B', website_url: '', user: 'user1', created: '', updated: '' },
      ],
      artists: [
        { id: '1', name: 'Artist 1', user: 'user1', created: '', updated: '' },
        { id: '2', name: 'Artist 2', user: 'user1', created: '', updated: '' },
      ],
      tags: [],
      companyNames: ['Company A', 'Company B'],
      artistNames: ['Artist 1', 'Artist 2'],
      isLoading: {
        companies: false,
        artists: false,
        tags: false,
      },
      error: {
        companies: null,
        artists: null,
        tags: null,
      },
      refresh: vi.fn(),
      refreshCompanies: vi.fn(),
      refreshArtists: vi.fn(),
      refreshTags: vi.fn(),
    });

    mockUseAuth.mockReturnValue({
      user: {
        id: 'lf87xt8u569dei6',
        email: 'test@example.com',
        username: 'testuser',
      },
      isLoading: false,
      logout: vi.fn(),
    });

    // Mock components
    mockProjectForm.mockImplementation(
      ({ onSubmit, initialData, isLoading, companies, artists }) => (
        <div data-testid="project-form">
          <div data-testid="initial-data">{JSON.stringify(initialData)}</div>
          <div data-testid="companies">{JSON.stringify(companies)}</div>
          <div data-testid="artists">{JSON.stringify(artists)}</div>
          <div data-testid="loading">{isLoading ? 'true' : 'false'}</div>
          <button
            data-testid="submit-form"
            onClick={() =>
              onSubmit({
                title: 'Test Project',
                userId: 'lf87xt8u569dei6',
                status: 'wishlist',
              })
            }
          >
            Submit
          </button>
        </div>
      )
    );

    mockMainLayout.mockImplementation(
      ({ children, isAuthenticated }: { children: React.ReactNode; isAuthenticated?: boolean }) => (
        <div data-testid="main-layout" data-authenticated={isAuthenticated}>
          {children}
        </div>
      )
    );

    mockNewProjectHeader.mockImplementation(() => (
      <div data-testid="new-project-header">New Project Header</div>
    ));

    mockLoader2.mockImplementation(({ className }: { className?: string }) => (
      <div data-testid="loader2" className={className}>
        Loading...
      </div>
    ));

    mockAlertTriangle.mockImplementation(({ className }: { className?: string }) => (
      <div data-testid="alert-triangle" className={className}>
        Alert
      </div>
    ));
  });

  const renderNewProject = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <NewProject />
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  describe('Form Rendering', () => {
    it('should render the new project form', async () => {
      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });
    });

    it('should pass correct initial data to ProjectForm', async () => {
      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const initialDataElement = screen.getByTestId('initial-data');
      const initialData = JSON.parse(initialDataElement.textContent!);

      expect(initialData).toEqual({
        userId: 'lf87xt8u569dei6',
        status: 'wishlist',
      });
    });

    it('should pass companies and artists to ProjectForm', async () => {
      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const companiesElement = screen.getByTestId('companies');
      const artistsElement = screen.getByTestId('artists');

      expect(JSON.parse(companiesElement.textContent!)).toEqual(['Company A', 'Company B']);
      expect(JSON.parse(artistsElement.textContent!)).toEqual(['Artist 1', 'Artist 2']);
    });
  });

  describe('Project Creation', () => {
    it('should call createProject when form is submitted', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        id: 'new-project-id',
        title: 'Test Project',
      });

      mockUseCreateProject.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-form');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Test Project',
            user: 'lf87xt8u569dei6',
            status: 'wishlist',
          })
        );
      });
    });

    it('should navigate after successful project creation', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        id: 'new-project-id',
        title: 'Test Project',
      });

      mockUseCreateProject.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-form');
      fireEvent.click(submitButton);

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/projects/new-project-id');
        },
        { timeout: 3000 }
      );
    });
  });

  describe('Component Integration', () => {
    it('should render all child components correctly', async () => {
      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
        expect(screen.getByTestId('new-project-header')).toBeInTheDocument();
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });
    });

    it('should pass correct isAuthenticated prop to MainLayout', async () => {
      renderNewProject();

      await waitFor(() => {
        const mainLayout = screen.getByTestId('main-layout');
        expect(mainLayout).toHaveAttribute('data-authenticated', 'true');
      });
    });
  });
});
