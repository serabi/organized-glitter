/**
 * Tests for field mapping utilities
 * @author @serabi
 * @created 2025-07-22
 */

import { mapFormDataToPocketBase } from '../field-mapping';
import type { ProjectFormValues } from '@/types/shared';

describe('mapFormDataToPocketBase', () => {
  describe('date handling', () => {
    const mockFormData: ProjectFormValues = {
      title: 'Test Project',
      status: 'in_progress',
      datePurchased: '2025-07-20',
      dateReceived: '2025-07-21', 
      dateStarted: '2025-07-22',
      dateCompleted: '',
      kit_category: '',
      drillShape: '',
      width: '',
      height: '',
      totalDiamonds: '',
      generalNotes: '',
      sourceUrl: '',
      company: '',
      artist: ''
    };

    it('should preserve HTML5 date input strings as-is (no timezone conversion)', () => {
      const result = mapFormDataToPocketBase(mockFormData, 'America/New_York');
      
      // HTML5 date input strings should be preserved exactly as entered
      expect(result.date_purchased).toBe('2025-07-20');
      expect(result.date_received).toBe('2025-07-21');
      expect(result.date_started).toBe('2025-07-22');
      expect(result.date_completed).toBe(null);
    });

    it('should preserve dates regardless of user timezone', () => {
      const timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];
      
      timezones.forEach(timezone => {
        const result = mapFormDataToPocketBase(mockFormData, timezone);
        
        expect(result.date_purchased).toBe('2025-07-20');
        expect(result.date_received).toBe('2025-07-21');
        expect(result.date_started).toBe('2025-07-22');
      });
    });

    it('should ensure user-entered dates are saved exactly as entered', () => {
      // This test specifically addresses the user's question:
      // "Will this also ensure the date entered by the user is the date that saves?"
      
      const userEnteredDates = {
        ...mockFormData,
        datePurchased: '2025-07-20', // User enters July 20, 2025
        dateReceived: '2025-12-25',  // User enters December 25, 2025
        dateStarted: '2025-01-01',   // User enters January 1, 2025
      };

      // Test with different timezones that would previously cause date shifting
      const timezonesWithOffsets = [
        'UTC',                    // No offset
        'America/New_York',       // UTC-5/-4 (would cause day-1 bug)
        'America/Los_Angeles',    // UTC-8/-7 (would cause day-1 bug)  
        'Asia/Tokyo',             // UTC+9 (would cause day+1 bug)
        'Europe/London',          // UTC+0/+1
      ];

      timezonesWithOffsets.forEach(timezone => {
        const result = mapFormDataToPocketBase(userEnteredDates, timezone);
        
        // The dates should be preserved EXACTLY as the user entered them
        expect(result.date_purchased).toBe('2025-07-20');  // ✅ NOT '2025-07-19'
        expect(result.date_received).toBe('2025-12-25');   // ✅ NOT '2025-12-24' 
        expect(result.date_started).toBe('2025-01-01');    // ✅ NOT '2024-12-31'
      });
    });

    it('should handle empty date strings correctly', () => {
      const formDataWithEmptyDates: ProjectFormValues = {
        ...mockFormData,
        datePurchased: '',
        dateReceived: '',
        dateStarted: '',
        dateCompleted: ''
      };

      const result = mapFormDataToPocketBase(formDataWithEmptyDates);
      
      expect(result.date_purchased).toBe(null);
      expect(result.date_received).toBe(null);
      expect(result.date_started).toBe(null);
      expect(result.date_completed).toBe(null);
    });

    it('should still convert Date objects using timezone conversion', () => {
      const formDataWithDateObjects: ProjectFormValues = {
        ...mockFormData,
        datePurchased: new Date('2025-07-20T12:00:00Z') as any, // TypeScript workaround for test
      };

      const result = mapFormDataToPocketBase(formDataWithDateObjects, 'America/New_York');
      
      // Date objects should still be converted (this may result in timezone shifts)
      expect(typeof result.date_purchased).toBe('string');
      expect(result.date_purchased).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('field mapping', () => {
    it('should correctly map camelCase to snake_case field names', () => {
      const formData: ProjectFormValues = {
        title: 'Test Project',
        status: 'completed',
        datePurchased: '2025-07-20',
        dateReceived: '2025-07-21',
        dateStarted: '2025-07-22',
        dateCompleted: '2025-07-23',
        kit_category: 'animals',
        drillShape: 'square',
        width: '100',
        height: '200',
        totalDiamonds: '5000',
        generalNotes: 'Test notes',
        sourceUrl: 'https://example.com',
        company: '',
        artist: ''
      };

      const result = mapFormDataToPocketBase(formData);

      expect(result).toEqual({
        title: 'Test Project',
        status: 'completed',
        date_purchased: '2025-07-20',
        date_received: '2025-07-21', 
        date_started: '2025-07-22',
        date_completed: '2025-07-23',
        kit_category: 'animals',
        drill_shape: 'square',
        width: 100,
        height: 200,
        total_diamonds: 5000,
        general_notes: 'Test notes',
        source_url: 'https://example.com'
      });
    });
  });
});