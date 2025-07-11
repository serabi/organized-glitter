/**
 * Company list tab component with pagination support
 * @author @serabi
 * @created 2025-01-08
 */

import { useState } from 'react';
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
import { Loader2, Link2, Search } from 'lucide-react';
import { useCompanies } from '@/hooks/queries/useCompanies';
import { useAuth } from '@/hooks/useAuth';
import ProjectPagination from '@/components/ui/ProjectPagination';

/**
 * Company list tab component with server-side pagination
 * @author @serabi
 * @returns JSX element containing paginated company list
 */
const CompanyListTab = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const { data, isLoading } = useCompanies({
    userId: user?.id,
    currentPage,
    pageSize,
  });

  const companies = data?.companies || [];
  const totalItems = data?.totalItems || 0;
  const totalPages = data?.totalPages || 0;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="dark:glass-card rounded-lg bg-diamond-100 text-diamond-900 shadow dark:text-foreground">
      <div className="border-b border-gray-200 p-6">
        <h2 className="text-xl font-semibold">Company List Management</h2>
        <p className="text-muted-foreground">
          Add, edit or remove diamond painting companies in your stash.
        </p>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : companies.length > 0 ? (
          <div className="mb-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>View Kits</TableHead>
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
                      <Link
                        to={`/dashboard?company=${encodeURIComponent(company.name)}`}
                        className="flex items-center text-primary hover:underline"
                      >
                        <Search className="mr-1 h-4 w-4" />
                        View Kits from {company.name}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="mt-6">
                <ProjectPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 py-4 text-center">
            <p className="text-muted-foreground">You haven't added any companies yet.</p>
          </div>
        )}

        <div className="flex justify-center">
          <Link to="/companies">
            <Button>Manage Companies</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CompanyListTab;
