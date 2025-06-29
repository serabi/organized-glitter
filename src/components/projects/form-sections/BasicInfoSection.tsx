import React from 'react';
import FormField from '../form/FormField';
import CompanySelect from '../form/CompanySelect';
import ArtistSelect from '../form/ArtistSelect';

interface BasicInfoSectionProps {
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

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
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
          type="text"
          value={title}
          onChange={onTitleChange}
          placeholder="Enter project title"
          required
          disabled={isSubmitting}
          autoComplete="off"
          inputMode="text"
          autoCapitalize="words"
          autoCorrect="on"
          spellCheck="true"
          className="flex h-10 w-full touch-manipulation rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            fontSize: '16px', // Prevent iOS zoom on input focus
            touchAction: 'manipulation',
          }}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CompanySelect
          value={company}
          onChange={onCompanyChange}
          companies={companies}
          onCompanyAdded={onCompanyAdded}
          disabled={isSubmitting}
        />
        <ArtistSelect
          value={artist}
          onChange={onArtistChange}
          artists={artists}
          onArtistAdded={onArtistAdded}
          disabled={isSubmitting}
        />
      </div>
    </>
  );
};

export default BasicInfoSection;
