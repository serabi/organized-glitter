import { useState } from 'react';
import { ProjectFormValues } from '@/types/project';
import { useToast } from '@/hooks/use-toast';
import { pb } from '@/lib/pocketbase';
import { useProjectImageCompression } from '@/hooks/useProjectImageCompression';
import { Collections, ProjectsResponse } from '@/types/pocketbase.types';
import { analytics } from '@/services/analytics';

interface CreateProjectResponse {
  data: ProjectsResponse | null;
  error: Error | null;
}

interface CreateProjectOptions {
  skipNavigation?: boolean;
}

export const useCreateProject = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { compressImage } = useProjectImageCompression();

  const createProject = async (
    formData: ProjectFormValues,
    companies: string[],
    artists: string[]
  ): Promise<CreateProjectResponse> => {
    setLoading(true);

    try {
      if (!pb.authStore.isValid) {
        throw new Error('User not authenticated');
      }

      const userId = pb.authStore.model?.id;
      if (!userId) {
        throw new Error(
          'User authentication is incomplete. Please refresh the page and try again.'
        );
      }

      console.log('Creating project for user ID:', userId);

      // Create FormData for PocketBase
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('user', userId);
      formDataToSend.append('status', formData.status || 'wishlist');

      // Handle optional fields
      if (formData.company) formDataToSend.append('company', formData.company);
      if (formData.artist) formDataToSend.append('artist', formData.artist);
      if (formData.drillShape) formDataToSend.append('drill_shape', formData.drillShape);
      if (formData.datePurchased) formDataToSend.append('date_purchased', formData.datePurchased);
      if (formData.dateReceived) formDataToSend.append('date_received', formData.dateReceived);
      if (formData.dateStarted) formDataToSend.append('date_started', formData.dateStarted);
      if (formData.dateCompleted) formDataToSend.append('date_completed', formData.dateCompleted);
      if (formData.generalNotes) formDataToSend.append('general_notes', formData.generalNotes);
      if (formData.sourceUrl) formDataToSend.append('source_url', formData.sourceUrl);

      // Handle kit_category with default value
      formDataToSend.append('kit_category', formData.kit_category || 'full');

      // Handle numeric fields
      if (formData.width) formDataToSend.append('width', formData.width);
      if (formData.height) formDataToSend.append('height', formData.height);
      if (formData.totalDiamonds)
        formDataToSend.append('total_diamonds', formData.totalDiamonds.toString());

      // Handle image upload if present
      if (formData.imageFile) {
        try {
          console.log('Processing image file:', formData.imageFile.name);

          // Compress the image first if needed
          console.log('🗜️ Compressing image if needed...', {
            originalSize: `${(formData.imageFile.size / (1024 * 1024)).toFixed(2)}MB`,
            originalName: formData.imageFile.name,
          });
          const compressedFile = await compressImage(formData.imageFile);
          console.log('✅ Compression complete:', {
            compressedSize: `${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`,
            compressionRatio: `${Math.round((1 - compressedFile.size / formData.imageFile.size) * 100)}%`,
          });

          // Add image to FormData
          formDataToSend.append('image', compressedFile);
          console.log('Image added to form data');
        } catch (error) {
          console.error('Error in image compression:', error);

          // Track image upload failure
          analytics.error.imageUploadFailed(
            'project',
            error instanceof Error ? error.message : 'Unknown error',
            formData.imageFile?.size
          );

          throw new Error(
            `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      // Create project in PocketBase
      const newProject = await pb.collection(Collections.Projects).create(formDataToSend);

      if (!newProject || !newProject.id) {
        throw new Error('Invalid project data returned from database');
      }

      console.log('Project created successfully:', newProject.id);

      // Track project creation analytics
      analytics.project.created(newProject);

      // Track image upload if present
      if (formData.imageFile) {
        analytics.feature.imageUploaded('project', formData.imageFile.size / 1024);
      }

      // Add new company to user's companies list if it doesn't exist and isn't empty
      if (
        formData.company &&
        formData.company !== 'other' &&
        !companies.includes(formData.company)
      ) {
        console.log('Adding new company:', formData.company);

        try {
          const companyData = {
            name: formData.company,
            user: userId,
          };

          const insertedCompany = await pb.collection(Collections.Companies).create(companyData);
          console.log(
            `✅ Successfully added company: "${formData.company}" with ID:`,
            insertedCompany?.id
          );
        } catch (error) {
          console.error('❌ CRITICAL ERROR: Failed to add company during project creation:', error);
          throw new Error(
            `Failed to create company "${formData.company}": ${error instanceof Error ? error.message : 'Unknown error'}. This is required for dashboard filters to work properly.`
          );
        }
      }

      // Add new artist to user's artists list if it doesn't exist and isn't empty or "unknown"
      if (
        formData.artist &&
        !['other', 'unknown'].includes(formData.artist) &&
        !artists.includes(formData.artist)
      ) {
        console.log('Adding new artist:', formData.artist);

        try {
          const artistData = {
            name: formData.artist,
            user: userId,
          };

          const insertedArtist = await pb.collection(Collections.Artists).create(artistData);
          console.log(
            `✅ Successfully added artist: "${formData.artist}" with ID:`,
            insertedArtist?.id
          );
        } catch (error) {
          console.error('Error in artist creation:', error);
          toast({
            title: 'Note',
            description: 'Project was created but failed to save the new artist',
            variant: 'default',
          });
        }
      }

      toast({
        title: 'Project created successfully!',
        description: `${newProject.title} has been added to your collection.`,
      });

      // Return the created project data
      const response: CreateProjectResponse = {
        data: newProject,
        error: null,
      };

      return response;
    } catch (error) {
      console.error('Error creating project:', error);

      const errorMessage = error instanceof Error ? error.message : 'Please try again later.';

      // Track project creation failure
      analytics.error.databaseOperation('create', 'projects', errorMessage);

      toast({
        title: 'Failed to create project',
        description: errorMessage,
        variant: 'destructive',
      });

      return {
        data: null,
        error: error instanceof Error ? error : new Error(errorMessage),
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject: createProject as (
      data: ProjectFormValues,
      companies: string[],
      artists: string[],
      options?: CreateProjectOptions
    ) => Promise<CreateProjectResponse>,
    loading,
  };
};
