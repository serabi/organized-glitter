import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import SearchProjects from '@/components/dashboard/SearchProjects';
import { useFilters, useFilterHelpers } from '@/contexts/FilterContext';

const DashboardHeader = () => {
  const { filters } = useFilters();
  const { updateSearch } = useFilterHelpers();

  return (
    <div className="mb-8 flex flex-col gap-4">
      {/* Title Row */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">Manage and track your collection</p>
        </div>
        <div className="flex flex-row gap-2">
          <Button asChild>
            <Link to="/projects/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Project
            </Link>
          </Button>
        </div>
      </div>

      {/* Search Row */}
      <div className="flex w-full justify-center md:justify-start">
        <div className="w-full max-w-md">
          <SearchProjects
            searchTerm={filters.searchTerm}
            onSearchChange={updateSearch}
            isPending={false}
          />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
