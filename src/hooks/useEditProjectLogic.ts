import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectFormValues, ProjectType } from '@/types/project';
import { useEditProject } from '@/hooks/useEditProject';
import { secureLogger } from '@/utils/secureLogger';

interface UseEditProjectLogicProps {
  projectId: string | undefined;
}

export const useEditProjectLogic = ({ projectId }: UseEditProjectLogicProps) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<ProjectFormValues | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [hasSelectedNewImage, setHasSelectedNewImage] = useState(false);

  const {
    project,
    loading,
    submitting,
    companies,
    artists,
    handleSubmit: handleUpdateProject,
    handleArchive: handleArchiveProject,
    handleDelete: handleDeleteProject,
    refetchProject: refreshLists,
  } = useEditProject(projectId);

  // Update form data when project loads
  useEffect(() => {
    if (project && !formData) {
      const initialData = prepareFormInitialData(project);
      setFormData(initialData);
    }
  }, [project, formData]);

  // Handle tab/window close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  const handleCancel = () => {
    if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
      return;
    }
    navigate(`/projects/${projectId}`);
  };

  const handleFormChange = (data: ProjectFormValues) => {
    setFormData(prevData => {
      const newData = { ...prevData, ...data };

      if (data.imageFile !== undefined) {
        setHasSelectedNewImage(!!data.imageFile);
      }

      const otherFieldsChanged = Object.keys(data).some(
        key =>
          key !== 'imageFile' &&
          key !== 'imageUrl' &&
          key !== '_imageReplacement' &&
          prevData?.[key as keyof ProjectFormValues] !== data[key as keyof ProjectFormValues]
      );

      if (otherFieldsChanged || data.imageFile !== undefined) {
        setIsDirty(true);
      }

      return newData;
    });
  };

  const handleSubmit = async (data: ProjectFormValues) => {
    if (!isDirty && !hasSelectedNewImage) {
      return;
    }

    try {
      // Prepare the data for submission
      const dataToSubmit: ProjectFormValues = {
        ...data,
        imageUrl: data.imageUrl,
        totalDiamonds:
          typeof data.totalDiamonds === 'string' && data.totalDiamonds
            ? Number(data.totalDiamonds)
            : data.totalDiamonds,
        width: data.width,
        height: data.height,
        imageFile: data.imageFile,
        _imageReplacement: data._imageReplacement,
      };

      // Call the original handleUpdateProject and reset form state after success
      await handleUpdateProject(dataToSubmit);
      secureLogger.debug('Resetting form dirty state after successful update');
      setIsDirty(false);
      setHasSelectedNewImage(false);
    } catch (error) {
      secureLogger.error('Error submitting form:', error);
      throw error;
    }
  };

  const handleArchive = () => {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Are you sure you want to archive this project without saving?'
      )
    ) {
      return;
    }

    if (
      window.confirm(
        `Are you sure you want to archive "${project?.title}"? This will move it to your archived projects.`
      )
    ) {
      handleArchiveProject();
    }
  };

  const handleDelete = () => {
    if (
      isDirty &&
      !window.confirm(
        'You have unsaved changes. Are you sure you want to delete this project without saving?'
      )
    ) {
      return;
    }

    if (
      window.confirm('This will permanently delete your project. This action cannot be undone.')
    ) {
      handleDeleteProject();
    }
  };

  return {
    project,
    loading,
    submitting,
    companies,
    artists,
    formData,
    isDirty,
    hasSelectedNewImage,
    refreshLists,
    handleCancel,
    handleFormChange,
    handleSubmit,
    handleArchive,
    handleDelete,
  };
};

// Helper function to prepare initial data for the form
const prepareFormInitialData = (project: ProjectType): ProjectFormValues => {
  return {
    title: project.title || '',
    status: project.status || 'wishlist',
    company: project.company || '',
    artist: project.artist || '',
    drillShape: project.drillShape || '',
    totalDiamonds: project.totalDiamonds || 0,
    generalNotes: project.generalNotes || '',
    sourceUrl: project.sourceUrl || '',
    imageUrl: project.imageUrl || '',
    imageFile: null,
    width: project.width?.toString() || '',
    height: project.height?.toString() || '',
    datePurchased: project.datePurchased || '',
    dateReceived: project.dateReceived || '',
    dateStarted: project.dateStarted || '',
    dateCompleted: project.dateCompleted || '',
    tags: project.tags || [],
    userId: project.userId,
    kit_category: project.kit_category || 'full',
  };
};
