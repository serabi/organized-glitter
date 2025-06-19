/**
 * Example usage of the enhanced CSV import with Papa Parse
 */

import { parseCsvToProjects, parseCsvFileToProjects } from './csvImport';
import { PROJECT_IMAGE_CONSTANTS } from '@/components/projects/ProgressNoteForm/constants';

// Example 1: Parse CSV string (for smaller files)
export const handleCsvStringImport = async (csvContent: string) => {
  try {
    const projects = await parseCsvToProjects(csvContent, progress => {
      console.log(`Import progress: ${progress}%`);
    });

    console.log(`Successfully imported ${projects.projects.length} projects`);
    return projects.projects;
  } catch (error) {
    console.error('CSV import failed:', error);
    throw error;
  }
};

// Example 2: Parse CSV file (recommended for large files)
export const handleCsvFileImport = async (file: File) => {
  try {
    const projects = await parseCsvFileToProjects(file, progress => {
      console.log(`Import progress: ${progress}%`);
      // You could update a progress bar here
    });

    console.log(`Successfully imported ${projects.projects.length} projects from ${file.name}`);
    return projects.projects;
  } catch (error) {
    console.error('CSV file import failed:', error);
    throw error;
  }
};

// Example 3: File input handler for React components
export const createFileInputHandler = (
  onProgress: (progress: number) => void,
  onSuccess: (projects: Partial<import('@/types/project').ProjectType>[]) => void,
  onError: (error: Error) => void
) => {
  return async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      onError(new Error('No file selected'));
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError(new Error('Please select a CSV file'));
      return;
    }

    // Check file size (warn for files > configured limit)
    // This is a general example; specific limits should be enforced where this handler is used.
    // Using PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE as a placeholder for a general large file warning.
    if (file.size > PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE) {
      console.warn(
        `Large file detected (${(file.size / (1024 * 1024)).toFixed(2)}MB). Using streaming parser for better performance.`
      );
    }

    try {
      const result = await parseCsvFileToProjects(file, onProgress);
      onSuccess(result.projects);
    } catch (error) {
      onError(error as Error);
    }
  };
};
