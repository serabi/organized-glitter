import { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Archive, Trash2 } from 'lucide-react';

interface EditProjectHeaderProps {
  projectId: string | undefined;
  projectTitle: string;
  submitting: boolean;
  onArchive: () => void;
  onDelete: () => void;
}

export const EditProjectHeader: FC<EditProjectHeaderProps> = ({
  projectId,
  projectTitle,
  submitting,
  onArchive,
  onDelete,
}) => {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <Button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="mb-2 inline-flex items-center"
          variant="ghost"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Project
        </Button>
        <h1 className="text-2xl font-bold">Edit Project: {projectTitle}</h1>
      </div>
      <div className="flex gap-2">
        <Button
          onClick={onArchive}
          variant="outline"
          size="sm"
          disabled={submitting}
          className="inline-flex items-center"
        >
          <Archive className="mr-1 h-4 w-4" />
          Archive
        </Button>
        <Button
          onClick={onDelete}
          variant="destructive"
          size="sm"
          disabled={submitting}
          className="inline-flex items-center"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  );
};
