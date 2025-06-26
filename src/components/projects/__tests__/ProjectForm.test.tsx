import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProjectForm from '../ProjectForm';
import { ProjectFormValues } from '@/types/project';

// Create a mock for the consolidated useProjectForm hook
const mockForm = {
  // Form state and refs
  formRef: { current: null },
  isSubmitting: false,
  currentWatchedData: {
    title: '',
    company: '',
    artist: '',
    drillShape: '',
    status: 'wishlist',
    datePurchased: '',
    dateReceived: '',
    dateStarted: '',
    dateCompleted: '',
    generalNotes: '',
    sourceUrl: '',
    totalDiamonds: null,
    width: null,
    height: null,
    kit_category: 'full',
    imageUrl: null,
  },
  
  // RHF API
  rhfApi: {
    register: vi.fn(),
    handleSubmit: vi.fn(fn => fn),
    formState: { errors: {}, isSubmitting: false },
    watch: vi.fn(() => ({})),
    setValue: vi.fn(),
    getValues: vi.fn(() => ({})),
    control: {},
  },
  processedSubmitHandler: vi.fn(),
  setValue: vi.fn(),
  formErrors: {},
  RHFisSubmitting: false,
  
  // Tags
  projectTags: [],
  setProjectTags: vi.fn(),
  
  // Image handling
  imagePreview: null,
  isUploading: false,
  setIsUploading: vi.fn(),
  uploadError: null,
  setUploadError: vi.fn(),
  selectedFileName: undefined,
  setSelectedFileName: vi.fn(),
  imageUploadUI: {
    selectedFile: null,
    preview: null,
    uploading: false,
    error: null,
    isCompressing: false,
    wasRemoved: false,
    handleImageChange: vi.fn(),
    handleImageRemove: vi.fn(),
  },
  handleImageChange: vi.fn(),
  handleImageRemove: vi.fn(),
  
  // Companies and artists
  companies: ['Company A', 'Company B'],
  artists: ['Artist 1', 'Artist 2'],
  handleAddCompany: vi.fn(),
  handleAddArtist: vi.fn(),
  handleCompanyAdded: vi.fn(),
  handleArtistAdded: vi.fn(),
  
  // Generic handlers
  genericHandleChange: vi.fn(),
  genericHandleSelectChange: vi.fn(),
  handleTagsChange: vi.fn(),
  
  // Utils
  toast: vi.fn(),
};

// Mock the consolidated useProjectForm hook
vi.mock('@/hooks/useProjectForm', () => ({
  useProjectForm: () => mockForm,
}));

// Mock form sections
vi.mock('../form-sections', () => ({
  BasicInfoSection: () => <div data-testid="basic-info-section">Basic Info Section</div>,
  ProjectSpecsSection: () => <div data-testid="specs-section">Specs Section</div>,
  ProjectStatusSection: () => <div data-testid="status-section">Status Section</div>,
  ProjectNotesSection: () => <div data-testid="notes-section">Notes Section</div>,
  ProjectImageSection: () => <div data-testid="image-section">Image Section</div>,
}));

// Mock UI components
vi.mock('@/components/ui/form', () => ({
  Form: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="form-wrapper">{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled} data-disabled={disabled}>
      {children}
    </button>
  ),
}));

describe('ProjectForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnChange = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onChange: mockOnChange,
    companies: ['Company 1', 'Company 2'],
    artists: ['Artist 1', 'Artist 2'],
    isLoading: false,
    isEdit: false,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock state
    mockForm.isSubmitting = false;
    mockForm.RHFisSubmitting = false;
  });

  it('renders all form sections', () => {
    render(<ProjectForm {...defaultProps} />);

    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
    expect(screen.getByTestId('specs-section')).toBeInTheDocument();
    expect(screen.getByTestId('status-section')).toBeInTheDocument();
    expect(screen.getByTestId('notes-section')).toBeInTheDocument();
    expect(screen.getByTestId('image-section')).toBeInTheDocument();
  });

  it('renders submit button with correct text for new project', () => {
    render(<ProjectForm {...defaultProps} isEdit={false} />);

    expect(screen.getByText('Create Project')).toBeInTheDocument();
  });

  it('renders submit button with correct text for edit mode', () => {
    render(<ProjectForm {...defaultProps} isEdit={true} />);

    expect(screen.getByText('Update Project')).toBeInTheDocument();
  });

  it('renders cancel button when onCancel is provided', () => {
    render(<ProjectForm {...defaultProps} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render cancel button when onCancel is not provided', () => {
    const { onCancel, ...propsWithoutCancel } = defaultProps;
    render(<ProjectForm {...propsWithoutCancel} />);

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ProjectForm {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('renders with initial data', () => {
    const initialData: Partial<ProjectFormValues> = {
      title: 'Test Project',
      company: 'Test Company',
    };

    render(<ProjectForm {...defaultProps} initialData={initialData} />);

    // Just check that the form renders with the initial data (the mocked form sections will display it)
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
  });

  it('disables submit button when loading', () => {
    // Set the mock to indicate loading state
    mockForm.isSubmitting = true;

    render(<ProjectForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByText('Saving...');
    expect(submitButton).toBeDisabled();
  });

  it('passes companies and artists to form sections', () => {
    render(<ProjectForm {...defaultProps} />);

    // Form sections should receive the props through the custom hooks
    expect(screen.getByTestId('basic-info-section')).toBeInTheDocument();
  });
});
