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
  onTotalDiamondsChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

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
  onTotalDiamondsChange,
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
            />
          </div>
        </FormField>

        <FormField id="drillShape" label="Drill Shape">
          <Select value={drillShape} onValueChange={onDrillShapeChange}>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField id="totalDiamonds" label="Total Diamonds">
          <Input
            id="totalDiamonds"
            name="totalDiamonds"
            type="text"
            inputMode="text"
            value={totalDiamonds}
            onChange={e => {
              // Allow only numbers and commas
              const value = e.target.value.replace(/[^0-9,]/g, '');
              // Create a synthetic event with the cleaned value
              const syntheticEvent = {
                ...e,
                target: {
                  ...e.target,
                  name: 'totalDiamonds',
                  value,
                },
              };
              onTotalDiamondsChange(syntheticEvent as React.ChangeEvent<HTMLInputElement>);
            }}
            placeholder="e.g., 1,000"
            className="w-full"
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
          />
        </FormField>
      </div>
    </div>
  );
};

export default ProjectSpecs;
