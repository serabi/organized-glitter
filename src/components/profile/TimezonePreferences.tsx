/**
 * Timezone preference settings component for user profile
 * @author @serabi
 * @created 2025-01-13
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Clock } from 'lucide-react';
import { getTimezonesByRegion, TIMEZONE_REGIONS, detectUserTimezone } from '@/utils/timezoneUtils';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { createLogger } from '@/utils/logger';

const logger = createLogger('TimezonePreferences');

const timezoneSchema = z.object({
  timezone: z.string().min(1, 'Please select a timezone'),
});

type TimezoneFormData = z.infer<typeof timezoneSchema>;

interface TimezonePreferencesProps {
  onTimezoneUpdate?: (timezone: string) => void;
}

export function TimezonePreferences({ onTimezoneUpdate }: TimezonePreferencesProps) {
  const { toast } = useToast();
  const currentTimezone = useUserTimezone();
  const timezonesByRegion = getTimezonesByRegion();
  const detectedTimezone = detectUserTimezone();

  const form = useForm<TimezoneFormData>({
    resolver: zodResolver(timezoneSchema),
    defaultValues: {
      timezone: currentTimezone,
    },
  });

  const onSubmit = async (data: TimezoneFormData) => {
    try {
      logger.info('Updating timezone preference', { timezone: data.timezone });

      // Call the parent callback to handle the actual mutation
      if (onTimezoneUpdate) {
        await onTimezoneUpdate(data.timezone);
      }

      toast({
        title: 'Timezone Updated',
        description: `Your timezone has been set to ${data.timezone}`,
      });
    } catch (error) {
      logger.error('Failed to update timezone preference', { error });
      toast({
        title: 'Update Failed',
        description: 'Failed to update your timezone preference. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDetectTimezone = () => {
    const detected = detectUserTimezone();
    form.setValue('timezone', detected);
    toast({
      title: 'Timezone Detected',
      description: `Detected timezone: ${detected}`,
    });
  };

  return (
    <div className="dark:glass-card mt-8 rounded-lg border border-border bg-card text-card-foreground shadow">
      <div className="border-b border-border p-6">
        <h2 className="text-xl font-semibold">Time Zone Preferences</h2>
        <p className="text-muted-foreground">
          Set your preferred time zone for displaying dates in your projects. This ensures dates
          like "purchased" and "completed" show correctly for your location.
        </p>
      </div>
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Zone</FormLabel>
                  <Select
                    onValueChange={value => {
                      // Ignore header values that start with __header_
                      if (!value.startsWith('__header_')) {
                        field.onChange(value);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your time zone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(timezonesByRegion).map(([region, timezones]) => (
                        <React.Fragment key={region}>
                          <SelectItem
                            value={`__header_${region}`}
                            disabled
                            className="font-semibold text-muted-foreground"
                          >
                            {TIMEZONE_REGIONS[region as keyof typeof TIMEZONE_REGIONS]}
                          </SelectItem>
                          {timezones.map(tz => (
                            <SelectItem key={tz.value} value={tz.value} className="pl-4">
                              {tz.label}
                            </SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Current time zone: <strong>{currentTimezone}</strong>
                    {detectedTimezone !== currentTimezone && (
                      <span className="text-muted-foreground"> (Detected: {detectedTimezone})</span>
                    )}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="submit" disabled={form.formState.isSubmitting} className="flex-1">
                {form.formState.isSubmitting ? 'Saving...' : 'Save Time Zone'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleDetectTimezone}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Auto-Detect
              </Button>
            </div>
          </form>
        </Form>

        <div className="mt-6 rounded-lg bg-muted p-4">
          <h4 className="mb-2 font-medium">How Time Zones Work In Organized Glitter</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Date fields (purchased, completed, started) will display in your time zone</li>
            <li>
              • Your project dates will display in your selected time zone - no data is changed,
              just the format you see
            </li>
            <li>• Auto-detect uses your browser's time zone setting</li>
            <li>• Changes take effect immediately for all date displays</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
