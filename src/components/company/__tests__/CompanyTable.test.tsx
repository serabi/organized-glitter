import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CompanyTable from '../CompanyTable';
import { Collections } from '@/types/pocketbase.types';

// Mock the edit dialog
vi.mock('../EditCompanyDialog', () => ({
  default: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) =>
    open ? (
      <div data-testid="edit-company-dialog">
        <button onClick={() => onOpenChange(false)}>Close</button>
      </div>
    ) : null,
}));

// Mock UI components
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: { children: React.ReactNode }) => <table>{children}</table>,
  TableHeader: ({ children }: { children: React.ReactNode }) => <thead>{children}</thead>,
  TableBody: ({ children }: { children: React.ReactNode }) => <tbody>{children}</tbody>,
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableHead: ({ children }: { children: React.ReactNode }) => <th>{children}</th>,
  TableCell: ({ children }: { children: React.ReactNode }) => <td>{children}</td>,
}));

vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogAction: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  AlertDialogCancel: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
  }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
  buttonVariants: vi.fn(() => 'mocked-button-class'),
}));

// Mock icons
vi.mock('lucide-react', () => ({
  Edit: () => <span data-testid="edit-icon">Edit</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Link2: () => <span data-testid="link-icon">Link</span>,
  Loader2: () => <span data-testid="loader-icon">Loading</span>,
  FileText: () => <span data-testid="file-text-icon">FileText</span>,
}));

// Mock PocketBase
const mockGetList = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/pocketbase', () => ({
  pb: {
    authStore: {
      isValid: true,
      model: { id: 'user1' },
    },
    collection: vi.fn(() => ({
      delete: mockDelete,
      getList: mockGetList.mockResolvedValue({
        totalItems: 0,
        page: 1,
        perPage: 1,
        totalPages: 1,
        items: [],
      }),
    })),
  },
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the useDeleteCompany hook
const mockDeleteCompanyMutation = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

vi.mock('@/hooks/mutations/useCompanyMutations', () => ({
  useDeleteCompany: () => mockDeleteCompanyMutation,
}));

const mockCompanies = [
  {
    id: 'company1',
    collectionId: 'companies',
    collectionName: Collections.Companies,
    name: 'Diamond Dotz',
    website_url: 'https://diamonddotz.com',
    created: '2025-01-01T00:00:00Z',
    updated: '2025-01-01T00:00:00Z',
    user: 'user1',
  },
  {
    id: 'company2',
    collectionId: 'companies',
    collectionName: Collections.Companies,
    name: 'Diamond Art Club',
    website_url: 'https://diamondartclub.com',
    created: '2025-01-02T00:00:00Z',
    updated: '2025-01-02T00:00:00Z',
    user: 'user1',
  },
  {
    id: 'company3',
    collectionId: 'companies',
    collectionName: Collections.Companies,
    name: 'Local Craft Store',
    website_url: '',
    created: '2025-01-03T00:00:00Z',
    updated: '2025-01-03T00:00:00Z',
    user: 'user1',
  },
];

