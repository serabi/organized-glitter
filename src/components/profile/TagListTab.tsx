import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';
import { useTags } from '@/hooks/queries/useTags';

const TagListTab = () => {
  const { data: tagsData = [], isLoading: loading } = useTags();
  const tags = Array.isArray(tagsData) ? tagsData : [];
  return (
    <div className="dark:glass-card rounded-lg bg-diamond-100 text-diamond-900 shadow dark:text-foreground">
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-xl font-semibold">Tag List Management</h2>
        <p className="text-muted-foreground">
          Add, edit or remove tags to organize your diamond painting projects.
        </p>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tags.length > 0 ? (
          <div className="mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tag Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>View Projects</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.map(tag => (
                  <TableRow key={tag.id}>
                    <TableCell className="font-medium">{tag.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: tag.color }}
                        />
                        <span className="text-sm text-muted-foreground">{tag.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/dashboard?tag=${encodeURIComponent(tag.name)}`}
                        className="flex items-center text-primary hover:underline"
                      >
                        <Search className="mr-1 h-4 w-4" />
                        View Projects with {tag.name}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="mb-6 py-4 text-center">
            <p className="text-muted-foreground">You haven't created any tags yet.</p>
          </div>
        )}

        <div className="flex justify-center">
          <Link to="/tags">
            <Button>Manage Tags</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default TagListTab;
