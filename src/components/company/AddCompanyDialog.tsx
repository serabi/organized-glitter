/**
 * @fileoverview Add Company Dialog Component
 *
 * Modal dialog for adding new companies to the user's collection.
 * Features secure duplicate validation and URL validation with user-friendly
 * error handling. Uses FilterBuilder utility for secure PocketBase queries.
 *
 * @author serabi
 * @version 1.0.0
 * @since 2024-06-29
 */

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
import { createFilter } from '@/utils/filterBuilder';
import FormField from '@/components/projects/form/FormField';
import { logger } from '@/utils/logger';

/**
 * Props interface for the AddCompanyDialog component
 *
 * @interface AddCompanyDialogProps
 * @property {() => void} onCompanyAdded - Callback function triggered when a company is successfully added
 */
interface AddCompanyDialogProps {
  onCompanyAdded: () => void;
}

/**
 * AddCompanyDialog Component
 *
 * Modal dialog component for adding new companies to the user's account.
 * Provides form validation, duplicate checking, and secure data submission.
 *
 * Key Features:
 * - Company name and optional URL input fields
 * - Real-time URL validation with user feedback
 * - Secure duplicate company name validation
 * - User-friendly error handling and loading states
 * - Automatic dialog closure on successful submission
 *
 * Security Features:
 * - Uses FilterBuilder utility for secure PocketBase queries
 * - Prevents SQL injection through parameterized filtering
 * - User-scoped duplicate validation (only checks user's companies)
 *
 * @component
 * @param {AddCompanyDialogProps} props - Component properties
 * @returns {JSX.Element} Rendered add company modal dialog
 *
 * @example
 * ```tsx
 * <AddCompanyDialog
 *   onCompanyAdded={() => {
 *     // Refresh companies list
 *     refetchCompanies();
 *   }}
 * />
 * ```
 */
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

  /**
   * Handles company creation with secure validation and duplicate checking
   *
   * Validates form data, checks for duplicate company names, and creates
   * a new company record in PocketBase. Uses FilterBuilder utility for
   * secure duplicate validation queries.
   *
   * Validation Steps:
   * 1. Prevents duplicate form submissions
   * 2. Validates required company name field
   * 3. Validates optional URL format if provided
   * 4. Checks user authentication status
   * 5. Performs secure duplicate name validation
   * 6. Creates company record and provides user feedback
   *
   * Security Features:
   * - Uses FilterBuilder utility for secure PocketBase queries
   * - Prevents SQL injection through parameterized filtering
   * - User-scoped duplicate validation (only checks user's companies)
   * - Authentication validation before data operations
   *
   * @async
   * @function
   * @param {React.FormEvent} e - Form submission event
   * @returns {Promise<void>} Resolves when company creation is complete
   *
   * @throws {Error} Logs errors to console and shows user-friendly toast messages
   *
   * @example
   * ```tsx
   * // Triggered by form submission
   * <form onSubmit={handleAddCompany}>
   *   <input name="companyName" required />
   * </form>
   * ```
   */
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
        filter: createFilter().userScope(user.id).equals('name', newCompanyName.trim()).build(),
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
      setNewCompanyUrl('');
      setUrlError('');
      setIsDialogOpen(false);
      onCompanyAdded();
    } catch (error) {
      logger.error('Error adding company:', error);
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
