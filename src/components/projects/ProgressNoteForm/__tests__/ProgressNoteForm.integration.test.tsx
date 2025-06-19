import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProgressNoteForm from '../../ProgressNoteForm';
import { useProgressNoteForm } from '@/hooks/useProgressNoteForm';
import { vi } from 'vitest';

// Mocks
vi.mock('@/hooks/useProgressNoteForm', () => ({
  useProgressNoteForm: vi.fn(),
}));
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock the sub-components to simplify integration testing focus on ProgressNoteForm itself
vi.mock('../DateInput', () => ({
  DateInput: ({
    onChange,
    value,
    error,
    disabled,
  }: {
    onChange: (date: Date | null) => void;
    value?: string;
    error?: string;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor="date-input">Date</label>
      <input
        id="date-input"
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.valueAsDate)}
        data-testid="date-input"
        disabled={disabled}
      />
      {error && <p data-testid="date-error">{error}</p>}
    </div>
  ),
}));

vi.mock('../ImageUpload', () => ({
  ImageUpload: ({
    onChange,
    imageFile,
    isCompressing,
    compressionProgress,
    error,
    disabled,
  }: {
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    imageFile?: File;
    isCompressing?: boolean;
    compressionProgress?: { percentage: number };
    error?: string;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor="image-upload-input">Image</label>
      <input
        id="image-upload-input"
        type="file"
        onChange={onChange}
        data-testid="image-upload-input"
        disabled={disabled}
      />
      {imageFile && <p data-testid="image-file-name">{imageFile.name}</p>}
      {isCompressing && compressionProgress && (
        <div data-testid="compression-progress">{compressionProgress.percentage}%</div>
      )}
      {error && <p data-testid="image-error">{error}</p>}
    </div>
  ),
}));

vi.mock('../ContentTextarea', () => ({
  ContentTextarea: ({
    onChange,
    value,
    error,
    disabled,
  }: {
    onChange: (value: string) => void;
    value?: string;
    error?: string;
    disabled?: boolean;
  }) => (
    <div>
      <label htmlFor="content-textarea">Content</label>
      <textarea
        id="content-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        data-testid="content-textarea"
        disabled={disabled}
      />
      {error && <p data-testid="content-error">{error}</p>}
    </div>
  ),
}));

describe('ProgressNoteForm Integration Tests', () => {
  const mockUseProgressNoteForm = vi.mocked(useProgressNoteForm);

  const mockDefaultReturnValue = {
    date: '',
    content: '',
    imageFile: null,
    errors: {},
    isSubmitting: false,
    isCompressing: false,
    compressionProgress: null,
    isFormDisabled: false,
    areInputsDisabled: false, // Added missing property
    formRef: React.createRef<HTMLFormElement>(),
    handleDateChange: vi.fn(),
    handleContentChange: vi.fn(),
    handleImageChange: vi.fn(),
    handleClearImage: vi.fn(),
    handleSubmit: vi.fn().mockResolvedValue(undefined), // Ensure handleSubmit is a mock
    resetForm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure handleSubmit is always a Vitest mock function
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      handleSubmit: vi.fn().mockResolvedValue(undefined),
    });
  });

  it('renders the form with all fields', () => {
    render(<ProgressNoteForm onSubmit={mockDefaultReturnValue.handleSubmit} onSuccess={vi.fn()} />);
    expect(screen.getByTestId('date-input')).toBeInTheDocument();
    expect(screen.getByTestId('image-upload-input')).toBeInTheDocument();
    expect(screen.getByTestId('content-textarea')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add note/i })).toBeInTheDocument();
  });

  it('calls handleSubmit when the form is submitted with valid data (no image)', async () => {
    const handleSubmitMock = vi.fn().mockResolvedValue(undefined);
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      date: '2025-05-26',
      content: 'Test content',
      handleSubmit: handleSubmitMock,
    });

    render(<ProgressNoteForm onSubmit={handleSubmitMock} onSuccess={vi.fn()} />);

    fireEvent.submit(screen.getByRole('button', { name: /add note/i }));

    await waitFor(() => {
      expect(handleSubmitMock).toHaveBeenCalledTimes(1);
    });
  });

  it('calls handleSubmit when the form is submitted with valid data (with image)', async () => {
    const handleSubmitMock = vi.fn().mockResolvedValue(undefined);
    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      date: '2025-05-26',
      content: 'Test content with image',
      imageFile: mockFile,
      handleSubmit: handleSubmitMock,
    });

    render(<ProgressNoteForm onSubmit={handleSubmitMock} onSuccess={vi.fn()} />);
    fireEvent.submit(screen.getByRole('button', { name: /add note/i }));

    await waitFor(() => {
      expect(handleSubmitMock).toHaveBeenCalledTimes(1);
    });
  });

  it('displays validation errors for required fields', async () => {
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      errors: {
        date: 'Date is required',
        content: 'Content is required',
        form: 'General form error',
      },
    });

    render(<ProgressNoteForm onSubmit={mockDefaultReturnValue.handleSubmit} onSuccess={vi.fn()} />);

    expect(screen.getByTestId('date-error')).toHaveTextContent('Date is required');
    expect(screen.getByTestId('content-error')).toHaveTextContent('Content is required');
    expect(screen.getByText('General form error')).toBeInTheDocument();
  });

  it('displays image compression progress', () => {
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      isCompressing: true,
      compressionProgress: { percentage: 50, status: 'Compressing', currentStep: 'Resizing' },
      imageFile: new File(['dummy'], 'compressing.jpg', { type: 'image/jpeg' }),
    });

    render(<ProgressNoteForm onSubmit={mockDefaultReturnValue.handleSubmit} onSuccess={vi.fn()} />);
    expect(screen.getByTestId('compression-progress')).toHaveTextContent('50%');
  });

  it('disables the submit button when isFormDisabled is true', () => {
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      isFormDisabled: true,
    });

    render(<ProgressNoteForm onSubmit={mockDefaultReturnValue.handleSubmit} onSuccess={vi.fn()} />);
    expect(screen.getByRole('button', { name: /add note/i })).toBeDisabled();
  });

  it('calls handleDateChange when date input changes', () => {
    const handleDateChangeMock = vi.fn();
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      handleDateChange: handleDateChangeMock,
    });
    render(<ProgressNoteForm onSubmit={mockDefaultReturnValue.handleSubmit} onSuccess={vi.fn()} />);
    const dateInput = screen.getByTestId('date-input');
    fireEvent.change(dateInput, { target: { value: '2025-05-27' } });
    // The mock DateInput calls onChange with valueAsDate, so we check if the hook's handler was called.
    // Exact argument matching for Date objects can be tricky, so we check if it was called.
    expect(handleDateChangeMock).toHaveBeenCalled();
  });

  it('calls handleContentChange when content textarea changes', () => {
    const handleContentChangeMock = vi.fn();
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      handleContentChange: handleContentChangeMock,
    });
    render(<ProgressNoteForm onSubmit={mockDefaultReturnValue.handleSubmit} onSuccess={vi.fn()} />);
    const contentTextarea = screen.getByTestId('content-textarea');
    fireEvent.change(contentTextarea, { target: { value: 'New content' } });
    expect(handleContentChangeMock).toHaveBeenCalled();
  });

  it('calls handleImageChange when image input changes', () => {
    const handleImageChangeMock = vi.fn();
    mockUseProgressNoteForm.mockReturnValue({
      ...mockDefaultReturnValue,
      handleImageChange: handleImageChangeMock,
    });
    render(<ProgressNoteForm onSubmit={mockDefaultReturnValue.handleSubmit} onSuccess={vi.fn()} />);
    const imageInput = screen.getByTestId('image-upload-input');
    const mockFile = new File(['dummy'], 'new-image.png', { type: 'image/png' });
    fireEvent.change(imageInput, { target: { files: [mockFile] } });
    expect(handleImageChangeMock).toHaveBeenCalled();
  });
});
