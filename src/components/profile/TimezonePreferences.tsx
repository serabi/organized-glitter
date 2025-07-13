/**
 * Timezone preference settings component for user profile
 * @author @serabi
 * @created 2025-01-13
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Globe, Clock } from 'lucide-react';
import {
  COMMON_TIMEZONES,
  getTimezonesByRegion,
  TIMEZONE_REGIONS,
  detectUserTimezone,
} from '@/utils/timezoneUtils';
import { useUserTimezone } from '@/hooks/useUserTimezone';
import { createLogger } from '@/utils/secureLogger';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Timezone Preferences
        </CardTitle>
        <CardDescription>
          Set your preferred timezone for displaying dates in your projects. This ensures dates like
          "purchased" and "completed" show correctly for your location.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[300px]">
                      {Object.entries(timezonesByRegion).map(([region, timezones]) => (
                        <React.Fragment key={region}>
                          <SelectItem
                            value=""
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
                    Current timezone: <strong>{currentTimezone}</strong>
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
                {form.formState.isSubmitting ? 'Saving...' : 'Save Timezone'}
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
          <h4 className="mb-2 font-medium">How Timezones Work</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Date fields (purchased, completed, started) will display in your timezone</li>
            <li>• Existing project dates won't change - only how they're displayed</li>
            <li>• Auto-detect uses your browser's timezone setting</li>
            <li>• Changes take effect immediately for all date displays</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
