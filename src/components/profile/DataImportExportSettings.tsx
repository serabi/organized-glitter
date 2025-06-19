import React from 'react';
import { Button } from '@/components/ui/button';
import { useProjectExport } from '@/hooks/useProjectExport';
import { FileText, FileInput, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DataImportExportSettingsProps {
  profileLoading: boolean;
}

const DataImportExportSettings = ({ profileLoading }: DataImportExportSettingsProps) => {
  const { exportProjectsToCsv, loading: exportLoading } = useProjectExport();

  // Track component load
  React.useEffect(() => {
    // addBreadcrumb removed
  }, [profileLoading]);

  const handleExport = async () => {
    // Track export attempt
    // addBreadcrumb removed

    try {
      await exportProjectsToCsv();
      // Toast notification is already handled by useProjectExport hook
      // Track successful export
      // addBreadcrumb removed
    } catch (error) {
      console.error('Export failed:', error);
      // Error toast notification is already handled by useProjectExport hook
      // Track export failure
      // addBreadcrumb removed
    }
  };

  return (
    <div className="dark:glass-card mt-8 rounded-lg border border-border bg-card text-card-foreground shadow">
      <div className="border-b border-border p-6">
        <h2 className="text-xl font-semibold">Data Import/Export Settings</h2>
        <p className="text-muted-foreground">Manage importing and exporting your project data.</p>
      </div>

      <div className="p-6">
        <div className="grid gap-8">
          {/* Data Import/Export Grid - Two columns like Account Settings */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Data Import Section */}
            <div className="rounded-lg border border-border bg-background/50 p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex min-h-[5rem] flex-col justify-between">
                  <div>
                    <h3 className="mb-2 flex items-center text-lg font-medium">
                      <FileInput className="mr-2 h-5 w-5 text-primary" />
                      Data Import
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Import your project data from a CSV file using our dedicated Import page.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button asChild size="sm" className="shrink-0">
                    <Link to="/import" className="flex items-center">
                      Import from CSV <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Data Export Section */}
            <div className="rounded-lg border border-border bg-background/50 p-6 shadow-sm">
              <div className="flex flex-col gap-4">
                <div className="flex min-h-[5rem] flex-col justify-between">
                  <div>
                    <h3 className="mb-2 flex items-center text-lg font-medium">
                      <FileText className="mr-2 h-5 w-5 text-primary" />
                      Data Export
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Download your project data as a CSV file for backup and storage.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <Button
                    size="sm"
                    className="shrink-0"
                    onClick={handleExport}
                    disabled={profileLoading || exportLoading}
                  >
                    {exportLoading ? 'Preparing...' : 'Export to CSV'}{' '}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataImportExportSettings;
