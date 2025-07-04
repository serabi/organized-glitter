import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, FileText, Loader2 } from 'lucide-react';
import EditTagDialog from './EditTagDialog';
import { Link } from 'react-router-dom';
import type { Tag } from '@/types/tag';
import { useDeleteTag } from '@/hooks/mutations/useDeleteTag';
import { useTagStats } from '@/hooks/queries/useTagStats';
import { secureLogger } from '@/utils/secureLogger';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TagTableProps {
  tags: Tag[];
  loading: boolean;
}

// Skeleton component for the projects column while loading
const ProjectCountSkeleton = () => (
  <div className="flex items-center space-x-2">
    <Skeleton className="h-4 w-4 rounded" />
    <Skeleton className="h-4 w-16" />
  </div>
);

// Skeleton row for the entire table while loading
const TagTableRowSkeleton = () => (
  <TableRow>
    <TableCell>
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-3 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </TableCell>
    <TableCell>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded border" />
        <Skeleton className="h-4 w-16" />
      </div>
    </TableCell>
    <TableCell>
      <ProjectCountSkeleton />
    </TableCell>
    <TableCell>
      <Skeleton className="h-4 w-20" />
    </TableCell>
    <TableCell>
      <div className="flex space-x-1">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </TableCell>
  </TableRow>
);

const TagTable = ({ tags, loading }: TagTableProps) => {
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const deleteTagMutation = useDeleteTag();

  // Use the optimized tag stats hook
  const tagIds = tags.map(tag => tag.id);
  const { data: projectCounts, isLoading: loadingCounts, error: statsError } = useTagStats(tagIds);

  // Log any errors for debugging but don't break the UI
  if (statsError) {
    secureLogger.error('[TagTable] Tag stats error:', { statsError });
  }

  const handleDeleteTag = (tag: Tag) => {
    setTagToDelete(tag);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteTag = async () => {
    if (!tagToDelete) return;

    deleteTagMutation.mutate(
      { id: tagToDelete.id, name: tagToDelete.name },
      {
        onSettled: () => {
          setShowDeleteConfirmDialog(false);
          setTagToDelete(null);
        },
      }
    );
  };

  // Show skeleton loading for table structure while loading tags
  if (loading) {
    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Projects</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Show 5 skeleton rows while loading */}
            {Array.from({ length: 5 }).map((_, index) => (
              <TagTableRowSkeleton key={`skeleton-${index}`} />
            ))}
          </TableBody>
        </Table>
      </>
    );
  }

  if (tags.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">You haven't created any tags yet.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tag Name</TableHead>
            <TableHead>Color</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead>Created Date</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.map(tag => (
            <TableRow key={tag.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded border" style={{ backgroundColor: tag.color }} />
                  <span className="font-mono text-sm text-muted-foreground">{tag.color}</span>
                </div>
              </TableCell>
              <TableCell>
                {loadingCounts ? (
                  <ProjectCountSkeleton />
                ) : projectCounts[tag.id] > 0 ? (
                  <Link
                    to={`/dashboard?tag=${encodeURIComponent(tag.name)}`}
                    className="flex items-center text-primary transition-colors hover:underline"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    {projectCounts[tag.id]} {projectCounts[tag.id] === 1 ? 'project' : 'projects'}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">No projects</span>
                )}
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {new Date(tag.createdAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <EditTagDialog tag={tag} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteTag(tag)}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {tagToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the tag "
                {tagToDelete.name}" and remove it from all associated projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setTagToDelete(null);
                  setShowDeleteConfirmDialog(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeleteTag} disabled={deleteTagMutation.isPending}>
                {deleteTagMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default TagTable;
