import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Tag } from '@/types/tag';
import { cn } from '@/lib/utils';

interface TagBadgeProps {
  tag: Tag;
  onRemove?: () => void;
  removable?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TagBadge({
  tag,
  onRemove,
  removable = false,
  className,
  size = 'md',
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <Badge
      variant="secondary"
      className={cn(
        'inline-flex cursor-default items-center gap-1.5 border text-center font-medium',
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: `${tag.color}20`,
        borderColor: tag.color,
        color: tag.color,
      }}
    >
      <span>{tag.name}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 rounded-full p-0.5 hover:bg-current hover:bg-opacity-20"
          aria-label={`Remove ${tag.name} tag`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}
