import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ProjectNotFound = () => {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h1 className="mb-4 text-2xl font-bold">Project Not Found</h1>
      <p className="mb-6 text-muted-foreground">
        The project you're looking for doesn't exist or has been removed.
      </p>
      <Link to="/dashboard">
        <Button>Return to Dashboard</Button>
      </Link>
    </div>
  );
};

export default ProjectNotFound;
