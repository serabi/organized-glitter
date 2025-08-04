import React from 'react';
import FormField from '../form/FormField';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectSpecsSectionProps {
  width?: string; // Always string for form inputs
  height?: string; // Always string for form inputs
  drillShape: string;
  sourceUrl: string;
  totalDiamonds?: number | string; // Can be number or string for form inputs
  kit_category?: 'full' | 'mini';
  isSubmitting: boolean;
  onWidthChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHeightChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrillShapeChange: (value: string) => void;
  onSourceUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTotalDiamondsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKitCategoryChange: (value: 'full' | 'mini') => void;
}

export const ProjectSpecsSection: React.FC<ProjectSpecsSectionProps> = ({
  width,
  height,
  drillShape,
  sourceUrl,
  totalDiamonds,
  kit_category,
  isSubmitting,
  onWidthChange,
  onHeightChange,
  onDrillShapeChange,
  onSourceUrlChange,
  onTotalDiamondsChange,
  onKitCategoryChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField id="width" label="Width (cm)">
          <Input
            id="width"
            name="width"
            type="number"
            value={width || ''}
            onChange={onWidthChange}
            placeholder="Width"
            disabled={isSubmitting}
            min="0"
            step="0.1"
          />
        </FormField>

        <FormField id="height" label="Height (cm)">
          <Input
            id="height"
            name="height"
            type="number"
            value={height || ''}
            onChange={onHeightChange}
            placeholder="Height"
            disabled={isSubmitting}
            min="0"
            step="0.1"
          />
        </FormField>

        <FormField id="drillShape" label="Drill Shape">
          <Select
            value={drillShape || ''}
            onValueChange={onDrillShapeChange}
            disabled={isSubmitting}
          >
            <SelectTrigger id="drillShape" name="drillShape">
              <SelectValue placeholder="Select shape" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="round">Round</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {' '}
        {/* Adjusted to 3 columns */}
        <FormField id="sourceUrl" label="Source URL">
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            value={sourceUrl || ''}
            onChange={onSourceUrlChange}
            placeholder="https://example.com"
            disabled={isSubmitting}
          />
        </FormField>
        <FormField id="totalDiamonds" label="Total Diamonds">
          <Input
            id="totalDiamonds"
            name="totalDiamonds"
            type="number"
            value={totalDiamonds || ''}
            onChange={onTotalDiamondsChange}
            placeholder="Total number of diamonds"
            disabled={isSubmitting}
            min="0"
            step="1"
          />
        </FormField>
        <FormField id="kit_category" label="Type of Kit">
          <Select
            value={kit_category || 'full'}
            onValueChange={value => onKitCategoryChange(value as 'full' | 'mini')}
            disabled={isSubmitting}
          >
            <SelectTrigger id="kit_category" name="kit_category">
              <SelectValue placeholder="Select type of kit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Sized</SelectItem>
              <SelectItem value="mini">Mini</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>
    </div>
  );
};

export default ProjectSpecsSection;
