/**
 * Advanced filters component for project filtering with server-side state management
 * @author @serabi
 * @created 2025-07-09
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useFilters } from '@/contexts/FilterHooks';
import { ProjectFilterStatus } from '@/types/project';

interface AdvancedFiltersProps {
  showImages: boolean;
  onShowImagesChange: (value: boolean) => void;
}

const getStatusOptions = (): { value: ProjectFilterStatus; label: string }[] => {
  return [
    { value: 'all' as ProjectFilterStatus, label: 'All Statuses' },
    { value: 'wishlist' as ProjectFilterStatus, label: 'Wishlist' },
    { value: 'purchased' as ProjectFilterStatus, label: 'Purchased' },
    { value: 'stash' as ProjectFilterStatus, label: 'In Stash' },
    { value: 'progress' as ProjectFilterStatus, label: 'In Progress' },
    { value: 'completed' as ProjectFilterStatus, label: 'Completed' },
    { value: 'archived' as ProjectFilterStatus, label: 'Archived' },
    { value: 'destashed' as ProjectFilterStatus, label: 'Destashed' },
  ];
};

const AdvancedFiltersComponent: React.FC<AdvancedFiltersProps> = ({
  showImages,
  onShowImagesChange,
}) => {
  // Use consolidated FilterProvider hooks
  const {
    filters,
    isSearchPending,
    companies,
    artists,
    drillShapes,
    tags,
    updateStatus,
    updateCompany,
    updateArtist,
    updateDrillShape,
    updateSearchTerm,
    updateTags,
    toggleTag,
    updateIncludeMiniKits,
    updateIncludeArchived,
    updateIncludeDestashed,
  } = useFilters();

  // Custom reset function
  const resetFilters = () => {
    updateStatus('all');
    updateCompany(null);
    updateArtist(null);
    updateDrillShape(null);
    updateSearchTerm('');
    updateTags([]);
    updateIncludeMiniKits(true);
    updateIncludeArchived(false);
    updateIncludeDestashed(true);
  };

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSearchTerm(e.target.value);
  };

  // Handle status change
  const handleStatusChange = (value: string) => {
    updateStatus(value as ProjectFilterStatus);
  };

  // Handle company change (now using IDs instead of names)
  const handleCompanyChange = (value: string) => {
    updateCompany(value === 'all' ? null : value);
  };

  // Handle artist change (now using IDs instead of names)
  const handleArtistChange = (value: string) => {
    updateArtist(value === 'all' ? null : value);
  };

  // Handle drill shape change
  const handleDrillShapeChange = (value: string) => {
    updateDrillShape(value === 'all' ? null : value);
  };

  // Handle tag change (now using IDs instead of names)
  const handleTagChange = (value: string) => {
    if (value === 'all') {
      updateTags([]);
    } else {
      const tag = tags.find(t => t.name === value);
      if (tag) {
        toggleTag(tag.id);
      }
    }
  };

  const statusOptions = getStatusOptions();

  return (
    <div className="mb-6 space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Search input */}
        <div className="md:col-span-2">
          <Input
            placeholder="Search projects..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            disabled={isSearchPending}
          />
        </div>

        {/* Status filter */}
        <div>
          <Select value={filters.activeStatus} onValueChange={handleStatusChange}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Company filter */}
        <div>
          <Select
            value={filters.selectedCompany}
            onValueChange={handleCompanyChange}
            disabled={!companies.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Artist filter */}
        <div>
          <Select
            value={filters.selectedArtist}
            onValueChange={handleArtistChange}
            disabled={!artists.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Artist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Artists</SelectItem>
              {artists.map(artist => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag filter */}
        <div>
          <Select
            value={filters.selectedTags.length > 0 ? filters.selectedTags[0] : 'all'}
            onValueChange={handleTagChange}
            disabled={!tags.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {tags.map(tag => (
                <SelectItem key={tag.id} value={tag.name}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Drill Shape filter */}
        <div className="md:col-span-1">
          <Select
            value={filters.selectedDrillShape}
            onValueChange={handleDrillShapeChange}
            disabled={!drillShapes.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Drill Shape" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shapes</SelectItem>
              {drillShapes.map(shape => (
                <SelectItem key={shape} value={shape}>
                  {shape === 'round' ? 'Round' : 'Square'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Toggle Group (Show Images, Show Mini Kits, Show Archived, Show Destashed) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-3">
          {/* Show images toggle */}
          <div className="flex items-center space-x-2">
            <Switch id="show-images" checked={showImages} onCheckedChange={onShowImagesChange} />
            <Label htmlFor="show-images">Show images</Label>
          </div>

          {/* Show mini kits toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="show-mini-kits"
              checked={filters.includeMiniKits}
              onCheckedChange={updateIncludeMiniKits}
            />
            <Label htmlFor="show-mini-kits">Show mini kits</Label>
          </div>

          {/* Show archived and Show destashed toggles grouped together */}
          <div className="flex items-center gap-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-archived"
                checked={filters.includeArchived}
                onCheckedChange={updateIncludeArchived}
              />
              <Label htmlFor="show-archived">Show archived</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-destashed"
                checked={filters.includeDestashed}
                onCheckedChange={updateIncludeDestashed}
              />
              <Label htmlFor="show-destashed">Show destashed</Label>
            </div>
          </div>
        </div>
        {/* Clear filters Button */}
        <div className="flex items-center justify-end md:col-span-2">
          <Button variant="ghost" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFiltersComponent;
