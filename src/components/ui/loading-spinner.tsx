import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function LoadingSpinner({ className, ...props }: LoadingSpinnerProps) {
  return (
    <div
      className={cn('h-8 w-8 animate-spin rounded-full border-b-2 border-primary', className)}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
