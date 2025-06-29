import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Link2, Loader2, FileText } from 'lucide-react';
import { pb } from '@/lib/pocketbase';
import { createFilter } from '@/utils/filterBuilder';
import EditCompanyDialog from './EditCompanyDialog';
import { Link } from 'react-router-dom';
import { CompaniesResponse } from '@/types/pocketbase.types';
import { useDeleteCompany } from '@/hooks/mutations/useDeleteCompany';
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

interface CompanyTableProps {
  companies: CompaniesResponse[];
  loading: boolean;
  onCompanyUpdated: () => void;
}

const CompanyTable = ({ companies, loading, onCompanyUpdated }: CompanyTableProps) => {
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompaniesResponse | null>(null);
  const deleteCompanyMutation = useDeleteCompany();

  useEffect(() => {
    const fetchProjectCounts = async () => {
      if (!companies.length) return;

      try {
        setLoadingCounts(true);

        if (!pb.authStore.isValid) return;

        const userId = pb.authStore.model?.id;
        if (!userId) return;

        // Fetch counts efficiently for each company using separate queries with pagination (1 item) to get totalItems count
        const counts: Record<string, number> = {};

        await Promise.all(
          companies.map(async company => {
            try {
              const result = await pb.collection('projects').getList(1, 1, {
                filter: createFilter()
                  .userScope(userId)
                  .company(company.id)
                  .build(),
                fields: 'id',
                requestKey: `company-count-${company.id}`,
              });
              counts[company.id] = result.totalItems;
            } catch (error) {
              console.error(`Error fetching count for company ${company.id}:`, error);
              counts[company.id] = 0;
            }
          })
        );

        setProjectCounts(counts);
      } catch (error) {
        console.error('Error fetching project counts:', error);
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchProjectCounts();
  }, [companies]);

  const handleDeleteCompany = (company: CompaniesResponse) => {
    setCompanyToDelete(company);
    setShowDeleteConfirmDialog(true);
  };

  const confirmDeleteCompany = async () => {
    if (!companyToDelete) return;

    deleteCompanyMutation.mutate(
      { id: companyToDelete.id, name: companyToDelete.name },
      {
        onSettled: () => {
          setShowDeleteConfirmDialog(false);
          setCompanyToDelete(null);
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-muted-foreground">You haven't added any companies yet.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company Name</TableHead>
            <TableHead>Website</TableHead>
            <TableHead>Projects</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map(company => (
            <TableRow key={company.id}>
              <TableCell className="font-medium">{company.name}</TableCell>
              <TableCell>
                {company.website_url ? (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-primary hover:underline"
                  >
                    <Link2 className="mr-1 h-4 w-4" />
                    {company.website_url}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">No website provided</span>
                )}
              </TableCell>
              <TableCell>
                {loadingCounts ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : projectCounts[company.id] ? (
                  <Link
                    to={`/dashboard?company=${encodeURIComponent(company.name)}`}
                    className="flex items-center text-primary hover:underline"
                  >
                    <FileText className="mr-1 h-4 w-4" />
                    {projectCounts[company.id]}{' '}
                    {projectCounts[company.id] === 1 ? 'project' : 'projects'}
                  </Link>
                ) : (
                  <span className="text-sm text-muted-foreground">No projects</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <EditCompanyDialog company={company} onCompanyUpdated={onCompanyUpdated} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCompany(company)}
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
      {companyToDelete && (
        <AlertDialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the company "
                {companyToDelete.name}" and remove it from all associated projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setCompanyToDelete(null);
                  setShowDeleteConfirmDialog(false);
                }}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteCompany}
                disabled={deleteCompanyMutation.isPending}
              >
                {deleteCompanyMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};

export default CompanyTable;
