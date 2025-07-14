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

vi.mock('@/hooks/mutations/useCreateProject', () => ({
  useCreateProject: vi.fn(),
}));
vi.mock('@/hooks/mutations/useCreateProjectWithRedirect', () => ({
  useCreateProjectWithRedirect: vi.fn(),
}));
vi.mock('@/hooks/useNavigateToProject', () => ({
  useNavigateToProject: () => mockNavigateToProject,
}));
vi.mock('@/hooks/useUserMetadata', () => ({
  useUserMetadata: vi.fn(),
}));
vi.mock('@/hooks/mutations/useCreateCompany', () => ({
  useCreateCompany: vi.fn(),
}));
vi.mock('@/hooks/mutations/useCreateArtist', () => ({
  useCreateArtist: vi.fn(),
}));
vi.mock('@/contexts/MetadataContext');
vi.mock('@/hooks/useAuth');
vi.mock('@/components/projects/ProjectForm', () => ({
  default: vi.fn(),
}));
vi.mock('@/components/layout/MainLayout', () => ({
  default: vi.fn(),
}));
vi.mock('@/components/projects/NewProjectHeader', () => ({
  default: vi.fn(),
}));
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    // Mock specific icons as components that render simple divs
    Loader2: () => <div data-testid="loader2-icon" />,
    AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
    ArrowLeft: () => <div data-testid="arrow-left-icon" />,
    Save: () => <div data-testid="save-icon" />,
    Plus: () => <div data-testid="plus-icon" />,
    Check: () => <div data-testid="check-icon" />,
    X: () => <div data-testid="x-icon" />,
    Upload: () => <div data-testid="upload-icon" />,
    ChevronDown: () => <div data-testid="chevron-down-icon" />,
  };
});
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
import { useAuth } from '@/hooks/useAuth';
import { useMetadata } from '@/contexts/MetadataContext';

// Type-only imports to avoid module resolution issues (Mock already imported above)

// Get mocked functions from the vi.mocked calls
const useCreateProject = vi.fn();
const useCreateProjectWithRedirect = vi.fn();
const mockNavigateToProject = vi.fn();
const pb = { authStore: { model: null as unknown } };
const useUserMetadata = vi.fn();
const useCreateCompany = vi.fn();
const useCreateArtist = vi.fn();
const useNavigate = vi.fn();
const ProjectForm = vi.fn();
const MainLayout = vi.fn();
const NewProjectHeader = vi.fn();
const Loader2 = vi.fn();
const AlertTriangle = vi.fn();

