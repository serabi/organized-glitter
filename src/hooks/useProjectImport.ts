import { useState } from 'react';
import { parseCsvFileToProjects, ParsedCsvData } from '@/utils/csvImport'; // Import ParsedCsvData
import { useImportCreateProject } from '@/hooks/useImportCreateProject';
import { useToast } from '@/hooks/use-toast';
import { ProjectCreateDTO } from '@/types/project';
import { pb } from '@/lib/pocketbase';
import { PROJECT_IMAGE_CONSTANTS } from '@/components/projects/ProgressNoteForm/constants';
import { createLogger } from '@/utils/logger';
import { TAG_COLOR_PALETTE } from '@/utils/tagColors'; // For default tag color

const logger = createLogger('ProjectImport');
import { generateUniqueSlug } from '@/utils/slugify';
import { validateProjectData, validateTagNames, ValidationIssue } from '@/utils/csvValidation';
import {
  analyzeCSVFile,
  generateColumnValidationMessage,
  ColumnAnalysisResult,
} from '@/utils/csvColumnAnalysis';

const DEFAULT_TAG_COLOR_HEX = TAG_COLOR_PALETTE[0].hex; // Default color for new tags

interface ImportStats {
  successful: number;
  failed: number;
  total: number;
  errors: string[];
  tagWarnings: string[];
  validationIssues: ValidationIssue[];
  columnAnalysis?: ColumnAnalysisResult;
  currentProject?: string;
}

