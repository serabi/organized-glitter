import React from 'react';
import { ArrowUpAZ, ArrowDownAZ } from 'lucide-react';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortField: string;
  currentSortDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSortField,
  currentSortDirection,
  onSort,
}) => {
  const handleClick = () => {
    onSort(sortKey);
  };

  // Map sort keys to backend sort fields for comparison
  const sortKeyMapping: Record<string, string> = {
    title: 'kit_name',
    datePurchased: 'date_purchased',
    dateReceived: 'date_received',
    dateStarted: 'date_started',
    dateCompleted: 'date_finished',
  };

  const mappedSortKey = sortKeyMapping[sortKey] || 'last_updated';
  const isActive = currentSortField === mappedSortKey;

  const renderSortIcon = () => {
    if (!isActive) return null;

    return currentSortDirection === 'asc' ? (
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
