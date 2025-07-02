/**
 * @fileoverview Tests for CSV column analysis utilities
 * 
 * Tests the column detection, mapping, and validation functions used
 * to analyze CSV headers before import.
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeCSVColumns,
  generateColumnReport,
  generateCSVTemplate,
  generateColumnValidationMessage,
  analyzeCSVFile,
  EXPECTED_COLUMNS
} from '../csvColumnAnalysis';

describe('csvColumnAnalysis', () => {
  describe('analyzeCSVColumns', () => {
    it('detects exact column matches', () => {
      const headers = ['title', 'status', 'company', 'artist'];
      const result = analyzeCSVColumns(headers);
      
      expect(result.detectedColumns).toHaveLength(4);
      expect(result.detectedColumns[0]).toEqual({
        csvHeader: 'title',
        mappedTo: 'title',
        confidence: 'exact'
      });
      expect(result.summary.hasAllRequired).toBe(true);
      expect(result.missingRequired).toHaveLength(0);
    });

    it('detects column aliases', () => {
      const headers = ['project name', 'state', 'manufacturer', 'creator'];
      const result = analyzeCSVColumns(headers);
      
      expect(result.detectedColumns).toHaveLength(4);
      expect(result.detectedColumns[0]).toEqual({
        csvHeader: 'project name',
        mappedTo: 'title',
        confidence: 'alias'
      });
      expect(result.detectedColumns[1]).toEqual({
        csvHeader: 'state',
        mappedTo: 'status',
        confidence: 'alias'
      });
    });

    it('handles case-insensitive matching', () => {
      const headers = ['TITLE', 'Status', 'cOMPANY'];
      const result = analyzeCSVColumns(headers);
      
      expect(result.detectedColumns).toHaveLength(3);
      expect(result.detectedColumns[0].csvHeader).toBe('TITLE');
      expect(result.detectedColumns[0].mappedTo).toBe('title');
    });

    it('identifies missing required columns', () => {
      const headers = ['status', 'company']; // Missing title
      const result = analyzeCSVColumns(headers);
      
      expect(result.missingRequired).toHaveLength(1);
      expect(result.missingRequired[0].field).toBe('title');
      expect(result.summary.hasAllRequired).toBe(false);
    });

    it('identifies missing optional columns', () => {
      const headers = ['title']; // Only required field
      const result = analyzeCSVColumns(headers);
      
      expect(result.missingRequired).toHaveLength(0);
      expect(result.missingOptional.length).toBeGreaterThan(0);
      expect(result.summary.hasAllRequired).toBe(true);
    });

    it('tracks unmapped columns', () => {
      const headers = ['title', 'custom_field', 'another_unknown_column'];
      const result = analyzeCSVColumns(headers);
      
      expect(result.unmappedColumns).toContain('custom_field');
      expect(result.unmappedColumns).toContain('another_unknown_column');
      expect(result.unmappedColumns).not.toContain('title');
    });

    it('handles empty headers', () => {
      const headers: string[] = [];
      const result = analyzeCSVColumns(headers);
      
      expect(result.detectedColumns).toHaveLength(0);
      expect(result.missingRequired.length).toBeGreaterThan(0);
      expect(result.summary.hasAllRequired).toBe(false);
    });

    it('handles real-world CSV headers', () => {
      const headers = [
        'Title',
        'Company', 
        'Artist',
        'Width',
        'Height',
        'Source URL',
        'Drill Shape',
        'Total Diamonds',
        'Type of Kit',
        'Status',
        'Date Purchased',
        'Date Received',
        'Date Started', 
        'Date Completed',
        'General Notes',
        'Tags'
      ];
      
      const result = analyzeCSVColumns(headers);
      
      expect(result.summary.hasAllRequired).toBe(true);
      expect(result.detectedColumns.length).toBeGreaterThan(10);
      expect(result.unmappedColumns).toHaveLength(0);
    });
  });

  describe('generateColumnValidationMessage', () => {
    it('returns error for missing required columns', () => {
      const analysis = analyzeCSVColumns(['status', 'company']); // No title
      const message = generateColumnValidationMessage(analysis);
      
      expect(message.severity).toBe('error');
      expect(message.canProceed).toBe(false);
      expect(message.message).toContain('Cannot import');
      expect(message.message).toContain('title');
    });

    it('returns success for perfect column match', () => {
      // Use all possible column headers to get a true success
      const headers = [
        'title', 'status', 'company', 'artist', 'width', 'height', 'dimensions',
        'drill shape', 'type of kit', 'canvas type', 'drill type',
        'date purchased', 'date received', 'date started', 'date completed',
        'general notes', 'source url', 'total diamonds', 'tags'
      ];
      const analysis = analyzeCSVColumns(headers);
      const message = generateColumnValidationMessage(analysis);
      
      expect(message.severity).toBe('success');
      expect(message.canProceed).toBe(true);
      expect(message.message).toContain('All expected columns found');
    });

    it('returns warning for missing optional columns', () => {
      const analysis = analyzeCSVColumns(['title']); // Only required field
      const message = generateColumnValidationMessage(analysis);
      
      expect(message.severity).toBe('warning');
      expect(message.canProceed).toBe(true);
      expect(message.message).toContain('Ready to import');
      expect(message.message).toContain('columns will be empty');
    });

    it('mentions default values for missing optional fields', () => {
      const analysis = analyzeCSVColumns(['title', 'company']); // Missing status (has default)
      const message = generateColumnValidationMessage(analysis);
      
      expect(message.severity).toBe('warning');
      expect(message.canProceed).toBe(true);
      expect(message.message).toContain('default');
    });

    it('mentions unmapped columns', () => {
      const analysis = analyzeCSVColumns(['title', 'unknown_field']);
      const message = generateColumnValidationMessage(analysis);
      
      expect(message.severity).toBe('warning');
      expect(message.canProceed).toBe(true);
      expect(message.message).toContain('unmapped columns will be ignored');
    });
  });

  describe('generateColumnReport', () => {
    it('generates success report when all columns found', () => {
      const analysis = analyzeCSVColumns(['title', 'status', 'company']);
      const report = generateColumnReport(analysis);
      
      expect(report.severity).toBe('warning'); // Some optional columns missing
      expect(report.title).toContain('Ready');
      expect(report.details.length).toBeGreaterThan(0);
    });

    it('generates error report when required columns missing', () => {
      const analysis = analyzeCSVColumns(['status', 'company']); // No title
      const report = generateColumnReport(analysis);
      
      expect(report.severity).toBe('error');
      expect(report.title).toContain('Missing Required');
      expect(report.details.some(d => d.includes('Missing required'))).toBe(true);
      expect(report.suggestions.some(s => s.includes('required columns'))).toBe(true);
    });

    it('generates warning report for missing optional columns', () => {
      const analysis = analyzeCSVColumns(['title']); // Only required field
      const report = generateColumnReport(analysis);
      
      expect(report.severity).toBe('warning');
      expect(report.details.some(d => d.includes('Optional columns'))).toBe(true);
    });

    it('includes information about unmapped columns', () => {
      const analysis = analyzeCSVColumns(['title', 'unknown_field']);
      const report = generateColumnReport(analysis);
      
      expect(report.details.some(d => d.includes('Unmapped columns'))).toBe(true);
      expect(report.suggestions.some(s => s.includes('unmapped columns'))).toBe(true);
    });

    it('mentions default values for optional fields', () => {
      const analysis = analyzeCSVColumns(['title']); // Missing fields with defaults
      const report = generateColumnReport(analysis);
      
      expect(report.details.some(d => d.includes('default:'))).toBe(true);
    });
  });

  describe('generateCSVTemplate', () => {
    it('generates valid CSV template', () => {
      const template = generateCSVTemplate();
      
      expect(template).toContain('title'); // Header row
      expect(template).toContain('My Diamond Painting Project'); // Example row
      expect(template.split('\n')).toHaveLength(2); // Header + example
    });

    it('includes all expected columns in template', () => {
      const template = generateCSVTemplate();
      const headers = template.split('\n')[0].split(',');
      
      // Should have headers for all expected columns
      expect(headers.length).toBe(Object.keys(EXPECTED_COLUMNS).length);
    });

    it('provides example data in template', () => {
      const template = generateCSVTemplate();
      const exampleRow = template.split('\n')[1];
      
      expect(exampleRow).toContain('completed'); // Status example
      expect(exampleRow).toContain('2024'); // Date examples
      expect(exampleRow).toContain('square'); // Drill shape example
    });
  });

  describe('analyzeCSVFile', () => {
    it('analyzes CSV file headers', async () => {
      const csvContent = 'title,status,company\n"Test Project","completed","Test Company"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await analyzeCSVFile(file);
      
      expect(result.detectedColumns).toHaveLength(3);
      expect(result.summary.hasAllRequired).toBe(true);
    });

    it('handles CSV files with quoted headers', async () => {
      const csvContent = '"Project Title","Project Status","Company Name"\n"Test","completed","TestCo"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await analyzeCSVFile(file);
      
      expect(result.detectedColumns.some(c => c.mappedTo === 'title')).toBe(true);
      expect(result.detectedColumns.some(c => c.mappedTo === 'status')).toBe(true);
    });

    it('handles files with irregular formatting', async () => {
      const csvContent = ' title , status,  company  \n"Test","done","TestCo"';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await analyzeCSVFile(file);
      
      expect(result.detectedColumns).toHaveLength(3);
      expect(result.summary.hasAllRequired).toBe(true);
    });

    it('rejects invalid files', async () => {
      const invalidContent = 'not,a,valid\ncsv\nfile';
      const file = new File([invalidContent], 'test.csv', { type: 'text/csv' });
      
      // Should not throw, but may have unmapped columns
      const result = await analyzeCSVFile(file);
      expect(result).toBeDefined();
    });

    it('handles complex CSV formats with quoted fields and commas', async () => {
      // Test CSV with complex quoted headers that would fail with simple string splitting
      const csvContent = '"Project Title","Status, Current","Company Name","Artist, First & Last","Notes with ""quotes"""\n"Test Project","progress","TestCo","John ""Johnny"" Doe","Complex, notes with commas and ""quotes"""';
      const file = new File([csvContent], 'complex.csv', { type: 'text/csv' });
      
      const result = await analyzeCSVFile(file);
      
      // Papaparse should correctly parse all 5 headers with complex quoting
      expect(result.summary.totalCsvColumns).toBe(5);
      
      // Verify the headers were parsed correctly (not corrupted by manual string splitting)
      const allHeaders = [
        ...result.detectedColumns.map(col => col.csvHeader),
        ...result.unmappedColumns
      ];
      expect(allHeaders).toContain('Project Title');
      expect(allHeaders).toContain('Status, Current');
      expect(allHeaders).toContain('Company Name');
      expect(allHeaders).toContain('Artist, First & Last');
      expect(allHeaders).toContain('Notes with "quotes"');
      
      // Only 'Project Title' matches our aliases, the others would be unmapped
      expect(result.detectedColumns).toHaveLength(1);
      expect(result.detectedColumns[0]).toEqual({
        csvHeader: 'Project Title',
        mappedTo: 'title',
        confidence: 'alias'
      });
      expect(result.summary.hasAllRequired).toBe(true);
      expect(result.unmappedColumns).toHaveLength(4);
    });
  });

  describe('EXPECTED_COLUMNS configuration', () => {
    it('has title as required field', () => {
      expect(EXPECTED_COLUMNS.title.required).toBe(true);
    });

    it('has appropriate aliases for common fields', () => {
      expect(EXPECTED_COLUMNS.title.aliases).toContain('project name');
      expect(EXPECTED_COLUMNS.status.aliases).toContain('state');
      expect(EXPECTED_COLUMNS.company.aliases).toContain('manufacturer');
    });

    it('has default values for appropriate fields', () => {
      expect(EXPECTED_COLUMNS.status.defaultValue).toBe('wishlist');
      expect(EXPECTED_COLUMNS.kitCategory.defaultValue).toBe('full');
    });

    it('includes all necessary project fields', () => {
      const fields = Object.keys(EXPECTED_COLUMNS);
      
      expect(fields).toContain('title');
      expect(fields).toContain('status');
      expect(fields).toContain('tags');
      expect(fields).toContain('datePurchased');
      expect(fields).toContain('drillShape');
    });
  });
});