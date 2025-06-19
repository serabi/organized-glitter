import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ContentTextareaProps {
  value: string;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string; // Added error prop
}

export const ContentTextarea: React.FC<ContentTextareaProps> = ({
  value,
  disabled,
  onChange,
  error, // Destructure error prop
}) => {
  return (
    <div>
      <Label htmlFor="note-content">Caption</Label>
      <Textarea
        id="note-content"
        placeholder="Add a caption for your progress picture..."
        value={value}
        onChange={onChange}
        rows={3}
        // removed required
        disabled={disabled}
        className={cn(error && 'border-red-500')} // Added error styling
        aria-invalid={error ? 'true' : 'false'} // Accessibility
        aria-describedby={error ? 'content-error' : undefined} // Accessibility
      />
      {error && (
        <p id="content-error" className="mt-1 text-sm text-red-500">
          {error}
        </p>
      )}{' '}
      {/* Display error message */}
    </div>
  );
};