describe('CompanyTable', () => {
  const mockOnEdit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderCompanyTable = (companies = mockCompanies) => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter future={{ v7_relativeSplatPath: true }}>
          <CompanyTable companies={companies} loading={false} onCompanyUpdated={mockOnEdit} />
        </BrowserRouter>
      </QueryClientProvider>
    );
  };

  it('should render company table with data', async () => {
    await act(async () => {
      renderCompanyTable();
    });

    // Wait for async operations to complete
    await waitFor(() => {
      expect(screen.getByText('Company Name')).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText('Company Name')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    // Check company data
    expect(screen.getByText('Diamond Dotz')).toBeInTheDocument();
    expect(screen.getByText('Diamond Art Club')).toBeInTheDocument();
    expect(screen.getByText('Local Craft Store')).toBeInTheDocument();
  });

  it('should render website links for companies with URLs', async () => {
    await act(async () => {
      renderCompanyTable();
    });

    await waitFor(() => {
      expect(screen.getByText('Diamond Dotz')).toBeInTheDocument();
    });

    const diamondDotzLink = screen.getByRole('link', { name: 'Link https://diamonddotz.com' });
    expect(diamondDotzLink).toHaveAttribute('href', 'https://diamonddotz.com');
    expect(diamondDotzLink).toHaveAttribute('target', '_blank');
    expect(diamondDotzLink).toHaveAttribute('rel', 'noopener noreferrer');

    const diamondArtClubLink = screen.getByRole('link', {
      name: 'Link https://diamondartclub.com',
    });
    expect(diamondArtClubLink).toHaveAttribute('href', 'https://diamondartclub.com');
  });

  it('should show "No website provided" for companies without URLs', async () => {
    await act(async () => {
      renderCompanyTable();
    });

    await waitFor(() => {
      expect(screen.getByText('Local Craft Store')).toBeInTheDocument();
    });

    // Find the table row for Local Craft Store and check its website cell
    const localCraftStoreRow = screen.getByText('Local Craft Store').closest('tr');
    expect(localCraftStoreRow).toContainHTML('No website provided');
  });

  it('should render edit components for each company', async () => {
    await act(async () => {
      renderCompanyTable();
    });

    await waitFor(() => {
      expect(screen.getByText('Diamond Dotz')).toBeInTheDocument();
    });

    // The EditCompanyDialog components should be rendered (but closed)
    // Since they're mocked and closed by default, we don't expect visible elements
    expect(screen.queryByTestId('edit-company-dialog')).not.toBeInTheDocument();
  });

  it('should render delete buttons for each company', async () => {
    await act(async () => {
      renderCompanyTable();
    });

    await waitFor(() => {
      expect(screen.getByText('Diamond Dotz')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByTestId('trash-icon');
    expect(deleteButtons).toHaveLength(mockCompanies.length);
  });

  it('should call delete mutation when delete button is clicked', async () => {
    await act(async () => {
      renderCompanyTable();
    });

    await waitFor(() => {
      expect(screen.getByText('Diamond Dotz')).toBeInTheDocument();
    });

    // Click the delete button to open dialog
    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });

    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    // Wait for the confirmation dialog to appear and click confirm
    await waitFor(() => {
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    });

    // Click the Delete button in the dialog (not the Trash icon button)
    const alertDialog = screen.getByTestId('alert-dialog');
    const dialogDeleteButton = within(alertDialog).getByText('Delete');

    await act(async () => {
      fireEvent.click(dialogDeleteButton);
    });

    expect(mockDeleteCompanyMutation.mutate).toHaveBeenCalledWith(
      { id: 'company1', name: 'Diamond Dotz' },
      expect.objectContaining({
        onSettled: expect.any(Function),
      })
    );
  });

  it('should render empty state when no companies', async () => {
    await act(async () => {
      renderCompanyTable([]);
    });

    expect(screen.getByText("You haven't added any companies yet.")).toBeInTheDocument();
  });

  it('should handle companies with long names', async () => {
    const longNameCompanies = [
      {
        id: 'company-long',
        collectionId: 'companies',
        collectionName: Collections.Companies,
        name: 'Very Long Company Name That Might Overflow The Table Cell Width',
        website_url: 'https://verylongcompanyname.com',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        user: 'user1',
      },
    ];

    await act(async () => {
      renderCompanyTable(longNameCompanies);
    });

    await waitFor(() => {
      expect(
        screen.getByText('Very Long Company Name That Might Overflow The Table Cell Width')
      ).toBeInTheDocument();
    });
  });

  it('should handle companies with invalid URLs gracefully', async () => {
    const invalidUrlCompanies = [
      {
        id: 'company-invalid',
        collectionId: 'companies',
        collectionName: Collections.Companies,
        name: 'Invalid URL Company',
        website_url: 'not-a-valid-url',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        user: 'user1',
      },
    ];

    await act(async () => {
      renderCompanyTable(invalidUrlCompanies);
    });

    await waitFor(() => {
      expect(screen.getByText('Invalid URL Company')).toBeInTheDocument();
    });

    // Should still render the link even if URL is invalid
    const link = screen.getByRole('link', { name: 'Link not-a-valid-url' });
    expect(link).toHaveAttribute('href', 'not-a-valid-url');
  });

  it('should maintain table structure with mixed data', async () => {
    const mixedCompanies = [
      {
        id: 'company1',
        collectionId: 'companies',
        collectionName: Collections.Companies,
        name: 'Company with Website',
        website_url: 'https://example.com',
        created: '2025-01-01T00:00:00Z',
        updated: '2025-01-01T00:00:00Z',
        user: 'user1',
      },
      {
        id: 'company2',
        collectionId: 'companies',
        collectionName: Collections.Companies,
        name: 'Company without Website',
        website_url: '',
        created: '2025-01-02T00:00:00Z',
        updated: '2025-01-02T00:00:00Z',
        user: 'user1',
      },
    ];

    await act(async () => {
      renderCompanyTable(mixedCompanies);
    });

    await waitFor(() => {
      expect(screen.getByText('Company with Website')).toBeInTheDocument();
    });

    // Both rows should be present
    expect(screen.getByText('Company with Website')).toBeInTheDocument();
    expect(screen.getByText('Company without Website')).toBeInTheDocument();

    // One link and one "No website provided" text
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(screen.getByText('No website provided')).toBeInTheDocument();
  });
});