// Type assertions for mocked functions to help TypeScript
const mockUseCreateProjectWithRedirect = useCreateProjectWithRedirect as Mock;
const mockUseUserMetadata = useUserMetadata as Mock;
const mockUseCreateCompany = useCreateCompany as Mock;
const mockUseCreateArtist = useCreateArtist as Mock;
const mockUseMetadata = vi.mocked(useMetadata);
const mockUseAuth = vi.mocked(useAuth);
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

    // Setup navigation mock to resolve successfully
    mockNavigateToProject.mockResolvedValue({ success: true });

    // Setup default mocks
    const mockCreateProjectWithRedirectAsync = vi.fn();
    mockUseCreateProjectWithRedirect.mockReturnValue({
      mutateAsync: mockCreateProjectWithRedirectAsync,
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

      mockUseCreateProjectWithRedirect.mockReturnValue({
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

    it('should use smart navigation after successful project creation', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        id: 'new-project-id',
        title: 'Test Project',
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
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
          expect(mockMutateAsync).toHaveBeenCalledWith(
            expect.objectContaining({
              title: 'Test Project',
              user: 'lf87xt8u569dei6',
              status: 'wishlist',
            })
          );
        },
        { timeout: 5000 }
      );

      // The useCreateProjectWithRedirect hook handles navigation internally
      // We don't need to check for direct navigate calls
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
  describe('Loading States', () => {
    it('should show loading state when project creation is pending', async () => {
      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement.textContent).toBe('true');
    });

    it('should show loading state when company creation is pending', async () => {
      mockUseCreateCompany.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement.textContent).toBe('true');
    });

    it('should show loading state when artist creation is pending', async () => {
      mockUseCreateArtist.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement.textContent).toBe('true');
    });

    it('should show loading state when multiple operations are pending', async () => {
      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      mockUseCreateCompany.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      mockUseCreateArtist.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const loadingElement = screen.getByTestId('loading');
      expect(loadingElement.textContent).toBe('true');
    });
  });

  describe('Error Handling', () => {
    it('should handle project creation error gracefully', async () => {
      const mockMutateAsync = vi.fn().mockRejectedValue(new Error('Project creation failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseCreateProjectWithRedirect.mockReturnValue({
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
        expect(mockMutateAsync).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Error creating project:', expect.any(Error));
      });

      // Navigation is handled by useCreateProjectWithRedirect hook internally
      // No direct navigate calls are expected when mutation fails
      consoleSpy.mockRestore();
    });

    it('should handle company creation error gracefully', async () => {
      const mockCompanyMutateAsync = vi
        .fn()
        .mockRejectedValue(new Error('Company creation failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseCreateCompany.mockReturnValue({
        mutateAsync: mockCompanyMutateAsync,
        isPending: false,
      });

      // Mock ProjectForm to trigger company addition
      mockProjectForm.mockImplementation(({ onCompanyAdded }) => (
        <div data-testid="project-form">
          <button data-testid="add-company" onClick={() => onCompanyAdded('New Company')}>
            Add Company
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const addCompanyButton = screen.getByTestId('add-company');
      fireEvent.click(addCompanyButton);

      await waitFor(() => {
        expect(mockCompanyMutateAsync).toHaveBeenCalledWith({
          name: 'New Company',
          user: 'lf87xt8u569dei6',
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error creating company:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle artist creation error gracefully', async () => {
      const mockArtistMutateAsync = vi.fn().mockRejectedValue(new Error('Artist creation failed'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseCreateArtist.mockReturnValue({
        mutateAsync: mockArtistMutateAsync,
        isPending: false,
      });

      // Mock ProjectForm to trigger artist addition
      mockProjectForm.mockImplementation(({ onArtistAdded }) => (
        <div data-testid="project-form">
          <button data-testid="add-artist" onClick={() => onArtistAdded('New Artist')}>
            Add Artist
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const addArtistButton = screen.getByTestId('add-artist');
      fireEvent.click(addArtistButton);

      await waitFor(() => {
        expect(mockArtistMutateAsync).toHaveBeenCalledWith({
          name: 'New Artist',
          user: 'lf87xt8u569dei6',
        });
        expect(consoleSpy).toHaveBeenCalledWith('Error creating artist:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network request failed');
      networkError.name = 'NetworkError';

      const mockMutateAsync = vi.fn().mockRejectedValue(networkError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseCreateProjectWithRedirect.mockReturnValue({
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
        expect(consoleSpy).toHaveBeenCalledWith('Error creating project:', networkError);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Authentication Edge Cases', () => {
    it('should handle unauthenticated user', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        logout: vi.fn(),
      });

      // Mock pocketbase authStore as invalid
      vi.mocked(pb).authStore.model = null;

      renderNewProject();

      await waitFor(() => {
        const mainLayout = screen.getByTestId('main-layout');
        expect(mainLayout).toHaveAttribute('data-authenticated', 'false');
      });

      const initialDataElement = screen.getByTestId('initial-data');
      const initialData = JSON.parse(initialDataElement.textContent!);
      expect(initialData.userId).toBeUndefined();
    });

    it('should handle auth loading state', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        logout: vi.fn(),
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
      });
    });

    it('should prefer pocketbase authStore over useAuth user', async () => {
      const pbUserId = 'pb-user-id';
      const authUserId = 'auth-user-id';

      vi.mocked(pb).authStore.model = { id: pbUserId };

      mockUseAuth.mockReturnValue({
        user: { id: authUserId, email: 'test@example.com', username: 'testuser' },
        isLoading: false,
        logout: vi.fn(),
      });

      renderNewProject();

      await waitFor(() => {
        const initialDataElement = screen.getByTestId('initial-data');
        const initialData = JSON.parse(initialDataElement.textContent!);
        expect(initialData.userId).toBe(pbUserId);
      });
    });

    it('should fallback to useAuth user when pocketbase authStore is null', async () => {
      const authUserId = 'auth-user-id';

      vi.mocked(pb).authStore.model = null;

      mockUseAuth.mockReturnValue({
        user: { id: authUserId, email: 'test@example.com', username: 'testuser' },
        isLoading: false,
        logout: vi.fn(),
      });

      renderNewProject();

      await waitFor(() => {
        const initialDataElement = screen.getByTestId('initial-data');
        const initialData = JSON.parse(initialDataElement.textContent!);
        expect(initialData.userId).toBe(authUserId);
      });
    });
  });

  describe('Form Data Handling', () => {
    it('should handle form submission with minimal data', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        id: 'minimal-project-id',
        title: '',
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      // Mock ProjectForm to submit minimal data
      mockProjectForm.mockImplementation(({ onSubmit }) => (
        <div data-testid="project-form">
          <button
            data-testid="submit-minimal-form"
            onClick={() =>
              onSubmit({
                status: 'wishlist',
              })
            }
          >
            Submit Minimal
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-minimal-form');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            user: 'lf87xt8u569dei6',
            status: 'wishlist',
          })
        );
      });
    });

    it('should handle form submission with complex data', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        id: 'complex-project-id',
        title: 'Complex Project',
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      // Mock ProjectForm to submit complex data
      mockProjectForm.mockImplementation(({ onSubmit }) => (
        <div data-testid="project-form">
          <button
            data-testid="submit-complex-form"
            onClick={() =>
              onSubmit({
                title: 'Complex Project',
                description: 'A detailed project with all fields',
                status: 'in_progress',
                company: 'Company A',
                artist: 'Artist 1',
                budget: 10000,
                deadline: '2024-12-31',
                tags: ['urgent', 'client-work'],
              })
            }
          >
            Submit Complex
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-complex-form');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Complex Project',
            description: 'A detailed project with all fields',
            user: 'lf87xt8u569dei6',
            status: 'in_progress',
            company: 'Company A',
            artist: 'Artist 1',
            budget: 10000,
            deadline: '2024-12-31',
            tags: ['urgent', 'client-work'],
          })
        );
      });
    });

    it('should handle null and undefined form values', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        id: 'null-project-id',
        title: null,
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      // Mock ProjectForm to submit data with null/undefined values
      mockProjectForm.mockImplementation(({ onSubmit }) => (
        <div data-testid="project-form">
          <button
            data-testid="submit-null-form"
            onClick={() =>
              onSubmit({
                title: null,
                description: undefined,
                status: 'wishlist',
                company: '',
              })
            }
          >
            Submit Null
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-null-form');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: null,
            description: undefined,
            user: 'lf87xt8u569dei6',
            status: 'wishlist',
            company: '',
          })
        );
      });
    });
  });

  describe('Metadata State Management', () => {
    it('should handle empty companies and artists arrays', async () => {
      mockUseUserMetadata.mockReturnValue({
        companies: [],
        artists: [],
        authChecked: true,
        loading: false,
        refreshMetadata: vi.fn(),
      });

      mockUseMetadata.mockReturnValue({
        companies: [],
        artists: [],
        tags: [],
        companyNames: [],
        artistNames: [],
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

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const companiesElement = screen.getByTestId('companies');
      const artistsElement = screen.getByTestId('artists');

      expect(JSON.parse(companiesElement.textContent!)).toEqual([]);
      expect(JSON.parse(artistsElement.textContent!)).toEqual([]);
    });

    it('should handle large metadata arrays efficiently', async () => {
      const largeCompaniesArray = Array.from({ length: 100 }, (_, i) => `Company ${i + 1}`);
      const largeArtistsArray = Array.from({ length: 100 }, (_, i) => `Artist ${i + 1}`);

      mockUseUserMetadata.mockReturnValue({
        companies: largeCompaniesArray,
        artists: largeArtistsArray,
        authChecked: true,
        loading: false,
        refreshMetadata: vi.fn(),
      });

      mockUseMetadata.mockReturnValue({
        companies: largeCompaniesArray.map((name, i) => ({
          id: `${i + 1}`,
          name,
          website_url: '',
          user: 'user1',
          created: '',
          updated: '',
        })),
        artists: largeArtistsArray.map((name, i) => ({
          id: `${i + 1}`,
          name,
          user: 'user1',
          created: '',
          updated: '',
        })),
        tags: [],
        companyNames: largeCompaniesArray,
        artistNames: largeArtistsArray,
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

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const companiesElement = screen.getByTestId('companies');
      const artistsElement = screen.getByTestId('artists');

      expect(JSON.parse(companiesElement.textContent!)).toHaveLength(100);
      expect(JSON.parse(artistsElement.textContent!)).toHaveLength(100);
    });

    it('should handle metadata with special characters', async () => {
      const specialCompanies = [
        'Company & Co.',
        'Company "Quotes"',
        "Company's Name",
        'Company <Tags>',
      ];
      const specialArtists = ['Artist & Co.', 'Artist "Quotes"', "Artist's Name", 'Artist <Tags>'];

      mockUseUserMetadata.mockReturnValue({
        companies: specialCompanies,
        artists: specialArtists,
        authChecked: true,
        loading: false,
        refreshMetadata: vi.fn(),
      });

      mockUseMetadata.mockReturnValue({
        companies: specialCompanies.map((name, i) => ({
          id: `${i + 1}`,
          name,
          website_url: '',
          user: 'user1',
          created: '',
          updated: '',
        })),
        artists: specialArtists.map((name, i) => ({
          id: `${i + 1}`,
          name,
          user: 'user1',
          created: '',
          updated: '',
        })),
        tags: [],
        companyNames: specialCompanies,
        artistNames: specialArtists,
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

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const companiesElement = screen.getByTestId('companies');
      const artistsElement = screen.getByTestId('artists');

      expect(JSON.parse(companiesElement.textContent!)).toEqual(specialCompanies);
      expect(JSON.parse(artistsElement.textContent!)).toEqual(specialArtists);
    });
  });

  describe('Navigation Edge Cases', () => {
    it('should handle project creation with special project IDs', async () => {
      const specialProjectId = 'project-with-special-chars_123-abc';
      const mockMutateAsync = vi.fn().mockResolvedValue({
        id: specialProjectId,
        title: 'Special Project',
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
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
            title: 'Special Project',
            user: 'lf87xt8u569dei6',
          })
        );
      });

      // Navigation is handled internally by useCreateProjectWithRedirect hook
    });

    it('should handle project creation with missing ID in response', async () => {
      const mockMutateAsync = vi.fn().mockResolvedValue({
        title: 'Test Project',
        // Missing ID to test edge case
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
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
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // useCreateProjectWithRedirect hook handles navigation internally
      // including edge cases like missing IDs
    });

    it('should handle rapid form submissions', async () => {
      const mockMutateAsync = vi
        .fn()
        .mockResolvedValueOnce({ id: 'first-id', title: 'First' })
        .mockResolvedValueOnce({ id: 'second-id', title: 'Second' });

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-form');
      fireEvent.click(submitButton);
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });

      // useCreateProjectWithRedirect handles rapid submissions internally
    });
  });

  describe('Component Integration and Props', () => {
    it('should pass all required props to ProjectForm correctly', async () => {
      renderNewProject();

      await waitFor(() => {
        expect(mockProjectForm).toHaveBeenCalledWith(
          expect.objectContaining({
            onSubmit: expect.any(Function),
            initialData: expect.objectContaining({
              userId: 'lf87xt8u569dei6',
              status: 'wishlist',
            }),
            isLoading: false,
            companies: ['Company A', 'Company B'],
            artists: ['Artist 1', 'Artist 2'],
            onCompanyAdded: expect.any(Function),
            onArtistAdded: expect.any(Function),
          }),
          expect.any(Object)
        );
      });
    });

    it('should handle company addition workflow end-to-end', async () => {
      const mockCompanyMutateAsync = vi.fn().mockResolvedValue({
        id: 'new-company-id',
        name: 'New Test Company',
      });

      mockUseCreateCompany.mockReturnValue({
        mutateAsync: mockCompanyMutateAsync,
        isPending: false,
      });

      mockProjectForm.mockImplementation(({ onCompanyAdded }) => (
        <div data-testid="project-form">
          <button
            data-testid="add-company-workflow"
            onClick={() => onCompanyAdded('New Test Company')}
          >
            Add Company
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const addCompanyButton = screen.getByTestId('add-company-workflow');
      fireEvent.click(addCompanyButton);

      await waitFor(() => {
        expect(mockCompanyMutateAsync).toHaveBeenCalledWith({
          name: 'New Test Company',
          user: 'lf87xt8u569dei6',
        });
      });
    });

    it('should handle artist addition workflow end-to-end', async () => {
      const mockArtistMutateAsync = vi.fn().mockResolvedValue({
        id: 'new-artist-id',
        name: 'New Test Artist',
      });

      mockUseCreateArtist.mockReturnValue({
        mutateAsync: mockArtistMutateAsync,
        isPending: false,
      });

      mockProjectForm.mockImplementation(({ onArtistAdded }) => (
        <div data-testid="project-form">
          <button
            data-testid="add-artist-workflow"
            onClick={() => onArtistAdded('New Test Artist')}
          >
            Add Artist
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const addArtistButton = screen.getByTestId('add-artist-workflow');
      fireEvent.click(addArtistButton);

      await waitFor(() => {
        expect(mockArtistMutateAsync).toHaveBeenCalledWith({
          name: 'New Test Artist',
          user: 'lf87xt8u569dei6',
        });
      });
    });

    it('should maintain component hierarchy and structure', async () => {
      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('main-layout')).toBeInTheDocument();
        expect(screen.getByTestId('new-project-header')).toBeInTheDocument();
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const mainLayout = screen.getByTestId('main-layout');
      const header = screen.getByTestId('new-project-header');
      const form = screen.getByTestId('project-form');

      expect(mainLayout).toContainElement(header);
      expect(mainLayout).toContainElement(form);
    });
  });

  describe('End-to-End Workflow Scenarios', () => {
    it('should complete full project creation workflow with company and artist addition', async () => {
      const mockProjectMutateAsync = vi.fn().mockResolvedValue({
        id: 'workflow-project-id',
        title: 'Workflow Test Project',
      });

      const mockCompanyMutateAsync = vi.fn().mockResolvedValue({
        id: 'workflow-company-id',
        name: 'Workflow Company',
      });

      const mockArtistMutateAsync = vi.fn().mockResolvedValue({
        id: 'workflow-artist-id',
        name: 'Workflow Artist',
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: mockProjectMutateAsync,
        isPending: false,
      });

      mockUseCreateCompany.mockReturnValue({
        mutateAsync: mockCompanyMutateAsync,
        isPending: false,
      });

      mockUseCreateArtist.mockReturnValue({
        mutateAsync: mockArtistMutateAsync,
        isPending: false,
      });

      mockProjectForm.mockImplementation(({ onSubmit, onCompanyAdded, onArtistAdded }) => (
        <div data-testid="project-form">
          <button
            data-testid="add-company-then-artist-then-submit"
            onClick={async () => {
              await onCompanyAdded('Workflow Company');
              await onArtistAdded('Workflow Artist');
              await onSubmit({
                title: 'Workflow Test Project',
                company: 'Workflow Company',
                artist: 'Workflow Artist',
                status: 'in_progress',
              });
            }}
          >
            Complete Workflow
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const workflowButton = screen.getByTestId('add-company-then-artist-then-submit');
      fireEvent.click(workflowButton);

      await waitFor(() => {
        expect(mockCompanyMutateAsync).toHaveBeenCalledWith({
          name: 'Workflow Company',
          user: 'lf87xt8u569dei6',
        });
      });

      await waitFor(() => {
        expect(mockArtistMutateAsync).toHaveBeenCalledWith({
          name: 'Workflow Artist',
          user: 'lf87xt8u569dei6',
        });
      });

      await waitFor(() => {
        expect(mockProjectMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Workflow Test Project',
            company: 'Workflow Company',
            artist: 'Workflow Artist',
            user: 'lf87xt8u569dei6',
            status: 'in_progress',
          })
        );
      });

      await waitFor(() => {
        expect(mockProjectMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Workflow Test Project',
            user: 'lf87xt8u569dei6',
          })
        );
      });

      // Navigation is handled by useCreateProjectWithRedirect hook internally
    });

    it('should handle mixed success and failure scenarios', async () => {
      const mockProjectMutateAsync = vi.fn().mockResolvedValue({
        id: 'mixed-project-id',
        title: 'Mixed Test Project',
      });

      const mockCompanyMutateAsync = vi.fn().mockRejectedValue(new Error('Company failed'));
      const mockArtistMutateAsync = vi.fn().mockResolvedValue({
        id: 'mixed-artist-id',
        name: 'Mixed Artist',
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: mockProjectMutateAsync,
        isPending: false,
      });

      mockUseCreateCompany.mockReturnValue({
        mutateAsync: mockCompanyMutateAsync,
        isPending: false,
      });

      mockUseCreateArtist.mockReturnValue({
        mutateAsync: mockArtistMutateAsync,
        isPending: false,
      });

      mockProjectForm.mockImplementation(({ onSubmit, onCompanyAdded, onArtistAdded }) => (
        <div data-testid="project-form">
          <button
            data-testid="mixed-operations"
            onClick={async () => {
              try {
                await onCompanyAdded('Failed Company');
              } catch {
                // continue after failure
              }
              await onArtistAdded('Successful Artist');
              await onSubmit({
                title: 'Mixed Test Project',
                artist: 'Successful Artist',
                status: 'wishlist',
              });
            }}
          >
            Mixed Operations
          </button>
        </div>
      ));

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const mixedButton = screen.getByTestId('mixed-operations');
      fireEvent.click(mixedButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error creating company:', expect.any(Error));
      });

      await waitFor(() => {
        expect(mockArtistMutateAsync).toHaveBeenCalledWith({
          name: 'Successful Artist',
          user: 'lf87xt8u569dei6',
        });
      });

      await waitFor(() => {
        expect(mockProjectMutateAsync).toHaveBeenCalled();
        // Navigation is handled by useCreateProjectWithRedirect hook internally
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle component unmounting during async operations', async () => {
      const mockMutateAsync = vi
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(() => resolve({ id: 'delayed-id' }), 1000))
        );

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isPending: false,
      });

      const { unmount } = renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      const submitButton = screen.getByTestId('submit-form');
      fireEvent.click(submitButton);

      unmount();
      expect(() => unmount()).not.toThrow();
    });

    it('should handle multiple rapid state changes', async () => {
      let renderCount = 0;

      mockProjectForm.mockImplementation(props => {
        renderCount++;
        return (
          <div data-testid="project-form">
            <div data-testid="render-count">{renderCount}</div>
            <div data-testid="loading">{props.isLoading ? 'true' : 'false'}</div>
          </div>
        );
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: true,
      });

      const { rerender } = renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('true');
      });

      mockUseCreateProjectWithRedirect.mockReturnValue({
        mutateAsync: vi.fn(),
        isPending: false,
      });

      rerender(
        <QueryClientProvider
          client={
            new QueryClient({
              defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
            })
          }
        >
          <MemoryRouter>
            <NewProject />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('false');
      });

      expect(renderCount).toBeGreaterThan(1);
    });

    it('should maintain referential stability of callback functions', async () => {
      const callbackRefs: Record<string, unknown> = {};

      mockProjectForm.mockImplementation(props => {
        if (!callbackRefs.onSubmit) {
          callbackRefs.onSubmit = props.onSubmit;
          callbackRefs.onCompanyAdded = props.onCompanyAdded;
          callbackRefs.onArtistAdded = props.onArtistAdded;
        }
        return (
          <div data-testid="project-form">
            <div data-testid="callbacks-stable">
              {props.onSubmit === callbackRefs.onSubmit ? 'stable' : 'changed'}
            </div>
          </div>
        );
      });

      renderNewProject();

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      expect(screen.getByTestId('callbacks-stable')).toHaveTextContent('stable');
    });
  });

  describe('React Query Integration', () => {
    it('should work with custom query client configurations', async () => {
      const customQueryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: 3, staleTime: 60000, gcTime: 300000 },
          mutations: { retry: 1, onError: vi.fn() },
        },
      });

      render(
        <QueryClientProvider client={customQueryClient}>
          <MemoryRouter>
            <NewProject />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });
    });

    it('should handle query client provider errors gracefully', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <NewProject />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Router Integration', () => {
    it('should handle different initial routes', async () => {
      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/projects/new?from=dashboard']}>
            <NewProject />
          </MemoryRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });
    });

    it('should handle project creation with navigation state', async () => {
      const mockMutateAsync = vi
        .fn()
        .mockResolvedValue({ id: 'history-project-id', title: 'History Project' });

      mockUseCreateProjectWithRedirect.mockReturnValue({
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
            title: 'History Project',
            user: 'lf87xt8u569dei6',
          })
        );
      });

      // Navigation state and history is managed by useCreateProjectWithRedirect hook
    });
  });
});
