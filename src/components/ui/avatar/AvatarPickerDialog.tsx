import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AvatarSelector } from './AvatarSelector';

interface AvatarPickerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentAvatarUrl?: string | null;
  onAvatarChange: (url: string) => Promise<void> | void;
}

export function AvatarPickerDialog({
  isOpen,
  onOpenChange,
  userId,
  currentAvatarUrl,
  onAvatarChange,
}: AvatarPickerDialogProps) {
  const handleAvatarChange = async (url: string) => {
    await onAvatarChange(url);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[425px]"
        aria-describedby="avatar-picker-description" // for screen readers
      >
        <DialogHeader>
          <DialogTitle>Choose your avatar</DialogTitle>
          <DialogDescription id="avatar-picker-description">
            Select an avatar image from the options below to personalize your profile.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <AvatarSelector
            userId={userId}
            currentAvatarUrl={currentAvatarUrl}
            onAvatarChange={handleAvatarChange}
            size="lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
