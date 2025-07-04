import { useState, useCallback } from 'react';
import { pb } from '@/lib/pocketbase';
import { useToast } from '@/hooks/use-toast';
import type { ProjectStatus } from '@/types/shared';
import type { ProjectsResponse } from '@/types/pocketbase.types';
import { projectsToCsv, downloadCsv } from '@/utils/csvExport';
import { logger } from '@/utils/logger';

/**
 * Validate and normalize the kit category field
 * Ensures only valid 'full' or 'mini' values are assigned
 */
const validateKitCategory = (
  categoryValue: string | null | undefined
): 'full' | 'mini' | undefined => {
  if (!categoryValue) return undefined;

  const normalizedCategory = categoryValue.toLowerCase().trim();

  if (['full', 'full sized', 'full_sized_kit', 'full sized kit'].includes(normalizedCategory)) {
    return 'full';
  }
  if (['mini', 'mini kit', 'mini_kit'].includes(normalizedCategory)) {
    return 'mini';
  }

  // If the value doesn't match expected patterns, log a warning and return undefined
  logger.warn(`Invalid kit_category value: "${categoryValue}". Expected 'full' or 'mini'.`);
  return undefined;
};

type ExportResult = {
  success: boolean;
  filename?: string;
  error?: string;
};

export const useProjectExport = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportProjectsToCsv = useCallback(async (): Promise<ExportResult | undefined> => {
    try {
      setLoading(true);

      // Get the current user
      if (!pb.authStore.isValid) {
        throw new Error('You must be logged in to export projects');
      }

      const user = pb.authStore.model;
      if (!user) {
        throw new Error('You must be logged in to export projects');
      }

      // Fetch all projects for the current user with tags
      const records = await pb.collection('projects').getList(1, 1000, {
        filter: `user = "${user.id}"`,
        expand: 'project_tags_via_project.tag',
        sort: '-created',
      });

      if (!records.items || records.items.length === 0) {
        toast({
          title: 'No projects found',
          description: 'You have no projects to export.',
        });
        return { success: false, error: 'No projects found' };
      }

      // Map PocketBase records to project type
      const formattedProjects = records.items.map((record: Record<string, unknown>) => {
        // Extract tags from the expanded project_tags relationship
        const tags =
          (record.expand as Record<string, unknown>)?.['project_tags_via_project'] &&
          Array.isArray((record.expand as Record<string, unknown>)['project_tags_via_project'])
            ? (
                (record.expand as Record<string, unknown>)['project_tags_via_project'] as Array<
                  Record<string, unknown>
                >
              )
                .map((pt: Record<string, unknown>) => {
                  const ptExpand = pt.expand as Record<string, unknown>;
                  if (ptExpand?.tag) {
                    const tag = ptExpand.tag as Record<string, unknown>;
                    return {
                      id: tag.id as string,
                      name: tag.name as string,
                      color: tag.color as string,
                      userId: tag.user as string,
                      slug: tag.slug as string,
                      createdAt: tag.created as string,
                      updatedAt: tag.updated as string,
                    };
                  }
                  return null;
                })
                .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
            : [];

        return {
          id: record.id as string,
          userId: record.user as string,
          title: record.title as string,
          company: (record.company as string) || undefined,
          artist: (record.artist as string) || undefined,
          width: (record.width as number) || undefined,
          height: (record.height as number) || undefined,
          drillShape: (record.drill_shape as string) || undefined,
          status: record.status as ProjectStatus,
          datePurchased: (record.date_purchased as string) || undefined,
          dateReceived: (record.date_received as string) || undefined,
          dateStarted: (record.date_started as string) || undefined,
          dateCompleted: (record.date_completed as string) || undefined,
          generalNotes: (record.general_notes as string) || undefined,
          imageUrl:
            record.image && typeof record.image === 'string'
              ? pb.files.getURL(record as ProjectsResponse, record.image)
              : undefined,
          sourceUrl: (record.source_url as string) || undefined,
          totalDiamonds: (record.total_diamonds as number) || undefined,
          kit_category: validateKitCategory(record.kit_category as string),
          tags: tags,
          progressNotes: [], // Will be populated separately if needed
          progressImages: [], // Will be populated separately if needed
          createdAt: record.created as string,
          updatedAt: record.updated as string,
        };
      });

      // Generate CSV from projects
      const csvData = projectsToCsv(formattedProjects);

      // Download the CSV file
      const filename = `diamond-projects-${new Date().toISOString().split('T')[0]}.csv`;
      downloadCsv(csvData, filename);

      // Show success message
      toast({
        title: 'Export complete',
        description: `${formattedProjects.length} projects exported to ${filename}`,
      });

      return { success: true, filename };
    } catch (error) {
      logger.error('Error exporting projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to export projects';
      toast({
        title: 'Export failed',
        description: errorMessage,
        variant: 'destructive',
      });
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return {
    exportProjectsToCsv,
    loading,
  };
};
