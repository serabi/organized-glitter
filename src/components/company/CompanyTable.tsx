/**
 * @fileoverview Company Management Table Component
 *
 * Displays a comprehensive table of user companies with management capabilities
 * including viewing, editing, and deleting companies. Uses secure FilterBuilder
 * utility for PocketBase queries to count projects and ensure data integrity.
 *
 * @author @serabi
 * @version 1.0.0
 * @since 2024-06-29
 */

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
import { createLogger } from '@/utils/secureLogger';
import EditCompanyDialog from './EditCompanyDialog';
import { Link } from 'react-router-dom';
import { CompaniesResponse } from '@/types/pocketbase.types';
import { useDeleteCompany } from '@/hooks/mutations/useCompanyMutations';
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

/**
 * Props interface for the CompanyTable component
 *
 * @interface CompanyTableProps
 * @property {CompaniesResponse[]} companies - Array of company records from PocketBase
 * @property {boolean} loading - Whether the companies data is currently loading
 * @property {() => void} onCompanyUpdated - Callback function triggered when a company is updated or deleted
 */
interface CompanyTableProps {
  companies: CompaniesResponse[];
  loading: boolean;
  onCompanyUpdated: () => void;
}

/**
 * CompanyTable Component
 *
 * Renders a data table displaying user companies with management functionality.
 * Features include project count display, editing capabilities, and secure deletion.
 *
 * Key Features:
 * - Displays company name, project count, and management actions
 * - Uses secure FilterBuilder for user-scoped project counting
 * - Provides edit and delete functionality with confirmation dialogs
 * - Handles loading states and error scenarios gracefully
 *
 * Security Features:
 * - Uses FilterBuilder utility for secure PocketBase queries
 * - Prevents SQL injection through parameterized filtering
 * - Ensures user-scoped data access only
 *
 * @component
 * @param {CompanyTableProps} props - Component properties
 * @returns {JSX.Element} Rendered company management table
 *
 * @example
 * ```tsx
 * <CompanyTable
 *   companies={companiesData}
 *   loading={false}
 *   onCompanyUpdated={() => refetchCompanies()}
 * />
 * ```
 */
const CompanyTable = ({ companies, loading, onCompanyUpdated }: CompanyTableProps) => {
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<CompaniesResponse | null>(null);
  const deleteCompanyMutation = useDeleteCompany();

  useEffect(() => {
    /**
     * Fetches project counts for each company using secure queries
     *
     * Efficiently retrieves the number of projects associated with each company
     * using user-scoped filtering to ensure data security. Uses pagination with
     * limit 1 to get totalItems count without fetching actual project data.
     *
     * Security Features:
     * - Uses FilterBuilder utility for secure parameter injection
     * - Ensures user-scoped queries (users can only see their own data)
     * - Prevents SQL injection through parameterized filters
     *
     * Performance Features:
     * - Parallel processing of company count queries
     * - Minimal data transfer (only fetches IDs for counting)
     * - Request deduplication through requestKey
     *
     * @async
     * @function
     * @returns {Promise<void>} Resolves when all project counts are fetched
     *
     * @example
     * // Called automatically when companies array changes
     * // Updates projectCounts state with company ID -> count mapping
     */
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
                filter: createFilter().userScope(userId).company(company.id).build(),
                fields: 'id',
                requestKey: `company-count-${company.id}`,
              });
              counts[company.id] = result.totalItems;
            } catch (error) {
              const logger = createLogger('CompanyTable');
              logger.error(`Error fetching count for company ${company.id}:`, error);
              counts[company.id] = 0;
            }
          })
        );

        setProjectCounts(counts);
      } catch (error) {
        const logger = createLogger('CompanyTable');
        logger.error('Error fetching project counts:', error);
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
      { id: companyToDelete.id },
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
