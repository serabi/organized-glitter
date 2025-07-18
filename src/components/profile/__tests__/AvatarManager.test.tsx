import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AvatarManager } from '../AvatarManager';
import { useImageUpload } from '@/hooks/useImageUpload';

// Mock the hooks and dependencies
vi.mock('@/hooks/useImageUpload');
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    authStore: {
      record: { id: 'test-user-id' },
    },
  },
}));
vi.mock('@/utils/posthog', () => ({
  trackEvent: vi.fn(),
  captureException: vi.fn(),
}));

describe('AvatarManager', () => {
  it('should initialize useImageUpload with correct parameters for avatar context', () => {
    const mockUseImageUpload = vi.mocked(useImageUpload);
    mockUseImageUpload.mockReturnValue({
      file: null,
      preview: null,
      uploading: false,
      error: null,
      processedFile: null,
      isReplacement: false,
      wasRemoved: false,
      isCompressing: false,
      compressionProgress: null,
      handleImageChange: vi.fn(),
      handleImageRemove: vi.fn(),
      upload: vi.fn(),
    });

    render(
      <AvatarManager
        currentAvatar={null}
        currentConfig={null}
        onAvatarUpdate={vi.fn()}
        onClose={vi.fn()}
        isOpen={true}
        userEmail="test@example.com"
      />
    );

    // Verify that useImageUpload is called with the correct parameters
    expect(mockUseImageUpload).toHaveBeenCalledWith('avatars', 'avatar');
  });
});
