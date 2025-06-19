import React, { useState } from 'react';
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
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import FormField from '@/components/projects/form/FormField';

interface AddCompanyDialogProps {
  onCompanyAdded: () => void;
}

const AddCompanyDialog = ({ onCompanyAdded }: AddCompanyDialogProps) => {
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyUrl, setNewCompanyUrl] = useState('');
  const [urlError, setUrlError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

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
    setNewCompanyUrl(url);
    if (url) validateUrl(url);
    else setUrlError('');
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    if (!newCompanyName.trim()) {
      toast({
        title: 'Error',
        description: 'Company name cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    // Validate URL if provided
    if (newCompanyUrl && !validateUrl(newCompanyUrl)) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!pb.authStore.isValid) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to add companies',
          variant: 'destructive',
        });
        return;
      }

      const user = pb.authStore.model;
      if (!user) {
        toast({
          title: 'Authentication required',
          description: 'Please sign in to add companies',
          variant: 'destructive',
        });
        return;
      }

      // Check if company already exists
      const existingCompanies = await pb.collection('companies').getList(1, 1, {
        filter: `user = "${user.id}" && name = "${newCompanyName.trim()}"`,
      });

      if (existingCompanies.items.length > 0) {
        toast({
          title: 'Error',
          description: 'A company with this name already exists',
          variant: 'destructive',
        });
        return;
      }

      // Add new company
      await pb.collection('companies').create({
        name: newCompanyName.trim(),
        user: user.id,
        website_url: newCompanyUrl.trim() || null,
      });

      toast({
        title: 'Success',
        description: `${newCompanyName} has been added to your companies`,
      });

      // Reset form
      setNewCompanyName('');
      setNewCompanyUrl('');
      setUrlError('');
      setIsDialogOpen(false);
      onCompanyAdded();
    } catch (error) {
      console.error('Error adding company:', error);
      toast({
        title: 'Error',
        description: 'Could not add company',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Add Company</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Company</DialogTitle>
          <DialogDescription>
            Enter the name and website URL of the diamond painting company you want to add to your
            list.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAddCompany}>
          <div className="space-y-4 py-4">
            <FormField id="company-name" label="Company Name" required={true}>
              <Input
                id="company-name"
                placeholder="Enter company name"
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
            </FormField>

            <FormField id="company-url" label="Website URL" error={urlError}>
              <Input
                id="company-url"
                placeholder="https://www.example.com"
                value={newCompanyUrl}
                onChange={handleUrlChange}
                disabled={isSubmitting}
                type="url"
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Company
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyDialog;
