import React from 'react';
import { ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
import { SortConfig, SortKey } from '@/hooks/useAdvancedFilters';

interface SortableHeaderProps {
  label: string;
  sortKey: SortKey;
  sortConfig: SortConfig;
  onSort: (key: SortKey) => void;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  sortConfig,
  onSort,
}) => {
  const handleClick = () => {
    onSort(sortKey);
  };

  const renderSortIcon = () => {
    if (sortConfig.key !== sortKey) return null;

    return sortConfig.direction === 'asc' ? (
      <ArrowUpAZ className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDownAZ className="ml-1 h-4 w-4" />
    );
  };

  return (
    <div className="flex cursor-pointer items-center justify-center" onClick={handleClick}>
      {label}
      {renderSortIcon()}
    </div>
  );
};
