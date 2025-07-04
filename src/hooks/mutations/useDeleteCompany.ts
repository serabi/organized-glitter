import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useToast } from '@/hooks/use-toast';
import { secureLogger } from '@/utils/secureLogger';

interface DeleteCompanyData {
  id: string;
  name?: string; // Optional for better error messages
}

async function deleteCompany(data: DeleteCompanyData): Promise<void> {
  await pb.collection(Collections.Companies).delete(data.id);
}

export function useDeleteCompany() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: (_, variables) => {
      // Invalidate and refetch companies list
      queryClient.invalidateQueries({
        queryKey: queryKeys.companies.lists(),
      });

      toast({
        title: 'Success',
        description: variables.name
          ? `Company "${variables.name}" has been deleted`
          : 'Company has been deleted',
      });
    },
    onError: (error: unknown) => {
      secureLogger.error('Error deleting company:', error);

      // Handle specific error cases
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        toast({
          title: 'Company not found',
          description: 'The company you are trying to delete was not found',
          variant: 'destructive',
        });
      } else if (error && typeof error === 'object' && 'status' in error && error.status === 400) {
        toast({
          title: 'Cannot delete company',
          description: 'This company may be linked to existing projects',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not delete company. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
