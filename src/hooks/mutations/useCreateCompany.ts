import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, CompaniesRecord } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { requireAuthenticatedUser } from '@/utils/authGuards';

interface CreateCompanyData {
  name: string;
  website_url?: string;
}

async function createCompany(data: CreateCompanyData, userId: string): Promise<CompaniesRecord> {
  const companyData: Partial<CompaniesRecord> = {
    name: data.name.trim(),
    user: userId,
    website_url: data.website_url?.trim() || undefined,
  };

  return await pb.collection(Collections.Companies).create(companyData);
}

export function useCreateCompany() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCompanyData) => {
      const userId = requireAuthenticatedUser(user);
      return createCompany(data, userId);
    },
    onSuccess: newCompany => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({
        queryKey: queryKeys.companies.lists(),
      });

      toast({
        title: 'Success',
        description: `Company "${newCompany.name}" has been added`,
      });
    },
    onError: (error: unknown) => {
      console.error('Error creating company:', error);

      // Handle specific error cases
      if (error && typeof error === 'object' && 'status' in error && error.status === 400) {
        toast({
          title: 'Company already exists',
          description: 'A company with this name already exists in your list',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not add company. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
