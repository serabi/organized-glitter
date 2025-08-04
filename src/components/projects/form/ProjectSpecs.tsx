import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import FormField from './FormField';
import { createLogger } from '@/utils/logger';

interface ProjectSpecsProps {
  width: string;
  height: string;
  onWidthChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHeightChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  drillShape: string;
  onDrillShapeChange: (value: string) => void;
  sourceUrl?: string;
  onSourceUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  totalDiamonds?: string;
  setValue: (
    name: string,
    value: unknown,
    options?: { shouldValidate?: boolean; shouldDirty?: boolean }
  ) => void;
  kit_category?: 'full' | 'mini';
  onKitCategoryChange?: (value: 'full' | 'mini') => void;
  isSubmitting?: boolean;
}

const logger = createLogger('TotalDiamonds');

const ProjectSpecs = ({
  width,
  height,
  onWidthChange,
  onHeightChange,
  drillShape,
  onDrillShapeChange,
  sourceUrl = '',
  onSourceUrlChange,
  totalDiamonds = '',
  setValue,
  kit_category,
  onKitCategoryChange,
  isSubmitting = false,
}: ProjectSpecsProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="dimensions" label="Dimensions (cm)">
          <div className="flex items-center space-x-2">
            <Input
              id="width"
              name="width"
              type="text"
              inputMode="numeric"
              value={width}
              onChange={onWidthChange}
              placeholder="Width"
              className="w-full"
              disabled={isSubmitting}
            />
            <span className="text-lg font-medium">x</span>
            <Input
              id="height"
              name="height"
              type="text"
              inputMode="numeric"
              value={height}
              onChange={onHeightChange}
              placeholder="Height"
              className="w-full"
              disabled={isSubmitting}
            />
          </div>
        </FormField>

        <FormField id="drillShape" label="Drill Shape">
          <Select value={drillShape} onValueChange={onDrillShapeChange} disabled={isSubmitting}>
            <SelectTrigger id="drillShape">
              <SelectValue placeholder="Select drill shape" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="round">Round</SelectItem>
              <SelectItem value="square">Square</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <FormField id="totalDiamonds" label="Total Diamonds">
          <Input
            id="totalDiamonds"
            name="totalDiamonds"
            type="text"
            inputMode="numeric"
            value={totalDiamonds}
            onChange={e => {
              logger.debug('Raw input:', e.target.value);
              const cleaned = e.target.value.replace(/[^0-9]/g, '');
              logger.debug('After cleaning:', cleaned);
              const value = cleaned === '' ? undefined : Number(cleaned);
              logger.debug('Final value:', { value, type: typeof value });
              logger.debug('Calling setValue...');
              setValue('totalDiamonds', value, { shouldValidate: true });
              logger.debug('setValue completed');
            }}
            placeholder="e.g., 1000"
            className="w-full"
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="sourceUrl" label="Source/Product URL">
          <Input
            id="sourceUrl"
            name="sourceUrl"
            type="url"
            value={sourceUrl}
            onChange={onSourceUrlChange}
            placeholder="https://example.com/product"
            className="w-full"
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="kit_category" label="Type of Kit">
          <Select
            value={kit_category || 'full'}
            onValueChange={onKitCategoryChange}
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

export default ProjectSpecs;
