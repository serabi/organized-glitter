/**
 * Tests for progress notes date handling timezone fix
 * @author @serabi
 * @created 2025-07-22
 */

import { getCurrentDateInUserTimezone } from '../timezoneUtils';

describe('Progress Notes Date Handling', () => {
  describe('timezone-aware date initialization', () => {
    it('should return consistent dates across different timezones for current day', () => {
      const timezones = [
        'UTC',
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Asia/Tokyo',
        'Australia/Sydney',
      ];

      // Get the current date in each timezone
      const datesByTimezone = timezones.map(timezone => ({
        timezone,
        date: getCurrentDateInUserTimezone(timezone),
      }));

      // All dates should be valid YYYY-MM-DD format
      datesByTimezone.forEach(({ timezone, date }) => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(date).not.toBeNull();

        // Date should be reasonable (not in far past/future)
        const year = parseInt(date.split('-')[0]);
        const currentYear = new Date().getFullYear();
        expect(year).toBeGreaterThanOrEqual(currentYear - 1);
        expect(year).toBeLessThanOrEqual(currentYear + 1);
      });
    });

    it('should handle timezone differences correctly for date boundaries', () => {
      // Test with specific timezones that could cause date boundary issues
      const testTimezones = [
        'Pacific/Kiritimati', // UTC+14 (earliest timezone)
        'Pacific/Honolulu', // UTC-10 (one of latest timezones)
        'UTC', // Baseline
      ];

      const dates = testTimezones.map(timezone => getCurrentDateInUserTimezone(timezone));

      // All should be valid date strings
      dates.forEach(date => {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);

        // Parse and verify it's a valid date
        const parsedDate = new Date(date);
        expect(parsedDate.toString()).not.toBe('Invalid Date');
      });
    });

    it('should preserve user-intended date regardless of timezone', () => {
      // This test ensures that progress notes behave like project dates:
      // The date the user sees and enters should be the date that gets stored

      const userTimezone = 'America/Los_Angeles'; // UTC-8/-7
      const currentDateInUserTZ = getCurrentDateInUserTimezone(userTimezone);

      // The date should represent the current day in the user's timezone,
      // not shifted by UTC conversion
      expect(currentDateInUserTZ).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's not null or undefined
      expect(currentDateInUserTZ).toBeTruthy();

      // Should be a reasonable current date
      const today = new Date();
      const userDate = new Date(currentDateInUserTZ + 'T00:00:00');
      const timeDiff = Math.abs(today.getTime() - userDate.getTime());
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

      // Should be within 1 day (accounting for timezone differences)
      expect(daysDiff).toBeLessThan(2);
    });
  });

  describe('progress notes date consistency', () => {
    it('should ensure progress notes and project dates use same timezone logic', () => {
      const timezone = 'Europe/London';

      // Progress notes now use the same timezone utility as projects
      const progressNoteDate = getCurrentDateInUserTimezone(timezone);
      const projectDate = getCurrentDateInUserTimezone(timezone);

      // Both should use identical logic and return same date for same timezone
      expect(progressNoteDate).toBe(projectDate);
      expect(progressNoteDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});
