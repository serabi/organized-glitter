import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, MockInstance } from 'vitest';
import { ImageUpload } from '../ImageUpload';

// Mock functions for URL methods
const mockCreateObjectURL = vi.fn((): string => 'blob:mock-url-12345');
const mockRevokeObjectURL = vi.fn((): void => undefined);

let createObjectURLSpy: MockInstance<(obj: Blob | MediaSource) => string> | undefined;
let revokeObjectURLSpy: MockInstance<(url: string) => void> | undefined;
let originalCreateObjectURL: typeof URL.createObjectURL | undefined;
let originalRevokeObjectURL: typeof URL.revokeObjectURL | undefined;

// Setup spies before tests run - preserve existing URL object and methods
beforeAll(() => {
  // Check if URL.createObjectURL exists
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    // URL methods exist, spy on them to preserve original functionality
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(mockCreateObjectURL);
  } else {
    // URL methods don't exist, add them to the URL object
    originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = mockCreateObjectURL;
  }

  // Check if URL.revokeObjectURL exists
  if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    // URL methods exist, spy on them to preserve original functionality
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(mockRevokeObjectURL);
  } else {
    // URL methods don't exist, add them to the URL object
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.revokeObjectURL = mockRevokeObjectURL;
  }
});

// Cleanup spies after all tests
afterAll(() => {
  if (createObjectURLSpy) {
    createObjectURLSpy.mockRestore();
  } else {
    // Restore original method or remove if it didn't exist
    if (originalCreateObjectURL) {
      URL.createObjectURL = originalCreateObjectURL;
    } else {
      delete (URL as Partial<typeof URL>).createObjectURL;
    }
  }

  if (revokeObjectURLSpy) {
    revokeObjectURLSpy.mockRestore();
  } else {
    // Restore original method or remove if it didn't exist
    if (originalRevokeObjectURL) {
      URL.revokeObjectURL = originalRevokeObjectURL;
    } else {
      delete (URL as Partial<typeof URL>).revokeObjectURL;
    }
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateObjectURL.mockReturnValue('blob:mock-url-12345');
});

describe('ImageUpload', () => {
  const mockOnChange = vi.fn();
  const mockOnClearImage = vi.fn();
  const defaultProps = {
    imageFile: null,
    isCompressing: false,
    compressionProgress: null,
    disabled: false,
    onChange: mockOnChange,
    onClearImage: mockOnClearImage,
    error: undefined,
  };

  it('renders the file input and label', () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.getByLabelText('Photo (optional)')).toBeInTheDocument();
    expect(screen.getByText('Choose File')).toBeInTheDocument();
  });

  it('displays the selected file name when a file is chosen', () => {
    const mockFile = new File(['dummy'], 'test-image.png', { type: 'image/png' });
    render(<ImageUpload {...defaultProps} imageFile={mockFile} />);
    expect(screen.getByText(/Selected: test-image.png/)).toBeInTheDocument();
  });

  it('calls onChange when a file is selected', () => {
    render(<ImageUpload {...defaultProps} />);
    const inputElement = screen.getByLabelText('Photo (optional)', {
      selector: 'input[type="file"]',
    });

    const mockFile = new File(['dummy'], 'new-image.jpg', { type: 'image/jpeg' });
    fireEvent.change(inputElement, { target: { files: [mockFile] } });
    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  it('disables the input and label when disabled prop is true', () => {
    render(<ImageUpload {...defaultProps} disabled={true} />);
    const labelButton = screen.getByText('Choose File');
    expect(labelButton).toHaveClass('opacity-50');
    expect(labelButton).toHaveClass('cursor-not-allowed');

    const inputElement = screen.getByLabelText('Photo (optional)', {
      selector: 'input[type="file"]',
    });
    expect(inputElement).toBeDisabled();
  });

  it('displays compression progress when isCompressing is true', () => {
    const compressionProgress = {
      percentage: 50,
      status: 'Compressing',
      currentStep: 'Resizing image',
    };
    render(
      <ImageUpload
        {...defaultProps}
        isCompressing={true}
        compressionProgress={compressionProgress}
      />
    );
    expect(screen.getByText('Resizing image')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    // Find the progress bar by class name since it doesn't have a role
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 50%');
  });

  it('does not display compression progress when isCompressing is false', () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.queryByText(/Compressing/)).not.toBeInTheDocument();
    expect(document.querySelector('.bg-blue-600')).not.toBeInTheDocument();
  });

  it('displays an error message when error prop is provided', () => {
    const errorMessage = 'Invalid file type.';
    render(<ImageUpload {...defaultProps} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    const inputElement = screen.getByLabelText('Photo (optional)', {
      selector: 'input[type="file"]',
    });
    expect(inputElement).toHaveAttribute('aria-invalid', 'true');
    expect(inputElement).toHaveAttribute('aria-describedby', 'image-error');
    expect(screen.getByText('Choose File')).toHaveClass('border-destructive');
  });

  it('does not display an error message when error prop is not provided', () => {
    render(<ImageUpload {...defaultProps} />);
    expect(screen.queryByText(/Invalid file type/)).not.toBeInTheDocument();
    const inputElement = screen.getByLabelText('Photo (optional)', {
      selector: 'input[type="file"]',
    });
    expect(inputElement).toHaveAttribute('aria-invalid', 'false');
    expect(screen.getByText('Choose File')).not.toHaveClass('border-destructive');
  });

  it('displays file size information when a file is selected and not compressing', () => {
    const mockFile = new File([new ArrayBuffer(1024 * 1024)], '1MB-image.png', {
      type: 'image/png',
    });
    render(<ImageUpload {...defaultProps} imageFile={mockFile} />);
    expect(screen.getByText(/Selected: 1MB-image.png \(1MB\)/)).toBeInTheDocument();
  });

  it('hides file size information during compression', () => {
    const mockFile = new File([new ArrayBuffer(1024 * 1024)], '1MB-image.png', {
      type: 'image/png',
    });
    const compressionProgress = {
      percentage: 30,
      status: 'Compressing',
      currentStep: 'Reading file',
    };
    render(
      <ImageUpload
        {...defaultProps}
        imageFile={mockFile}
        isCompressing={true}
        compressionProgress={compressionProgress}
      />
    );
    expect(screen.queryByText(/Selected: 1MB-image.png \(1MB\)/)).not.toBeInTheDocument();
  });

  // New tests for image preview functionality
  describe('Image Preview Functionality', () => {
    it('displays image preview when a file is selected', () => {
      const mockFile = new File(['dummy'], 'preview-test.jpg', { type: 'image/jpeg' });
      render(<ImageUpload {...defaultProps} imageFile={mockFile} />);

      // Check that preview image is rendered
      const previewImage = screen.getByAltText('Image preview');
      expect(previewImage).toBeInTheDocument();
      expect(previewImage).toHaveAttribute('src', 'blob:mock-url-12345');

      // Check that URL.createObjectURL was called
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
    });

    it('does not display image preview when no file is selected', () => {
      render(<ImageUpload {...defaultProps} imageFile={null} />);

      // Check that no preview image is rendered
      expect(screen.queryByAltText('Image preview')).not.toBeInTheDocument();

      // Check that URL.createObjectURL was not called
      expect(mockCreateObjectURL).not.toHaveBeenCalled();
    });

    it('hides upload button when image is selected', () => {
      const mockFile = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' });
      render(<ImageUpload {...defaultProps} imageFile={mockFile} />);

      // Upload button should not be visible when image is selected
      expect(screen.queryByText('Choose File')).not.toBeInTheDocument();
    });

    it('shows upload button when no image is selected', () => {
      render(<ImageUpload {...defaultProps} imageFile={null} />);

      // Upload button should be visible when no image is selected
      expect(screen.getByText('Choose File')).toBeInTheDocument();
    });

    it('displays compression overlay during image compression', () => {
      const mockFile = new File(['dummy'], 'compressing.jpg', { type: 'image/jpeg' });
      const compressionProgress = {
        percentage: 75,
        status: 'Compressing',
        currentStep: 'Optimizing',
      };
      render(
        <ImageUpload
          {...defaultProps}
          imageFile={mockFile}
          isCompressing={true}
          compressionProgress={compressionProgress}
        />
      );

      // Check that compression overlay is displayed
      expect(screen.getByText('Compressing...')).toBeInTheDocument();
    });

    it('cleans up object URL when component unmounts', () => {
      const mockFile = new File(['dummy'], 'cleanup-test.jpg', { type: 'image/jpeg' });
      const { unmount } = render(<ImageUpload {...defaultProps} imageFile={mockFile} />);

      // Verify URL was created
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);

      // Unmount component
      unmount();

      // Verify URL was revoked
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url-12345');
    });

    it('cleans up object URL when file changes', () => {
      const mockFile1 = new File(['dummy1'], 'file1.jpg', { type: 'image/jpeg' });
      const mockFile2 = new File(['dummy2'], 'file2.jpg', { type: 'image/jpeg' });

      const { rerender } = render(<ImageUpload {...defaultProps} imageFile={mockFile1} />);

      // Verify first URL was created
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile1);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);

      // Change file
      rerender(<ImageUpload {...defaultProps} imageFile={mockFile2} />);

      // Verify old URL was revoked and new URL was created
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url-12345');
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile2);
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    });
  });

  // Tests for remove image functionality
  describe('Remove Image Functionality', () => {
    it('displays remove button when image is selected and not disabled', () => {
      const mockFile = new File(['dummy'], 'removable.jpg', { type: 'image/jpeg' });
      render(<ImageUpload {...defaultProps} imageFile={mockFile} disabled={false} />);

      // Remove button should be present
      const removeButton = screen.getByLabelText('Remove image');
      expect(removeButton).toBeInTheDocument();
    });

    it('does not display remove button when disabled', () => {
      const mockFile = new File(['dummy'], 'non-removable.jpg', { type: 'image/jpeg' });
      render(<ImageUpload {...defaultProps} imageFile={mockFile} disabled={true} />);

      // Remove button should not be present when disabled
      expect(screen.queryByLabelText('Remove image')).not.toBeInTheDocument();
    });

    it('calls onClearImage when remove button is clicked', () => {
      const mockFile = new File(['dummy'], 'to-remove.jpg', { type: 'image/jpeg' });
      render(<ImageUpload {...defaultProps} imageFile={mockFile} />);

      // Click remove button
      const removeButton = screen.getByLabelText('Remove image');
      fireEvent.click(removeButton);

      // Verify onClearImage was called
      expect(mockOnClearImage).toHaveBeenCalledTimes(1);
      // Verify onChange was not called (since we're using onClearImage now)
      expect(mockOnChange).not.toHaveBeenCalled();
    });

    it('does not display remove button when no image is selected', () => {
      render(<ImageUpload {...defaultProps} imageFile={null} />);

      // Remove button should not be present when no image is selected
      expect(screen.queryByLabelText('Remove image')).not.toBeInTheDocument();
    });
  });
});
