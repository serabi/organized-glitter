interface FormValidationErrorProps {
  error: string | null;
}

const FormValidationError = ({ error }: FormValidationErrorProps) => {
  if (!error) return null;

  return (
    <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>
  );
};

export default FormValidationError;
