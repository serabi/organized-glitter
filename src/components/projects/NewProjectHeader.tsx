import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const NewProjectHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="mb-8 flex flex-col items-start justify-between md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold">Add New Project</h1>
        <p className="mt-1 text-muted-foreground">
          Create a new diamond painting project in your collection
        </p>
      </div>
      <Button variant="outline" onClick={() => navigate('/dashboard')} className="mt-4 md:mt-0">
        Cancel
      </Button>
    </div>
  );
};

export default NewProjectHeader;
