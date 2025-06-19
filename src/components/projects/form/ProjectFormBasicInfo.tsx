import React from 'react';
import FormField from './FormField';
import CompanySelect from './CompanySelect';
import ArtistSelect from './ArtistSelect';

interface ProjectFormBasicInfoProps {
  title: string;
  company: string;
  artist: string;
  companies: string[];
  artists: string[];
  isSubmitting: boolean;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCompanyChange: (value: string) => void;
  onArtistChange: (value: string) => void;
  onCompanyAdded: (newCompany: string) => Promise<void>;
  onArtistAdded: (newArtist: string) => Promise<void>;
}

const ProjectFormBasicInfo: React.FC<ProjectFormBasicInfoProps> = ({
  title,
  company,
  artist,
  companies,
  artists,
  isSubmitting,
  onTitleChange,
  onCompanyChange,
  onArtistChange,
  onCompanyAdded,
  onArtistAdded,
}) => {
  return (
    <>
      <FormField id="title" label="Project Title" required>
        <input
          id="title"
          name="title"
          value={title}
          onChange={onTitleChange}
          placeholder="Enter project title"
          required
          disabled={isSubmitting}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CompanySelect
          value={company || ''}
          onChange={onCompanyChange}
          companies={companies}
          onCompanyAdded={onCompanyAdded}
        />

        <ArtistSelect
          value={artist || ''}
          onChange={onArtistChange}
          artists={artists}
          onArtistAdded={onArtistAdded}
        />
      </div>
    </>
  );
};

export default ProjectFormBasicInfo;
