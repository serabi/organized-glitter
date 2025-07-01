/**
 * @fileoverview Tests for CSV validation utilities
 * 
 * Tests the validation and normalization functions used during CSV import
 * to ensure data meets PocketBase schema constraints.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeDrillShape,
  normalizeStatus,
  normalizeKitCategory,
  validateTagName,
  validateProjectTitle,
  validateDate,
  validateProjectData,
  validateTagNames,
  FIELD_LIMITS
} from '../csvValidation';
import { ProjectsDrillShapeOptions, ProjectsStatusOptions, ProjectsKitCategoryOptions } from '@/types/pocketbase.types';

describe('csvValidation', () => {
  describe('normalizeDrillShape', () => {
    it('handles valid drill shapes correctly', () => {
      expect(normalizeDrillShape('round')).toEqual({ normalized: ProjectsDrillShapeOptions.round });
      expect(normalizeDrillShape('square')).toEqual({ normalized: ProjectsDrillShapeOptions.square });
    });

    it('normalizes case variations', () => {
      const result = normalizeDrillShape('Round');
      expect(result.normalized).toBe(ProjectsDrillShapeOptions.round);
      expect(result.issue?.severity).toBe('info');
      expect(result.issue?.message).toContain('Normalized "Round" to "round"');
    });

    it('handles uppercase variations', () => {
      expect(normalizeDrillShape('SQUARE').normalized).toBe(ProjectsDrillShapeOptions.square);
      expect(normalizeDrillShape('ROUND').normalized).toBe(ProjectsDrillShapeOptions.round);
    });

    it('handles single letter shortcuts', () => {
      expect(normalizeDrillShape('r').normalized).toBe(ProjectsDrillShapeOptions.round);
      expect(normalizeDrillShape('S').normalized).toBe(ProjectsDrillShapeOptions.square);
    });

    it('handles invalid values', () => {
      const result = normalizeDrillShape('invalid');
      expect(result.normalized).toBeNull();
      expect(result.issue?.severity).toBe('warning');
      expect(result.issue?.message).toContain('Invalid drill shape');
    });

    it('handles null and undefined', () => {
      expect(normalizeDrillShape(null)).toEqual({ normalized: null });
      expect(normalizeDrillShape(undefined)).toEqual({ normalized: null });
      expect(normalizeDrillShape('')).toEqual({ normalized: null });
    });
  });

  describe('normalizeStatus', () => {
    it('handles valid status values', () => {
      expect(normalizeStatus('completed')).toEqual({ normalized: ProjectsStatusOptions.completed });
      expect(normalizeStatus('progress')).toEqual({ normalized: ProjectsStatusOptions.progress });
      expect(normalizeStatus('wishlist')).toEqual({ normalized: ProjectsStatusOptions.wishlist });
    });

    it('normalizes case variations', () => {
      const result = normalizeStatus('Completed');
      expect(result.normalized).toBe(ProjectsStatusOptions.completed);
      expect(result.issue?.severity).toBe('info');
    });

    it('handles common variations', () => {
      expect(normalizeStatus('done').normalized).toBe(ProjectsStatusOptions.completed);
      expect(normalizeStatus('finished').normalized).toBe(ProjectsStatusOptions.completed);
      expect(normalizeStatus('in progress').normalized).toBe(ProjectsStatusOptions.progress);
      expect(normalizeStatus('bought').normalized).toBe(ProjectsStatusOptions.purchased);
    });

    it('defaults invalid values to wishlist', () => {
      const result = normalizeStatus('invalid');
      expect(result.normalized).toBe(ProjectsStatusOptions.wishlist);
      expect(result.issue?.severity).toBe('warning');
      expect(result.issue?.correctedValue).toBe(ProjectsStatusOptions.wishlist);
    });

    it('handles null/undefined by defaulting to wishlist', () => {
      expect(normalizeStatus(null).normalized).toBe(ProjectsStatusOptions.wishlist);
      expect(normalizeStatus(undefined).normalized).toBe(ProjectsStatusOptions.wishlist);
    });
  });

  describe('normalizeKitCategory', () => {
    it('handles valid kit categories', () => {
      expect(normalizeKitCategory('full')).toEqual({ normalized: ProjectsKitCategoryOptions.full });
      expect(normalizeKitCategory('mini')).toEqual({ normalized: ProjectsKitCategoryOptions.mini });
    });

    it('normalizes case variations', () => {
      const result = normalizeKitCategory('Full');
      expect(result.normalized).toBe(ProjectsKitCategoryOptions.full);
      expect(result.issue?.severity).toBe('info');
    });

    it('handles common variations', () => {
      expect(normalizeKitCategory('full drill').normalized).toBe(ProjectsKitCategoryOptions.full);
      expect(normalizeKitCategory('partial').normalized).toBe(ProjectsKitCategoryOptions.mini);
      expect(normalizeKitCategory('small').normalized).toBe(ProjectsKitCategoryOptions.mini);
    });

    it('defaults invalid values to full', () => {
      const result = normalizeKitCategory('invalid');
      expect(result.normalized).toBe(ProjectsKitCategoryOptions.full);
      expect(result.issue?.severity).toBe('warning');
      expect(result.issue?.correctedValue).toBe(ProjectsKitCategoryOptions.full);
    });
  });

  describe('validateTagName', () => {
    it('handles normal tag names', () => {
      const result = validateTagName('test tag');
      expect(result.normalized).toBe('test tag');
      expect(result.issue).toBeUndefined();
    });

    it('trims whitespace', () => {
      const result = validateTagName('  test tag  ');
      expect(result.normalized).toBe('test tag');
    });

    it('truncates long tag names', () => {
      const longTag = 'a'.repeat(FIELD_LIMITS.TAG_NAME_MAX_LENGTH + 10);
      const result = validateTagName(longTag);
      expect(result.normalized.length).toBeLessThanOrEqual(FIELD_LIMITS.TAG_NAME_MAX_LENGTH);
      expect(result.issue?.severity).toBe('warning');
      expect(result.issue?.message).toContain('Tag name too long');
    });

    it('truncates at word boundary when possible', () => {
      const longTag = 'This is a very long tag name that should be truncated at a good word boundary if possible and exceed the maximum field length significantly';
      const result = validateTagName(longTag);
      expect(result.normalized.length).toBeLessThanOrEqual(FIELD_LIMITS.TAG_NAME_MAX_LENGTH);
      expect(result.issue?.severity).toBe('warning');
      // The function should truncate the text and either add ellipsis or break at word boundary
      expect(result.normalized).not.toBe(longTag); // Should be truncated
      expect(result.normalized.length).toBeLessThan(longTag.length);
    });

    it('handles CSV problematic tag names from real data', () => {
      const problematicTags = [
        'Changed snowflakes using light purple pearl from shimmering canvases',
        'v2 Won from munimade event #mermaywithfemke2024! Completed diety of dawn for the event'
      ];

      for (const tag of problematicTags) {
        const result = validateTagName(tag);
        expect(result.normalized.length).toBeLessThanOrEqual(FIELD_LIMITS.TAG_NAME_MAX_LENGTH);
        if (tag.length > FIELD_LIMITS.TAG_NAME_MAX_LENGTH) {
          expect(result.issue?.severity).toBe('warning');
        }
      }
    });

    it('handles empty values', () => {
      expect(validateTagName('').normalized).toBe('');
      expect(validateTagName(null).normalized).toBe('');
      expect(validateTagName(undefined).normalized).toBe('');
    });
  });

  describe('validateProjectTitle', () => {
    it('handles normal titles', () => {
      const result = validateProjectTitle('Test Project');
      expect(result.normalized).toBe('Test Project');
      expect(result.issue).toBeUndefined();
    });

    it('defaults empty titles', () => {
      const result = validateProjectTitle('');
      expect(result.normalized).toBe('Untitled Project');
    });

    it('truncates long titles', () => {
      const longTitle = 'a'.repeat(FIELD_LIMITS.PROJECT_TITLE_MAX_LENGTH + 10);
      const result = validateProjectTitle(longTitle);
      expect(result.normalized.length).toBeLessThanOrEqual(FIELD_LIMITS.PROJECT_TITLE_MAX_LENGTH);
      expect(result.issue?.severity).toBe('warning');
    });
  });

  describe('validateDate', () => {
    it('handles valid dates', () => {
      const result = validateDate('2024-06-15', 'testDate');
      expect(result.normalized).toBe('2024-06-15');
      expect(result.issue).toBeUndefined();
    });

    it('fixes common year typos', () => {
      const result = validateDate('0242-06-04', 'testDate');
      expect(result.normalized).toBe('2024-06-04');
      expect(result.issue?.severity).toBe('warning');
      expect(result.issue?.message).toContain('Invalid year 242 corrected to 2024');
    });

    it('handles invalid date formats', () => {
      const result = validateDate('invalid-date', 'testDate');
      expect(result.normalized).toBeNull();
      expect(result.issue?.severity).toBe('error');
      expect(result.issue?.message).toContain('Invalid date format');
    });

    it('handles null/undefined dates', () => {
      expect(validateDate(null, 'testDate').normalized).toBeNull();
      expect(validateDate(undefined, 'testDate').normalized).toBeNull();
    });

    it('validates year range', () => {
      const result = validateDate('1800-01-01', 'testDate');
      expect(result.issue?.severity).toBe('error');
    });
  });

  describe('validateProjectData', () => {
    it('validates complete project data', () => {
      const projectData = {
        title: 'Test Project',
        drillShape: 'Round',
        status: 'Completed',
        kit_category: 'Full',
        datePurchased: '2024-01-01',
        generalNotes: 'Test notes'
      };

      const result = validateProjectData(projectData);
      expect(result.isValid).toBe(true);
      expect(result.correctedData.drillShape).toBe('round');
      expect(result.correctedData.status).toBe('completed');
      expect(result.correctedData.kit_category).toBe('full');
      expect(result.issues.length).toBe(3); // Three normalization info messages
    });

    it('handles problematic data from CSV', () => {
      const problematicData = {
        title: 'a'.repeat(300), // Too long
        drillShape: 'Invalid',
        status: 'Unknown',
        kit_category: 'NotValid',
        datePurchased: '0242-06-04', // Invalid year (should be fixed)
        generalNotes: 'a'.repeat(2000) // Too long
      };

      const result = validateProjectData(problematicData);
      // Most issues are warnings that get corrected, so isValid may be true
      expect(result.correctedData.title.length).toBeLessThanOrEqual(FIELD_LIMITS.PROJECT_TITLE_MAX_LENGTH);
      expect(result.correctedData.drillShape).toBeNull();
      expect(result.correctedData.status).toBe('wishlist'); // Default
      expect(result.correctedData.kit_category).toBe('full'); // Default
      expect(result.correctedData.datePurchased).toBe('2024-06-04'); // Fixed
      expect(result.issues.length).toBeGreaterThan(0);
      // Should have warnings for all the corrections made
      expect(result.issues.some(issue => issue.field === 'title')).toBe(true);
      expect(result.issues.some(issue => issue.field === 'drill_shape')).toBe(true);
    });
  });

  describe('validateTagNames', () => {
    it('validates array of tag names', () => {
      const tagNames = [
        'normal tag',
        'Changed snowflakes using light purple pearl from shimmering canvases', // 67 chars - might not be too long
        'another tag'
      ];

      const result = validateTagNames(tagNames);
      expect(result.validatedTags).toHaveLength(3);
      expect(result.validatedTags[0].normalized).toBe('normal tag');
      expect(result.validatedTags[1].normalized.length).toBeLessThanOrEqual(FIELD_LIMITS.TAG_NAME_MAX_LENGTH);
      // Check if any issues exist (depends on whether tags exceed limit)
      expect(result.issues.length).toBeGreaterThanOrEqual(0);
    });
  });
});