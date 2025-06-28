import React from 'react';
import { Button } from '@/components/ui/button';
import { Grid, List } from 'lucide-react';

type ViewType = 'grid' | 'list';

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewToggle = React.memo<ViewToggleProps>(({ activeView, onViewChange }) => {
  return (
    <div className="flex rounded-md shadow-sm">
      <Button
        variant={activeView === 'grid' ? 'default' : 'outline'}
        className={`rounded-l-md rounded-r-none px-3 py-2`}
        onClick={() => onViewChange('grid')}
      >
        <Grid className="h-4 w-4" />
        <span className="sr-only md:not-sr-only md:ml-2">Grid</span>
      </Button>
      <Button
        variant={activeView === 'list' ? 'default' : 'outline'}
        className={`rounded-l-none rounded-r-md px-3 py-2`}
        onClick={() => onViewChange('list')}
      >
        <List className="h-4 w-4" />
        <span className="sr-only md:not-sr-only md:ml-2">List</span>
      </Button>
    </div>
  );
});

ViewToggle.displayName = 'ViewToggle';

export default ViewToggle;
