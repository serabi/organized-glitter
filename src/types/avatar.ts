export type AvatarType = 'upload' | 'initials';

export interface AvatarConfig {
  type: AvatarType;
  uploadUrl?: string;
  initials?: string;
  colorIndex?: number;
}

export interface AvatarManagerProps {
  currentAvatar?: string;
  currentConfig?: AvatarConfig;
  onAvatarUpdate: (config: AvatarConfig) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
  userEmail?: string;
}

export interface CropModalProps {
  file: File;
  imageUrl?: string; // Optional pre-created blob URL
  onCropComplete: (croppedImageUrl: string) => void;
  onCancel: () => void;
}

export interface AvatarDisplayProps {
  config?: AvatarConfig;
  size?: number;
  className?: string;
  fallbackInitials?: string;
}

// Color palette for colored circle avatars
export const AVATAR_COLORS = [
  '#ff6b6b', // Red
  '#4ecdc4', // Teal
  '#45b7d1', // Blue
  '#96ceb4', // Green
  '#feca57', // Yellow
  '#ff9ff3', // Pink
  '#54a0ff', // Light Blue
  '#5f27cd', // Purple
  '#00d2d3', // Cyan
  '#ff9f43', // Orange
];
