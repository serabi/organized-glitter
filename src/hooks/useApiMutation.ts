import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';

interface ApiMutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  invalidateQueryKey: string[];
  successMessage: string;
  errorMessage: string;
}

export const useApiMutation = <TData, TVariables>({
  mutationFn,
  invalidateQueryKey,
  successMessage,
  errorMessage,
}: ApiMutationOptions<TData, TVariables>) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      toast({
        title: 'Success',
        description: successMessage,
      });
    },
    onError: error => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `${errorMessage}: ${error.message}`,
      });
    },
  });
};
