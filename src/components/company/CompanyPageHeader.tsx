/**
 * Company Page Header Component
 * @author @serabi
 * @created 2025-01-09
 */

import React from 'react';
import AddCompanyDialog from './AddCompanyDialog';

/**
 * Props interface for the CompanyPageHeader component
 */
interface CompanyPageHeaderProps {
  onCompanyAdded: () => void;
}

/**
 * CompanyPageHeader Component
 *
 * Renders the header section for the Company page including title and "Add Company" dialog.
 */
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

export default React.memo(CompanyPageHeader);
