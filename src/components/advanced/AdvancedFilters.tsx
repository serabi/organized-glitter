import React, { useState, useEffect } from 'react';
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
import { AdvancedFilters, AvailableFilters } from '@/hooks/useAdvancedFilters';
import { ProjectFilterStatus } from '@/types/project';
import { TagService } from '@/lib/tags';
import { secureLogger } from '@/utils/secureLogger';
import { Tag } from '@/types/tag';

interface AdvancedFiltersProps {
  filters: AdvancedFilters;
  setFilters: (filters: AdvancedFilters) => void;
  availableFilters: AvailableFilters;
  loading: boolean;
  showImages: boolean;
  onShowImagesChange: (value: boolean) => void;
  showMiniKits: boolean;
  onShowMiniKitsChange: (value: boolean) => void;
  showArchived: boolean;
  onShowArchivedChange: (value: boolean) => void;
  showDestashed: boolean;
  onShowDestashedChange: (value: boolean) => void;
}

const getStatusOptions = (
  showArchived: boolean,
  showDestashed: boolean
): { value: ProjectFilterStatus; label: string }[] => {
  const baseOptions: { value: ProjectFilterStatus; label: string }[] = [
    { value: 'all' as ProjectFilterStatus, label: 'All Statuses' },
    { value: 'wishlist' as ProjectFilterStatus, label: 'Wishlist' },
    { value: 'purchased' as ProjectFilterStatus, label: 'Purchased' },
    { value: 'stash' as ProjectFilterStatus, label: 'In Stash' },
    { value: 'progress' as ProjectFilterStatus, label: 'In Progress' },
    { value: 'completed' as ProjectFilterStatus, label: 'Completed' },
  ];

  if (showArchived) {
    baseOptions.push({ value: 'archived' as ProjectFilterStatus, label: 'Archived' });
  }

  if (showDestashed) {
    baseOptions.push({ value: 'destashed' as ProjectFilterStatus, label: 'Destashed' });
  }

  return baseOptions;
};

const AdvancedFiltersComponent: React.FC<AdvancedFiltersProps> = ({
  filters,
  setFilters,
  availableFilters,
  loading,
  showImages,
  onShowImagesChange,
  showMiniKits,
  onShowMiniKitsChange,
  showArchived,
  onShowArchivedChange,
  showDestashed,
  onShowDestashedChange,
}) => {
  // State for available tags
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // Fetch available tags on component mount
  useEffect(() => {
    const fetchTags = async () => {
      setTagsLoading(true);
      try {
        const response = await TagService.getUserTags();
        if (response.status === 'success' && response.data) {
          setAvailableTags(response.data);
        }
      } catch (error) {
        secureLogger.error('Failed to fetch tags:', error);
      } finally {
        setTagsLoading(false);
      }
    };

    fetchTags();
  }, []);
  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, searchTerm: e.target.value });
  };

  // Handle status change
  const handleStatusChange = (value: string) => {
    setFilters({ ...filters, status: value as ProjectFilterStatus });
  };

  // Handle company change
  const handleCompanyChange = (value: string) => {
    setFilters({ ...filters, company: value });
  };

  // Handle artist change
  const handleArtistChange = (value: string) => {
    setFilters({ ...filters, artist: value });
  };

  // Handle drill shape change
  const handleDrillShapeChange = (value: string) => {
    setFilters({ ...filters, drillShape: value });
  };

  // Handle tag change
  const handleTagChange = (value: string) => {
    setFilters({ ...filters, tag: value });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: 'all',
      searchTerm: '',
      company: 'all',
      artist: 'all',
      drillShape: 'all',
      tag: 'all',
      hasDates: false,
    });
  };

  const statusOptions = getStatusOptions(showArchived, showDestashed);

  return (
    <div className="mb-6 space-y-4 rounded-lg border bg-background p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {/* Search input */}
        <div className="md:col-span-2">
          <Input
            placeholder="Search projects..."
            value={filters.searchTerm}
            onChange={handleSearchChange}
            disabled={loading}
          />
        </div>

        {/* Status filter */}
        <div>
          <Select value={filters.status} onValueChange={handleStatusChange} disabled={loading}>
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
            value={filters.company}
            onValueChange={handleCompanyChange}
            disabled={loading || !availableFilters.companies.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {availableFilters.companies.map(company => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Artist filter */}
        <div>
          <Select
            value={filters.artist}
            onValueChange={handleArtistChange}
            disabled={loading || !availableFilters.artists.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Artist" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Artists</SelectItem>
              {availableFilters.artists.map(artist => (
                <SelectItem key={artist} value={artist}>
                  {artist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tag filter */}
        <div>
          <Select
            value={filters.tag}
            onValueChange={handleTagChange}
            disabled={loading || tagsLoading || !availableTags.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {availableTags.map(tag => (
                <SelectItem key={tag.id} value={tag.name}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        {' '}
        {/* Parent grid, still 6 columns */}
        {/* Drill Shape filter */}
        <div className="md:col-span-1">
          {' '}
          {/* Stays as col-span-1 */}
          <Select
            value={filters.drillShape}
            onValueChange={handleDrillShapeChange}
            disabled={loading || !availableFilters.drillShapes.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Drill Shape" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shapes</SelectItem>
              {availableFilters.drillShapes.map(shape => (
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
              checked={showMiniKits}
              onCheckedChange={onShowMiniKitsChange}
            />
            <Label htmlFor="show-mini-kits">Show mini kits</Label>
          </div>

          {/* Show archived and Show destashed toggles grouped together */}
          <div className="flex items-center gap-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="show-archived"
                checked={showArchived}
                onCheckedChange={onShowArchivedChange}
              />
              <Label htmlFor="show-archived">Show archived</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="show-destashed"
                checked={showDestashed}
                onCheckedChange={onShowDestashedChange}
              />
              <Label htmlFor="show-destashed">Show destashed</Label>
            </div>
          </div>
        </div>
        {/* Clear filters Button */}
        <div className="flex items-center justify-end md:col-span-2">
          {' '}
          {/* New col-span-2 and alignment */}
          <Button variant="ghost" onClick={clearFilters} disabled={loading}>
            Clear filters
          </Button>
        </div>
      </div>

      {/* Selected tags display removed */}
    </div>
  );
};

export default AdvancedFiltersComponent;
