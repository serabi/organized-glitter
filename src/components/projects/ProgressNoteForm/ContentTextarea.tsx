import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils'; // Import cn for conditional class names

interface ContentTextareaProps {
  value: string;
  disabled: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  error?: string; // Added error prop
}

/**
 * ContentTextarea component for the ProgressNoteForm.
 * Renders a textarea for note content with label and error display.
 * @param {ContentTextareaProps} props - The component props.
 * @param {string} props.value - The current value of the textarea.
 * @param {boolean} props.disabled - Whether the textarea is disabled.
 * @param {(e: React.ChangeEvent<HTMLTextAreaElement>) => void} props.onChange - Handler for textarea value changes.
 * @param {string} [props.error] - Optional error message to display.
 * @returns {JSX.Element} The rendered ContentTextarea component.
 */
export const ContentTextarea: React.FC<ContentTextareaProps> = ({
  value,
  disabled,
  onChange,
  error, // Destructure error prop
}) => {
  return (
    <div>
      <Label htmlFor="note-content">Caption (optional)</Label> {/* Updated Label */}
      <Textarea
        id="note-content"
        placeholder="Add a caption for your progress picture..."
        value={value}
        onChange={onChange}
        rows={3}
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
