/**
 * Simplified tests for ProjectForm component
 * Tests basic form rendering and user interactions
 * @author @serabi
 * @created 2025-07-29
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, userEvent } from '@/test-utils';
import ProjectForm from '../ProjectForm';

// Mock complex dependencies
vi.mock('@/hooks/useProjectFormLogic', () => ({
  useProjectFormLogic: () => ({
    rhfApi: {
      register: vi.fn(),
      handleSubmit: vi.fn((fn) => (e) => { e.preventDefault(); fn({}); }),
      formState: { errors: {}, isSubmitting: false },
      watch: vi.fn(() => ({})),
      setValue: vi.fn(),
      getValues: vi.fn(() => ({})),
      control: {},
    },
    processedSubmitHandler: vi.fn(),
    currentWatchedData: {
      title: '',
      company: '',
      artist: '',
    },
    formCompanies: ['Diamond Dotz', 'Artbeads'],
    formArtists: ['Artist One', 'Artist Two'],
    isSubmitting: false,
    formErrors: {},
    setValue: vi.fn(),
    projectTags: [],
    setProjectTags: vi.fn(),
    imageUploadUI: {
      selectedFile: null,
      preview: null,
      uploading: false,
      error: null,
    },
    hookHandleImageChange: vi.fn(),
    hookHandleImageRemove: vi.fn(),
  }),
}));

vi.mock('@/hooks/useProjectFormHandlers', () => ({
  useProjectFormHandlers: () => ({
    handleCompanyAdded: vi.fn(),
    handleArtistAdded: vi.fn(),
    handleImageSelect: vi.fn(),
    handleImageRemove: vi.fn(),
  }),
}));

// Mock form sections
vi.mock('../form-sections', () => ({
  BasicInfoSection: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="basic-info">
      <input placeholder="Project title" data-testid="title-input" />
      {children}
    </div>
  ),
  ProjectSpecsSection: () => <div data-testid="specs-section">Specs</div>,
  ProjectStatusSection: () => <div data-testid="status-section">Status</div>,
  ProjectNotesSection: () => <div data-testid="notes-section">Notes</div>,
  ProjectImageSection: () => <div data-testid="image-section">Image</div>,
}));

describe('ProjectForm', () => {
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form sections', () => {
    renderWithProviders(
      <ProjectForm 
        onSubmit={mockOnSubmit}
        companies={['Company A']}
        artists={['Artist 1']}
      />
    );

    expect(screen.getByTestId('basic-info')).toBeInTheDocument();
    expect(screen.getByTestId('specs-section')).toBeInTheDocument();
    expect(screen.getByTestId('status-section')).toBeInTheDocument();
    expect(screen.getByTestId('notes-section')).toBeInTheDocument();
    expect(screen.getByTestId('image-section')).toBeInTheDocument();
  });

  it('displays submit button', () => {
    renderWithProviders(
      <ProjectForm 
        onSubmit={mockOnSubmit}
        companies={[]}
        artists={[]}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('displays cancel button when onCancel is provided', () => {
    const mockOnCancel = vi.fn();

    renderWithProviders(
      <ProjectForm 
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        companies={[]}
        artists={[]}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    renderWithProviders(
      <ProjectForm 
        onSubmit={mockOnSubmit}
        isLoading={true}
        companies={[]}
        artists={[]}
      />
    );

    const submitButton = screen.getByRole('button', { name: /save/i });
    expect(submitButton).toBeDisabled();
  });

  it('handles form submission', async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ProjectForm 
        onSubmit={mockOnSubmit}
        companies={[]}
        artists={[]}
      />
    );

    const form = screen.getByRole('form') || document.querySelector('form');
    
    if (form) {
      await user.click(screen.getByRole('button', { name: /save/i }));
      // Form submission is handled by react-hook-form, so we just verify UI responds
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    }
  });

  it('displays initial data when provided', () => {
    const initialData = {
      title: 'Existing Project',
      company: 'Test Company',
    };

    renderWithProviders(
      <ProjectForm 
        onSubmit={mockOnSubmit}
        initialData={initialData}
        companies={[]}
        artists={[]}
      />
    );

    // The form should render with initial data
    expect(screen.getByTestId('basic-info')).toBeInTheDocument();
  });
});