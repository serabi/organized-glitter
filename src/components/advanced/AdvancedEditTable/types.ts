import { ProjectType } from '@/types/project';
import { Tag } from '@/types/tag';
import { ArtistsResponse, CompaniesResponse } from '@/types/pocketbase.types';

export interface AdvancedEditTableProps {
  projects: ProjectType[];
  loading: boolean;
  showImages: boolean;
  selectedProjects: Set<string>;
  onSelectProject: (projectId: string) => void;
  onSelectAll: () => void;
  onProjectUpdate: (projectId: string, updates: Partial<ProjectType>) => void;
  onBulkDelete: () => void;
  availableCompanies?: CompaniesResponse[];
  availableArtists?: ArtistsResponse[];
  availableTags?: Tag[];
}

export interface EditingState {
  projectId: string;
  field: string;
}

export interface EditCellProps {
  project: ProjectType;
  field: string;
  value: string | number | undefined;
  isEditing: boolean;
  editValue: string;
  originalValue: string;
  onStartEdit: (projectId: string, field: string, currentValue: string) => void;
  onSaveEdit: (projectId: string, field: string) => void;
  onCancelEdit: () => void;
  onEditValueChange: (value: string) => void;
  onProjectUpdate: (projectId: string, updates: Partial<ProjectType>) => void;
  availableCompanies?: CompaniesResponse[];
  availableArtists?: ArtistsResponse[];
  availableTags?: Tag[];
}
