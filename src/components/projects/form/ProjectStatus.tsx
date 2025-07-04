import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FormField from './FormField';

interface ProjectStatusProps {
  status: string;
  onStatusChange: (value: string) => void;
}

const ProjectStatus = ({ status, onStatusChange }: ProjectStatusProps) => {
  return (
    <FormField id="status" label="Status" required>
      <Select value={status} onValueChange={onStatusChange} required>
        <SelectTrigger id="status" className="bg-background dark:text-foreground">
          <SelectValue placeholder="Select status" />
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
    </FormField>
  );
};

export default ProjectStatus;
