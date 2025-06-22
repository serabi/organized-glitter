/**
 * React Hook Form Test Component
 * 
 * This component tests the exact pattern used in the real form
 * to see if React Hook Form is causing the mobile freezing issue.
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Simple schema similar to the project form
const TestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

type TestFormValues = z.infer<typeof TestSchema>;

interface ReactHookFormTestProps {
  onSubmit?: (data: TestFormValues) => void;
  onChange?: (data: TestFormValues) => void;
  variant?: 'basic' | 'with-validation' | 'with-watch' | 'with-debounce';
}

export const ReactHookFormTest: React.FC<ReactHookFormTestProps> = ({
  onSubmit = () => {},
  onChange,
  variant = 'basic'
}) => {
  const form = useForm<TestFormValues>({
    resolver: zodResolver(TestSchema),
    defaultValues: {
      title: '',
      description: '',
    },
    mode: variant === 'with-validation' ? 'onChange' : 'onSubmit',
  });

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = form;

  // Watch for changes (this could be expensive on mobile)
  const watchedData = variant === 'with-watch' ? watch() : {};
  
  // Debounced watch (test if this helps)
  React.useEffect(() => {
    if (variant === 'with-debounce' && onChange) {
      const subscription = watch((data) => {
        const timeoutId = setTimeout(() => {
          onChange(data as TestFormValues);
        }, 300);
        return () => clearTimeout(timeoutId);
      });
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange, variant]);

  // Immediate onChange for comparison
  React.useEffect(() => {
    if ((variant === 'basic' || variant === 'with-validation' || variant === 'with-watch') && onChange) {
      const subscription = watch(onChange);
      return () => subscription.unsubscribe();
    }
  }, [watch, onChange, variant]);

  const handleFormSubmit = (data: TestFormValues) => {
    console.log('[RHF Test] Form submitted:', data);
    onSubmit(data);
  };

  return (
    <div style={{ padding: '20px', border: '2px solid #28a745', borderRadius: '8px', backgroundColor: '#f8fff9' }}>
      <h3>React Hook Form Test - {variant}</h3>
      
      <form onSubmit={handleSubmit(handleFormSubmit)} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Project Title:
          </label>
          <input
            {...register('title')}
            type="text"
            placeholder="Enter project title..."
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px', // Prevent iOS zoom
              border: errors.title ? '2px solid #dc3545' : '1px solid #ccc',
              borderRadius: '4px',
              touchAction: 'manipulation',
            }}
          />
          {errors.title && (
            <p style={{ color: '#dc3545', fontSize: '14px', margin: '5px 0 0 0' }}>
              {errors.title.message}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Description (optional):
          </label>
          <textarea
            {...register('description')}
            placeholder="Enter description..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              touchAction: 'manipulation',
              resize: 'vertical',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
            touchAction: 'manipulation',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Show current form state for debugging */}
      <div style={{ 
        padding: '10px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6',
        borderRadius: '4px',
        fontSize: '12px',
        fontFamily: 'monospace'
      }}>
        <strong>Form State:</strong>
        <pre style={{ margin: '5px 0 0 0', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify({
            values: variant === 'with-watch' ? watchedData : 'Not watched',
            errors: errors,
            isSubmitting,
            variant
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default ReactHookFormTest;