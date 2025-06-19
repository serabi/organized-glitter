import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Loader2 } from 'lucide-react';
import { useCreateCompany } from '@/hooks/mutations/useCreateCompany';
import FormField from './FormField';

interface CompanySelectProps {
  value: string;
  onChange: (value: string) => void;
  companies?: string[];
  onCompanyAdded?: (newCompany: string) => Promise<void> | void;
  disabled?: boolean;
}

const CompanySelect = React.memo(
  ({ value, onChange, companies = [], onCompanyAdded, disabled = false }: CompanySelectProps) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyUrl, setNewCompanyUrl] = useState('');
    const createCompanyMutation = useCreateCompany();

    // Memoize computed values
    const isDisabled = useMemo(
      () => disabled || createCompanyMutation.isPending,
      [disabled, createCompanyMutation.isPending]
    );

    // Memoize companies array to avoid unnecessary re-renders
    const normalizedCompanies = useMemo(() => {
      if (!Array.isArray(companies)) {
        console.warn('CompanySelect received invalid companies list:', companies);
        return [];
      }
      // Additional safety check for each company item
      return companies
        .filter(company => company && typeof company === 'string')
        .map(company => company.toLowerCase().trim());
    }, [companies]);

    const handleAddCompany = useCallback(
      async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling up to parent forms

        // Prevent duplicate submissions
        if (createCompanyMutation.isPending) {
          return;
        }

        const companyName = newCompanyName.trim();
        if (!companyName) {
          return;
        }

        // Check if company already exists (client-side check)
        const companyNameLower = companyName.toLowerCase();
        if (normalizedCompanies.includes(companyNameLower)) {
          return;
        }

        // Create company using React Query mutation
        createCompanyMutation.mutate(
          {
            name: companyName,
            website_url: newCompanyUrl.trim() || undefined,
          },
          {
            onSuccess: newCompany => {
              // Set the form data to use the new company
              onChange(newCompany.name);

              // Notify parent component if callback provided
              if (onCompanyAdded) {
                onCompanyAdded(newCompany.name);
              }

              // Reset and close dialog
              setNewCompanyName('');
              setNewCompanyUrl('');
              setIsDialogOpen(false);
            },
          }
        );
      },
      [
        createCompanyMutation,
        newCompanyName,
        newCompanyUrl,
        normalizedCompanies,
        onChange,
        onCompanyAdded,
      ]
    );

    return (
      <>
        <FormField id="company" label="Company">
          <div className="flex gap-2">
            <div className="flex-1">
              <Select value={value} onValueChange={onChange} disabled={isDisabled}>
                <SelectTrigger className="w-full" disabled={isDisabled}>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent className="bg-popover dark:bg-gray-800 dark:text-gray-100">
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  {Array.isArray(companies) && companies.length > 0 ? (
                    companies
                      .filter(company => company && typeof company === 'string')
                      .map(company => (
                        <SelectItem key={company} value={company}>
                          {company}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="no-companies" disabled>
                      No companies found (click + to add)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-2"
              disabled={isDisabled}
              onClick={e => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </FormField>

        {/* Use a dialog that won't submit the parent form when interacting with it */}
        <Dialog
          open={isDialogOpen}
          onOpenChange={open => {
            setIsDialogOpen(open);
            // If closing the dialog, ensure we don't propagate the click event
            if (!open) {
              // Small delay to ensure the click doesn't propagate
              setTimeout(() => {}, 50);
            }
          }}
        >
          <DialogContent className="dark:bg-gray-800 dark:text-gray-100">
            <DialogHeader>
              <DialogTitle>Add New Company</DialogTitle>
              <DialogDescription className="dark:text-gray-300">
                Enter the name and website URL of the diamond painting company you want to add to
                your list.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddCompany} onClick={e => e.stopPropagation()}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-company-name">Company Name</Label>
                  <Input
                    id="new-company-name"
                    placeholder="Enter company name"
                    value={newCompanyName}
                    onChange={e => setNewCompanyName(e.target.value)}
                    disabled={createCompanyMutation.isPending}
                    className="bg-background dark:text-foreground"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-company-url">Website URL</Label>
                  <Input
                    id="new-company-url"
                    placeholder="https://www.example.com"
                    value={newCompanyUrl}
                    onChange={e => setNewCompanyUrl(e.target.value)}
                    disabled={createCompanyMutation.isPending}
                    type="url"
                    className="bg-background dark:text-foreground"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  disabled={createCompanyMutation.isPending}
                  onClick={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddCompany(e as unknown as React.FormEvent);
                  }}
                >
                  {createCompanyMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Company
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

export default CompanySelect;
