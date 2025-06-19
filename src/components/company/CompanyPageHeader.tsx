import AddCompanyDialog from './AddCompanyDialog';

interface CompanyPageHeaderProps {
  onCompanyAdded: () => void;
}

const CompanyPageHeader = ({ onCompanyAdded }: CompanyPageHeaderProps) => {
  return (
    <div className="mb-8 flex flex-col items-start justify-between md:flex-row md:items-center">
      <div>
        <h1 className="text-3xl font-bold">Company List</h1>
        <p className="mt-1 text-muted-foreground">Manage your diamond painting companies</p>
      </div>

      <AddCompanyDialog onCompanyAdded={onCompanyAdded} />
    </div>
  );
};

export default CompanyPageHeader;
