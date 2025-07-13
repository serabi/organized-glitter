import { ProjectType } from '@/types/project';

export interface AdvancedEditTableProps {
  projects: ProjectType[];
  loading: boolean;
  showImages: boolean;
  availableCompanies?: Array<{ id: string; name: string }>;
  availableArtists?: Array<{ id: string; name: string }>;
}
