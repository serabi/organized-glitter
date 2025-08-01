import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

const DashboardHeader = () => {
  return (
    <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold">My Diamond Paintings</h1>
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
  );
};

export default DashboardHeader;
