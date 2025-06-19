import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pb } from '@/lib/pocketbase';
import { Collections, TagsRecord } from '@/types/pocketbase.types';
import { queryKeys } from '../queries/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CreateTagData {
  name: string;
  color: string;
}

async function createTag(data: CreateTagData, userId: string): Promise<TagsRecord> {
  const slug = data.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  const tagData: Partial<TagsRecord> = {
    name: data.name.trim(),
    slug,
    color: data.color,
    user: userId,
  };

  return await pb.collection(Collections.Tags).create(tagData);
}

export function useCreateTag() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTagData) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      return createTag(data, user.id);
    },
    onSuccess: newTag => {
      // Invalidate and refetch tags list
      queryClient.invalidateQueries({
        queryKey: queryKeys.tags.lists(),
      });

      toast({
        title: 'Success',
        description: `Tag "${newTag.name}" has been added`,
      });
    },
    onError: (error: unknown) => {
      console.error('Error creating tag:', error);

      // Handle specific error cases
      if (error && typeof error === 'object' && 'status' in error && error.status === 400) {
        toast({
          title: 'Tag already exists',
          description: 'A tag with this name already exists in your list',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Could not add tag. Please try again.',
          variant: 'destructive',
        });
      }
    },
  });
}
