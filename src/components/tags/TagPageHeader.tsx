/**
 * Tag Page Header Component
 * @author @serabi
 * @created 2025-01-09
 */

import React from 'react';
import AddTagDialog from './AddTagDialog';

/**
 * Props interface for the TagPageHeader component
 */
interface TagPageHeaderProps {
  onTagAdded: () => void;
}

/**
 * TagPageHeader Component
 *
 * Renders the header section for the Tag page including title and "Add Tag" dialog.
 */
const TagPageHeader = ({ onTagAdded }: TagPageHeaderProps) => {
  return (
    <div className="mb-8 flex flex-col items-start justify-between md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold">Tag List</h1>
        <p className="mt-1 text-muted-foreground">Manage your project tags</p>
      </div>

      <AddTagDialog onTagAdded={onTagAdded} />
    </div>
  );
};

export default React.memo(TagPageHeader);
