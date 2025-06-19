import { ProjectFormValues } from '@/types/project';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface ProjectStatsTabSimpleProps {
  formData: ProjectFormValues | null;
  isSubmitting: boolean;
  onChange: (data: ProjectFormValues) => void;
}

export const ProjectStatsTabSimple = ({
  formData,
  isSubmitting,
  onChange,
}: ProjectStatsTabSimpleProps) => {
  const handleInputChange = (
    field: keyof ProjectFormValues,
    value: ProjectFormValues[keyof ProjectFormValues]
  ) => {
    if (!formData) return;
    const updatedData = { ...formData, [field]: value };
    onChange(updatedData);
  };

  const drillShapeOptions = [
    { value: 'round', label: 'Round' },
    { value: 'square', label: 'Square' },
  ];

  if (!formData) {
    return <div>Loading form data...</div>;
  }

  const formatDateForInput = (dateString: string | null | undefined): string => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dates Section */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="datePurchased">Date Purchased</Label>
              <Input
                id="datePurchased"
                type="date"
                value={formatDateForInput(formData.datePurchased)}
                onChange={e => handleInputChange('datePurchased', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateReceived">Date Received</Label>
              <Input
                id="dateReceived"
                type="date"
                value={formatDateForInput(formData.dateReceived)}
                onChange={e => handleInputChange('dateReceived', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateStarted">Date Started</Label>
              <Input
                id="dateStarted"
                type="date"
                value={formatDateForInput(formData.dateStarted)}
                onChange={e => handleInputChange('dateStarted', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateCompleted">Date Completed</Label>
              <Input
                id="dateCompleted"
                type="date"
                value={formatDateForInput(formData.dateCompleted)}
                onChange={e => handleInputChange('dateCompleted', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimensions Section */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Label className="text-sm font-medium">Dimensions</Label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="width">Width (cm)</Label>
              <Input
                id="width"
                value={formData.width || ''}
                onChange={e => handleInputChange('width', e.target.value)}
                type="number"
                step="0.1"
                min="0"
                placeholder="Enter width..."
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                value={formData.height || ''}
                onChange={e => handleInputChange('height', e.target.value)}
                type="number"
                step="0.1"
                min="0"
                placeholder="Enter height..."
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Specifications */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="drillShape">Drill Shape</Label>
              <Select
                onValueChange={value => handleInputChange('drillShape', value)}
                value={formData.drillShape || ''}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select drill shape..." />
                </SelectTrigger>
                <SelectContent>
                  {drillShapeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDiamonds">Total Diamonds</Label>
              <Input
                id="totalDiamonds"
                value={formData.totalDiamonds || ''}
                onChange={e => {
                  const value = e.target.value;
                  handleInputChange('totalDiamonds', value ? parseInt(value, 10) : 0);
                }}
                type="number"
                min="0"
                step="1"
                placeholder="Enter total number of diamonds..."
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Information */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="sourceUrl">Source URL</Label>
            <Input
              id="sourceUrl"
              value={formData.sourceUrl || ''}
              onChange={e => handleInputChange('sourceUrl', e.target.value)}
              type="url"
              placeholder="https://..."
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
