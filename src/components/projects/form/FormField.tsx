import React from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
}

const FormField = ({ id, label, children, required = false, error }: FormFieldProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default FormField;
