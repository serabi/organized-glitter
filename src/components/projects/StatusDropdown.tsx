// No React import needed with modern JSX transform
import { ProjectStatus } from '@/types/project';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProjectStatus } from '@/hooks/useProjectStatus';

interface StatusDropdownProps {
  currentStatus: ProjectStatus;
  onStatusChange: (status: ProjectStatus) => void;
}

const StatusDropdown = ({ currentStatus, onStatusChange }: StatusDropdownProps) => {
  const { getStatusLabel } = useProjectStatus();

  // Map the color classes to match the dropdown's design
  // Using the 12-color palette for consistent tag colors
  const getDropdownStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      wishlist: 'text-blue-600 dark:text-blue-400', // #3B82F6 Blue
      purchased: 'text-purple-600 dark:text-purple-400', // #8B5CF6 Purple
      stash: 'text-amber-600 dark:text-amber-400', // #F59E0B Amber
      progress: 'text-emerald-600 dark:text-emerald-400', // #10B981 Green
      completed: 'text-indigo-600 dark:text-indigo-400', // #6366F1 Indigo
      destashed: 'text-rose-600 dark:text-rose-400', // #F43F5E Rose
      archived: 'text-gray-600 dark:text-gray-400', // #6B7280 Gray
    };
    return colorMap[status] || '';
  };

  return (
    <div className="w-full">
      <Select value={currentStatus} onValueChange={value => onStatusChange(value as ProjectStatus)}>
        <SelectTrigger className={`${getDropdownStatusColor(currentStatus)} font-medium`}>
          <SelectValue placeholder={getStatusLabel(currentStatus)} />
        </SelectTrigger>
        <SelectContent className="bg-popover dark:bg-gray-800 dark:text-gray-100">
          <SelectItem value="wishlist">Wishlist</SelectItem>
          <SelectItem value="purchased">Purchased - Not Received</SelectItem>
          <SelectItem value="stash">In Stash</SelectItem>
          <SelectItem value="progress">In Progress</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
          <SelectItem value="archived">Archived</SelectItem>
          <SelectItem value="destashed">Destashed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default StatusDropdown;
