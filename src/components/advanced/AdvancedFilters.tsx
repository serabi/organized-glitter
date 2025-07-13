/**
 * Advanced filters component for project filtering with server-side state management
 * @author @serabi
 * @created 2025-07-09
 */

import React, { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
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
import MultipleSelector, { Option } from '@/components/ui/multiple-selector';
import { useFilters } from '@/contexts/FilterHooks';
import { ProjectFilterStatus } from '@/types/project';
import { queryKeys } from '@/hooks/queries/queryKeys';
import { useToast } from '@/hooks/use-toast';

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

/**
 * Convert tag objects to Option format for MultipleSelector
 */
const convertTagsToOptions = (tags: Array<{ id: string; name: string }>): Option[] => {
  return tags.map(tag => ({
    value: tag.id,
    label: tag.name,
  }));
};

/**
 * Convert selected tag IDs to Option format for MultipleSelector
 */
const convertSelectedTagsToOptions = (
  selectedTagIds: string[],
  availableTags: Array<{ id: string; name: string }>
): Option[] => {
  return selectedTagIds
    .map(tagId => {
      const tag = availableTags.find(t => t.id === tagId);
      return tag ? { value: tag.id, label: tag.name } : null;
    })
    .filter((option): option is Option => option !== null);
};

const AdvancedFiltersComponent: React.FC<AdvancedFiltersProps> = ({
  showImages,
  onShowImagesChange,
}) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

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
    updateIncludeMiniKits,
    updateIncludeArchived,
    updateIncludeDestashed,
  } = useFilters();

  // Convert tags to MultipleSelector format
  const tagOptions = useMemo(() => convertTagsToOptions(tags), [tags]);
  const selectedTagOptions = useMemo(
    () => convertSelectedTagsToOptions(filters.selectedTags, tags),
    [filters.selectedTags, tags]
  );

  // Custom reset function
  const resetFilters = useCallback(() => {
    updateStatus('all');
    updateCompany(null);
    updateArtist(null);
    updateDrillShape(null);
    updateSearchTerm('');
    updateTags([]);
    updateIncludeMiniKits(true);
    updateIncludeArchived(false);
    updateIncludeDestashed(true);
  }, [
    updateStatus,
    updateCompany,
    updateArtist,
    updateDrillShape,
    updateSearchTerm,
    updateTags,
    updateIncludeMiniKits,
    updateIncludeArchived,
    updateIncludeDestashed,
  ]);

  // Manual refresh function to get fresh sorted data
  const handleManualRefresh = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.projects.lists(),
    });
    toast({
      title: 'Refreshed',
      description: 'Project list updated with latest sort order',
    });
  }, [queryClient, toast]);

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

  // Handle tag change for MultipleSelector
  const handleTagChange = (selectedOptions: Option[]) => {
    const selectedTagIds = selectedOptions.map(option => option.value);
    updateTags(selectedTagIds);
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
          <MultipleSelector
            value={selectedTagOptions}
            onChange={handleTagChange}
            options={tagOptions}
            placeholder="Tags"
            disabled={!tags.length}
            hidePlaceholderWhenSelected
            className="w-full"
          />
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
        <div className="space-y-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-2 sm:space-y-0 md:col-span-3">
          {/* Show images toggle */}
          <div className="flex items-center space-x-3 sm:space-x-2">
            <Switch id="show-images" checked={showImages} onCheckedChange={onShowImagesChange} />
            <Label htmlFor="show-images" className="text-sm font-medium">
              Show images
            </Label>
          </div>

          {/* Show mini kits toggle */}
          <div className="flex items-center space-x-3 sm:space-x-2">
            <Switch
              id="show-mini-kits"
              checked={filters.includeMiniKits}
              onCheckedChange={updateIncludeMiniKits}
            />
            <Label htmlFor="show-mini-kits" className="text-sm font-medium">
              Show mini kits
            </Label>
          </div>

          {/* Show archived and Show destashed toggles */}
          <div className="space-y-3 sm:flex sm:items-center sm:gap-x-4 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-2">
              <Switch
                id="show-archived"
                checked={filters.includeArchived}
                onCheckedChange={updateIncludeArchived}
              />
              <Label htmlFor="show-archived" className="text-sm font-medium">
                Show archived
              </Label>
            </div>

            <div className="flex items-center space-x-3 sm:space-x-2">
              <Switch
                id="show-destashed"
                checked={filters.includeDestashed}
                onCheckedChange={updateIncludeDestashed}
              />
              <Label htmlFor="show-destashed" className="text-sm font-medium">
                Show destashed
              </Label>
            </div>
          </div>
        </div>
        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 md:col-span-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualRefresh}
            title="Refresh to get latest sort order"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" onClick={resetFilters}>
            Clear filters
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFiltersComponent;
