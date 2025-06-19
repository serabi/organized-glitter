import { UseFormReturn } from 'react-hook-form';
import { ProjectFormSchemaType } from '@/schemas/project.schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProjectStatsTabProps {
  form: UseFormReturn<ProjectFormSchemaType>;
  isSubmitting: boolean;
}

export const ProjectStatsTab = ({ form, isSubmitting }: ProjectStatsTabProps) => {
  const drillShapeOptions = [
    { value: 'round', label: 'Round' },
    { value: 'square', label: 'Square' },
  ];

  const kitCategoryOptions = [
    { value: 'full', label: 'Full Sized' },
    { value: 'mini', label: 'Mini' },
  ];

  return (
    <div className="space-y-6">
      {/* Dimensions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="width"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Width (cm)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Enter width..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="height"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Height (cm)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="Enter height..."
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Project Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Project Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="drillShape"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Drill Shape</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select drill shape..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drillShapeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="kit_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Kit</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type of kit..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {kitCategoryOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="totalDiamonds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Diamonds</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Enter total number of diamonds..."
                    disabled={isSubmitting}
                    onChange={e => {
                      const value = e.target.value;
                      field.onChange(value ? parseInt(value, 10) : null);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Source Information */}
      <Card>
        <CardHeader>
          <CardTitle>Source Information</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="sourceUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Source URL</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    type="url"
                    placeholder="https://..."
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};
