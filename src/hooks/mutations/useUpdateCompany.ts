import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, CompaniesRecord } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UpdateCompanyData {
  id: string;
  name: string;
  website_url?: string;
}

async function updateCompany(data: UpdateCompanyData, userId: string): Promise<CompaniesRecord> {
  // Get current company to check ownership
  const currentCompany = await pb.collection(Collections.Companies).getOne(data.id);

  if (currentCompany.user !== userId) {
    throw new Error('You can only update your own companies');
  }

  // Check if company name already exists (if name changed)
  if (data.name.trim() !== currentCompany.name) {
    const existing = await pb
      .collection(Collections.Companies)
      .getFirstListItem(`user = "${userId}" && name = "${data.name.trim()}"`, { requestKey: null })
      .catch(() => null);

    if (existing && existing.id !== data.id) {
      throw new Error('A company with this name already exists');
    }
  }

  const companyData: Partial<CompaniesRecord> = {
    name: data.name.trim(),
    website_url: data.website_url?.trim() || undefined,
  };

  return await pb.collection(Collections.Companies).update(data.id, companyData);
}

export function useUpdateCompany() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateCompanyData) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return updateCompany(data, user.id);
    },
    onSuccess: updatedCompany => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({
        queryKey: queryKeys.companies.lists(),
      });

      // Also invalidate specific company detail if it exists
      queryClient.invalidateQueries({
        queryKey: queryKeys.companies.detail(updatedCompany.id),
      });

      toast({
        title: 'Success',
        description: `Company "${updatedCompany.name}" has been updated`,
      });
    },
    onError: (error: unknown) => {
      console.error('Error updating company:', error);

      // Handle specific error cases
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (errorMessage.includes('already exists')) {
        toast({
          title: 'Company name already exists',
          description: 'A company with this name already exists in your list',
          variant: 'destructive',
        });
      } else if (errorMessage.includes('only update your own')) {
        toast({
          title: 'Unauthorized',
          description: 'You can only update your own companies',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not update company. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
