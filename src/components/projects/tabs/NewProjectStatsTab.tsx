import { ProjectFormValues } from '@/types/project';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewProjectStatsTabProps {
  formData: ProjectFormValues;
  isSubmitting: boolean;
  onChange: (data: ProjectFormValues) => void;
}

export const NewProjectStatsTab = ({
  formData,
  isSubmitting,
  onChange,
}: NewProjectStatsTabProps) => {
  // Handle input changes
  const handleInputChange = (field: keyof ProjectFormValues, value: unknown) => {
    const updatedData = { ...formData, [field]: value };
    onChange(updatedData);
  };

  // Handle date changes
  const handleDateChange = (field: keyof ProjectFormValues, value: string) => {
    const dateValue = value ? value : null;
    handleInputChange(field, dateValue);
  };

  // Handle number changes
  const handleNumberChange = (field: keyof ProjectFormValues, value: string) => {
    const numValue = value ? Number(value) : null;
    handleInputChange(field, numValue);
  };

  return (
    <div className="space-y-6">
      {/* Dates */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-lg font-semibold">Important Dates</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="datePurchased">Date Purchased</Label>
              <Input
                id="datePurchased"
                type="date"
                value={formData.datePurchased || ''}
                onChange={e => handleDateChange('datePurchased', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateReceived">Date Received</Label>
              <Input
                id="dateReceived"
                type="date"
                value={formData.dateReceived || ''}
                onChange={e => handleDateChange('dateReceived', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateStarted">Date Started</Label>
              <Input
                id="dateStarted"
                type="date"
                value={formData.dateStarted || ''}
                onChange={e => handleDateChange('dateStarted', e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateCompleted">Date Completed</Label>
              <Input
                id="dateCompleted"
                type="date"
                value={formData.dateCompleted || ''}
                onChange={e => handleDateChange('dateCompleted', e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dimensions and Statistics */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-lg font-semibold">Project Specifications</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="width">Width (cm)</Label>
              <Input
                id="width"
                type="number"
                min="0"
                step="0.1"
                value={formData.width || ''}
                onChange={e => handleNumberChange('width', e.target.value)}
                placeholder="Enter width"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="height">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                min="0"
                step="0.1"
                value={formData.height || ''}
                onChange={e => handleNumberChange('height', e.target.value)}
                placeholder="Enter height"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalDiamonds">Total Diamonds</Label>
              <Input
                id="totalDiamonds"
                type="number"
                min="0"
                value={formData.totalDiamonds || ''}
                onChange={e => handleNumberChange('totalDiamonds', e.target.value)}
                placeholder="Enter total diamonds"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
