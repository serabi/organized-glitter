import AddTagDialog from './AddTagDialog';

interface TagPageHeaderProps {
  onTagAdded: () => void;
}

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

export default TagPageHeader;
