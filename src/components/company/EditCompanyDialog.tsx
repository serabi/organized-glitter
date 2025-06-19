import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { companyService } from '@/services';
import FormField from '@/components/projects/form/FormField';

interface EditCompanyDialogProps {
  company: {
    id: string;
    name: string;
    website_url: string | null;
  };
  onCompanyUpdated: () => void;
}

const EditCompanyDialog = ({ company, onCompanyUpdated }: EditCompanyDialogProps) => {
  const [companyName, setCompanyName] = useState(company.name);
  const [companyUrl, setCompanyUrl] = useState(company.website_url || '');
  const [urlError, setUrlError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Update state when prop changes
    setCompanyName(company.name);
    setCompanyUrl(company.website_url || '');
  }, [company]);

  const validateUrl = (url: string) => {
    if (!url) return true; // Empty URL is valid (optional field)

    try {
      new URL(url);
      setUrlError('');
      return true;
    } catch (e) {
      setUrlError('Please enter a valid URL (e.g., https://example.com)');
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setCompanyUrl(url);
    if (url) validateUrl(url);
    else setUrlError('');
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyName.trim()) {
      toast({
        title: 'Error',
        description: 'Company name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL if provided
    if (companyUrl && !validateUrl(companyUrl)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await companyService.updateCompany(
        company.id,
        companyName,
        companyUrl || null,
        { toast }
      );

      if (response.status === 'success') {
        setIsDialogOpen(false);
        onCompanyUpdated();
      }
    } catch (error) {
      console.error('Error updating company:', error);
      toast({
        title: 'Error',
        description: 'Could not update company',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-primary hover:bg-primary/10 hover:text-primary"
        >
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Company</DialogTitle>
          <DialogDescription>
            Update the name and website URL of this diamond painting company.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleUpdateCompany}>
          <div className="space-y-4 py-4">
            <FormField id="edit-company-name" label="Company Name" required={true}>
              <Input
                id="edit-company-name"
                placeholder="Enter company name"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </FormField>

            <FormField id="edit-company-url" label="Website URL" error={urlError}>
              <Input
                id="edit-company-url"
                placeholder="https://www.example.com"
                value={companyUrl}
                onChange={handleUrlChange}
                disabled={isSubmitting}
                type="url"
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCompanyDialog;
