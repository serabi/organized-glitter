import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, User } from 'lucide-react';
import { uploadAvatar } from '@/utils/avatarUtils';
import { secureLogger } from '@/utils/secureLogger';

interface AvatarSelectorProps {
  userId: string;
  currentAvatarUrl?: string | null;
  onAvatarChange: (url: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function AvatarSelector({
  userId,
  currentAvatarUrl,
  onAvatarChange,
  className = '',
  size = 'md',
}: AvatarSelectorProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
    xl: 'h-40 w-40',
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', description: 'Please select a valid image file' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', description: 'Image size should be less than 5MB' });
      return;
    }

    setIsUploading(true);
    try {
      const url = await uploadAvatar(file, userId);

      if (url) {
        onAvatarChange(url);
        toast({ description: 'Avatar uploaded successfully' });
      }
    } catch (error) {
      secureLogger.error('Error uploading avatar:', error);
      toast({ variant: 'destructive', description: 'Failed to upload avatar' });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative">
        {currentAvatarUrl ? (
          <Avatar className={`${sizeClasses[size]} border-2 border-muted`}>
            <AvatarImage
              src={currentAvatarUrl || ''}
              alt="User avatar"
              className="h-full w-full object-cover"
            />
            <AvatarFallback className="bg-muted">
              <User className="h-1/2 w-1/2 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div
            className={`${sizeClasses[size]} flex items-center justify-center overflow-hidden rounded-full border-2 border-muted bg-muted`}
          >
            <User className="h-1/2 w-1/2 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="avatar-upload" className="text-sm font-medium">
            Upload a photo
          </Label>
          <div className="flex gap-2">
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
              ref={fileInputRef}
              disabled={isUploading}
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Choose File
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