export const useProjectImport = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<ImportStats>({
    successful: 0,
    failed: 0,
    total: 0,
    errors: [],
    tagWarnings: [],
    validationIssues: [],
  });

  const { createProject } = useImportCreateProject();
  const { toast } = useToast();

  const importProjectsFromCSV = async (file: File): Promise<boolean> => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive',
      });
      return false;
    }

    // Check file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a CSV file',
        variant: 'destructive',
      });
      return false;
    }

    // Check file size
    const MAX_SIZE = PROJECT_IMAGE_CONSTANTS.MAX_FILE_SIZE;
    const MAX_SIZE_MB = MAX_SIZE / (1024 * 1024);
    if (file.size > MAX_SIZE) {
      toast({
        title: 'File too large',
        description: `Maximum file size is ${MAX_SIZE_MB}MB`,
        variant: 'destructive',
      });
      return false;
    }

    // Get current user first
    if (!pb.authStore.isValid) {
      toast({
        title: 'Authentication error',
        description: 'Please log in to import projects',
        variant: 'destructive',
      });
      return false;
    }

    const user = pb.authStore.model;
    if (!user) {
      toast({
        title: 'Authentication error',
        description: 'Please log in to import projects',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    setProgress(0);
    setImportStats({
      successful: 0,
      failed: 0,
      total: 0,
      errors: [],
      tagWarnings: [],
      validationIssues: [],
    });

    try {
      // Step 1: Analyze CSV columns before parsing
      logger.debug('Analyzing CSV column structure...');
      const columnAnalysis = await analyzeCSVFile(file);
      const validationMessage = generateColumnValidationMessage(columnAnalysis);

      // Log column analysis results
      logger.debug('CSV column analysis complete', {
        detectedColumns: columnAnalysis.detectedColumns.length,
        missingRequired: columnAnalysis.missingRequired.length,
        missingOptional: columnAnalysis.missingOptional.length,
        unmappedColumns: columnAnalysis.unmappedColumns.length,
        hasAllRequired: columnAnalysis.summary.hasAllRequired,
        canProceed: validationMessage.canProceed,
      });

      // Check if we can proceed with import
      if (!validationMessage.canProceed) {
        toast({
          title: 'CSV Validation Failed',
          description: validationMessage.message,
          variant: 'destructive',
        });
        setLoading(false);
        return false;
      }

      // Show column validation feedback
      if (validationMessage.severity === 'warning') {
        toast({
          title: 'Column Mapping Notice',
          description: validationMessage.message,
          variant: 'default',
        });
      } else if (validationMessage.severity === 'success') {
        toast({
          title: 'Column Analysis Complete',
          description: validationMessage.message,
          variant: 'default',
        });
      }

      // Update import stats with column analysis
      setImportStats(prev => ({ ...prev, columnAnalysis }));

      // Debug CSV tag parsing (ORG-36)
      logger.debug('Running CSV tag debug analysis...');
      // logCSVTagDebugInfo removed for PocketBase migration

      // Step 2: Parse CSV file directly using Papa Parse with progress callback
      const { projects: parsedCsvProjects, allUniqueTagNames }: ParsedCsvData =
        await parseCsvFileToProjects(file, parseProgress => {
          // Papa Parse progress is for parsing, we'll map it to ~10% of total progress initially
          const mappedProgress = Math.round(parseProgress * 0.1);
          setProgress(mappedProgress);
        });

      if (!parsedCsvProjects || parsedCsvProjects.length === 0) {
        toast({
          title: 'No valid projects found',
          description: 'Please check your CSV format and try again',
          variant: 'destructive',
        });
        setLoading(false);
        return false;
      }

      // --- BEGIN BATCH TAG PROCESSING ---
      logger.debug('Starting batch tag processing...', {
        allUniqueTagNamesCount: allUniqueTagNames.length,
      });

      // Validate all tag names first
      const tagValidationResult = validateTagNames(allUniqueTagNames);
      const allValidationIssues: ValidationIssue[] = [...tagValidationResult.issues];

      // Use validated tag names
      const validatedTagNamesMap = new Map(
        tagValidationResult.validatedTags.map(({ original, normalized }) => [original, normalized])
      );

      const tagNameMap: Record<string, string> = {};
      const currentTagWarnings: string[] = []; // Use a local var for warnings during this phase

      try {
        const existingUserTags = await pb.collection('tags').getFullList({
          filter: pb.filter('user = {:userId}', { userId: user.id }),
          fields: 'id,name',
        });
        existingUserTags.forEach(tag => {
          tagNameMap[tag.name] = tag.id;
        });
        logger.debug('Fetched existing user tags and built initial map.', {
          count: existingUserTags.length,
        });

        const newTagNamesToCreate: string[] = [];
        allUniqueTagNames.forEach(originalName => {
          const normalizedName = validatedTagNamesMap.get(originalName) || originalName;
          if (normalizedName && normalizedName.trim() !== '' && !tagNameMap[normalizedName]) {
            // Ensure normalized name is not empty and not already mapped
            newTagNamesToCreate.push(normalizedName);
          }
        });
        logger.debug('Identified new tags to create.', {
          count: newTagNamesToCreate.length,
          newTagNamesToCreate,
        });

        // Update progress after fetching existing tags (e.g., to 15%)
        setProgress(15);

        let createdTagsCount = 0;
        for (const tagName of newTagNamesToCreate) {
          try {
            // Create a function to check if slug exists for this user
            const checkSlugExists = async (slug: string): Promise<boolean> => {
              try {
                const existingSlugs = await pb.collection('tags').getList(1, 1, {
                  filter: pb.filter('user = {:userId} && slug = {:slug}', {
                    userId: user.id,
                    slug,
                  }),
                  fields: 'id',
                });
                return existingSlugs.items.length > 0;
              } catch (error) {
                // If error checking, assume it DOES exist to prevent duplicate creation
                // This conservative approach avoids duplicate slugs at the cost of potentially
                // generating a longer slug than necessary
                logger.warn(
                  `Error checking slug existence for "${slug}", assuming it exists to prevent duplicates:`,
                  error
                );
                return true;
              }
            };

            // Generate unique slug for this user
            const uniqueSlug = await generateUniqueSlug(tagName, checkSlugExists);

            const newTagData = {
              name: tagName,
              slug: uniqueSlug,
              color: DEFAULT_TAG_COLOR_HEX,
              user: user.id,
            };
            const createdTag = await pb.collection('tags').create(newTagData);
            tagNameMap[tagName] = createdTag.id;
            createdTagsCount++;
            logger.debug(`Successfully created new tag: ${tagName}`, {
              id: createdTag.id,
              slug: uniqueSlug,
            });
          } catch (tagCreateError) {
            logger.error(`Failed to pre-create new tag: ${tagName}`, tagCreateError);
            currentTagWarnings.push(
              `Failed to pre-create tag: ${tagName} (${tagCreateError instanceof Error ? tagCreateError.message : 'Unknown error'})`
            );
          }
          // Update progress during new tag creation (e.g., 15% to 25%)
          setProgress(Math.round(15 + (createdTagsCount / (newTagNamesToCreate.length || 1)) * 10));
        }
        logger.debug('Finished creating new tags and updated map.', {
          finalMapSize: Object.keys(tagNameMap).length,
          createdCount: createdTagsCount,
        });
      } catch (batchTagError) {
        logger.error('Error during batch tag processing:', batchTagError);
        currentTagWarnings.push(
          `Critical error during batch tag processing: ${batchTagError instanceof Error ? batchTagError.message : 'Unknown error'}`
        );
        // Decide if to proceed or halt; for now, we'll add to warnings and proceed
      }
      // --- END BATCH TAG PROCESSING ---

      // Convert parsed projects to ProjectCreateDTO format with validation
      const projectsToCreate: ProjectCreateDTO[] = parsedCsvProjects.map(
        (parsedProject): ProjectCreateDTO => {
          // Validate and normalize project data
          const projectValidation = validateProjectData({
            title: parsedProject.title,
            drillShape: parsedProject.drillShape,
            status: parsedProject.status,
            kit_category: parsedProject.kit_category,
            datePurchased: parsedProject.datePurchased,
            dateReceived: parsedProject.dateReceived,
            dateStarted: parsedProject.dateStarted,
            dateCompleted: parsedProject.dateCompleted,
            generalNotes: parsedProject.generalNotes,
            sourceUrl: parsedProject.sourceUrl,
          });

          // Add validation issues to our tracking
          allValidationIssues.push(...projectValidation.issues);

          // Map tag names to IDs using validated names
          const projectTagIds = (parsedProject.tagNames || [])
            .map(originalName => {
              const normalizedName = validatedTagNamesMap.get(originalName) || originalName;
              return tagNameMap[normalizedName];
            })
            .filter(id => !!id) as string[];

          return {
            userId: user.id,
            title: projectValidation.correctedData.title || 'Untitled Project',
            company: parsedProject.company,
            artist: parsedProject.artist,
            drillShape: projectValidation.correctedData.drillShape,
            width: parsedProject.width,
            height: parsedProject.height,
            status: projectValidation.correctedData.status,
            datePurchased: projectValidation.correctedData.datePurchased,
            dateReceived: projectValidation.correctedData.dateReceived,
            dateStarted: projectValidation.correctedData.dateStarted,
            dateCompleted: projectValidation.correctedData.dateCompleted,
            generalNotes: projectValidation.correctedData.generalNotes,
            imageUrl: parsedProject.imageUrl,
            sourceUrl: projectValidation.correctedData.sourceUrl,
            totalDiamonds: parsedProject.totalDiamonds,
            kit_category: projectValidation.correctedData.kit_category,
            tagIds: projectTagIds, // Pass resolved tag IDs
          };
        }
      );

      // Initialize progress tracking
      const totalProjects = projectsToCreate.length;
      setImportStats(prev => ({ ...prev, total: totalProjects }));

      // Import each project
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      // Initialize tagWarnings with any from the batch processing phase
      let tagWarnings: string[] = [...currentTagWarnings];

      // Start project import progress from ~25% (10% parsing, 15% tag batching)
      const baseProgressForProjectLoop = 25;

      for (let i = 0; i < projectsToCreate.length; i++) {
        const project = projectsToCreate[i];

        // Update current project being imported
        setImportStats(prev => ({ ...prev, currentProject: project.title }));

        try {
          const result = await createProject(project); // createProject now expects tagIds
          successCount++;

          // Check for tag linking issues from createProject
          if (result.tagImportResult && result.tagImportResult.failedTags > 0) {
            const tagWarning = `Project "${project.title}": ${result.tagImportResult.failedTags} out of ${result.tagImportResult.totalTags} tags failed to link`;
            tagWarnings = [...tagWarnings, tagWarning];

            result.tagImportResult.errors.forEach(error => {
              tagWarnings = [...tagWarnings, `  - ${error}`];
            });
          }
        } catch (error) {
          logger.error(`Error importing project at index ${i}:`, error);
          failedCount++;

          const errorMessage =
            error instanceof Error
              ? error.message
              : `Failed to import project "${project.title || 'Untitled'}"`;

          errors.push(errorMessage);
        }

        // Update progress (remaining 75% for creating projects)
        const importProgress = Math.round(
          baseProgressForProjectLoop +
            ((i + 1) / totalProjects) * (100 - baseProgressForProjectLoop)
        );
        setProgress(importProgress);

        setImportStats({
          successful: successCount,
          failed: failedCount,
          total: totalProjects,
          errors,
          tagWarnings,
          validationIssues: allValidationIssues,
          columnAnalysis,
          currentProject: project.title,
        });

        if (i < projectsToCreate.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay, as tag creation is batched
        }
      }

      let successMessage = `Successfully imported ${successCount} out of ${totalProjects} projects. View them in your dashboard.`;

      const totalIssues = tagWarnings.length + allValidationIssues.length;
      if (totalIssues > 0) {
        successMessage += ` Note: ${totalIssues} data issues were automatically corrected (see details below).`;
      }

      // Add column mapping summary to success message
      const mappedColumns = importStats.columnAnalysis?.detectedColumns.length || 0;
      if (mappedColumns > 0) {
        successMessage += ` Mapped ${mappedColumns} CSV columns successfully.`;
      }

      toast({
        title: 'Import complete',
        description: successMessage,
        variant: totalIssues > 0 ? 'warning' : 'default',
      });

      if (tagWarnings.length > 0) {
        logger.warn('Tag processing/linking warnings:', { tagWarnings });
      }

      if (allValidationIssues.length > 0) {
        logger.warn('Data validation issues corrected:', {
          validationIssues: allValidationIssues.map(issue => ({
            field: issue.field,
            severity: issue.severity,
            message: issue.message,
            originalValue: issue.originalValue,
            correctedValue: issue.correctedValue,
          })),
        });
      }

      // Clear current project when import completes
      setImportStats(prev => ({ ...prev, currentProject: undefined }));

      if (allValidationIssues.length > 0) {
        logger.warn('Data validation issues corrected:', {
          validationIssues: allValidationIssues.map(issue => ({
            field: issue.field,
            severity: issue.severity,
            message: issue.message,
            originalValue: issue.originalValue,
            correctedValue: issue.correctedValue,
          })),
        });
      }

      // Clear current project when import completes
      setImportStats(prev => ({ ...prev, currentProject: undefined }));

      return true;
    } catch (error) {
      logger.error('Import error:', error);

      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import projects',
        variant: 'destructive',
      });

      setImportStats(prev => ({
        ...prev,
        errors: [
          ...prev.errors,
          error instanceof Error ? error.message : 'Unknown error during import',
        ],
        tagWarnings: [],
        validationIssues: [],
        columnAnalysis: prev.columnAnalysis, // Preserve column analysis if it was completed
        currentProject: undefined, // Clear current project on error
      }));

      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    importProjectsFromCSV,
    loading,
    progress,
    importStats,
  };
};
