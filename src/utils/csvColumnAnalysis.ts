/**
 * @fileoverview CSV column analysis and validation utilities
 *
 * Provides functions to analyze CSV headers, detect missing columns,
 * and provide user feedback about column mapping for CSV imports.
 *
 * @version 1.0.0
 * @since 2025-07-01
 */

import Papa from 'papaparse';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CSVColumnAnalysis');

/**
 * Expected CSV column mappings with possible header variations
 */
export const EXPECTED_COLUMNS = {
  // Required fields
  title: {
    aliases: ['title', 'name', 'project name', 'project title', 'project_name', 'project_title'],
    required: true,
    description: 'Project title or name',
  },

  // Core project fields
  status: {
    aliases: ['status', 'state', 'project status', 'project_status'],
    required: false,
    description: 'Project status (wishlist, purchased, progress, completed, etc.)',
    defaultValue: 'wishlist',
  },

  company: {
    aliases: ['company', 'manufacturer', 'brand'],
    required: false,
    description: 'Company or manufacturer name',
  },

  artist: {
    aliases: ['artist', 'creator', 'designer'],
    required: false,
    description: 'Artist or designer name',
  },

  // Dimensions
  width: {
    aliases: ['width'],
    required: false,
    description: 'Canvas width (in cm or inches)',
  },

  height: {
    aliases: ['height', 'length'],
    required: false,
    description: 'Canvas height (in cm or inches)',
  },

  dimensions: {
    aliases: ['dimensions'],
    required: false,
    description: 'Combined dimensions (e.g., "30x40")',
  },

  // Project details
  drillShape: {
    aliases: ['drill shape', 'shape', 'drill_shape'],
    required: false,
    description: 'Drill shape (round or square)',
  },

  kitCategory: {
    aliases: ['type of kit', 'kit category', 'category', 'kit_category'],
    required: false,
    description: 'Kit category (full or mini)',
    defaultValue: 'full',
  },

  canvasType: {
    aliases: ['canvas type', 'canvas', 'canvas_type'],
    required: false,
    description: 'Canvas type',
  },

  drillType: {
    aliases: ['drill type', 'drilltype', 'drill_type'],
    required: false,
    description: 'Drill type',
  },

  // Dates
  datePurchased: {
    aliases: ['date purchased', 'date_purchased', 'purchase date', 'purchased'],
    required: false,
    description: 'Date when project was purchased (YYYY-MM-DD)',
  },

  dateReceived: {
    aliases: ['date received', 'date_received', 'received date', 'received'],
    required: false,
    description: 'Date when project was received (YYYY-MM-DD)',
  },

  dateStarted: {
    aliases: ['date started', 'date_started', 'start date', 'started'],
    required: false,
    description: 'Date when project was started (YYYY-MM-DD)',
  },

  dateCompleted: {
    aliases: ['date completed', 'date_completed', 'completion date', 'completed'],
    required: false,
    description: 'Date when project was completed (YYYY-MM-DD)',
  },

  // Additional fields
  generalNotes: {
    aliases: ['notes', 'general notes', 'general_notes', 'description'],
    required: false,
    description: 'General notes or description',
  },

  sourceUrl: {
    aliases: ['source url', 'url', 'source', 'link', 'source_url'],
    required: false,
    description: 'Source URL or link',
  },

  totalDiamonds: {
    aliases: ['total diamonds', 'diamond count', 'diamonds', 'count', 'total_diamonds'],
    required: false,
    description: 'Total number of diamonds',
  },

  tags: {
    aliases: ['tags', 'tag', 'labels'],
    required: false,
    description: 'Tags separated by semicolons (;)',
  },
} as const;

export type ExpectedColumnKey = keyof typeof EXPECTED_COLUMNS;

/**
 * Result of column analysis
 */
export interface ColumnAnalysisResult {
  // Detected columns
  detectedColumns: Array<{
    csvHeader: string;
    mappedTo: ExpectedColumnKey;
    confidence: 'exact' | 'alias' | 'fuzzy';
  }>;

  // Missing columns
  missingRequired: Array<{
    field: ExpectedColumnKey;
    description: string;
    aliases: string[];
  }>;

  missingOptional: Array<{
    field: ExpectedColumnKey;
    description: string;
    aliases: string[];
    defaultValue?: string;
  }>;

  // Unmapped columns
  unmappedColumns: string[];

  // Duplicate mappings
  duplicateMappings: Array<{
    field: ExpectedColumnKey;
    csvHeaders: string[];
    selectedHeader: string; // Which header will be used
    reason: string; // Why this header was selected
  }>;

  // Summary
  summary: {
    totalCsvColumns: number;
    mappedColumns: number;
    missingRequiredCount: number;
    missingOptionalCount: number;
    duplicateMappingsCount: number;
    hasAllRequired: boolean;
    hasDuplicateMappings: boolean;
  };
}

/**
 * Analyze CSV headers and detect column mappings
 */
export function analyzeCSVColumns(csvHeaders: string[]): ColumnAnalysisResult {
  const normalizedHeaders = csvHeaders.map(h => h.toLowerCase().trim());
  const detectedColumns: ColumnAnalysisResult['detectedColumns'] = [];
  const missingRequired: ColumnAnalysisResult['missingRequired'] = [];
  const missingOptional: ColumnAnalysisResult['missingOptional'] = [];
  const unmappedColumns: string[] = [];
  const duplicateMappings: ColumnAnalysisResult['duplicateMappings'] = [];
  const mappedHeaderIndices = new Set<number>();

  // Track all potential mappings for each field to detect duplicates
  const fieldMappings = new Map<
    ExpectedColumnKey,
    Array<{
      csvHeader: string;
      headerIndex: number;
      confidence: 'exact' | 'alias' | 'fuzzy';
      aliasIndex: number; // Position in aliases array (for priority)
    }>
  >();

  logger.debug('Analyzing CSV columns', { csvHeaders, normalizedHeaders });

  // First pass: Find all potential mappings for each field
  for (const [fieldKey, fieldConfig] of Object.entries(EXPECTED_COLUMNS)) {
    const field = fieldKey as ExpectedColumnKey;
    const potentialMappings: Array<{
      csvHeader: string;
      headerIndex: number;
      confidence: 'exact' | 'alias' | 'fuzzy';
      aliasIndex: number;
    }> = [];

    // Check for matches against all aliases
    fieldConfig.aliases.forEach((alias: string, aliasIndex: number) => {
      const aliasNormalized = alias.toLowerCase().trim();

      normalizedHeaders.forEach((header, headerIndex) => {
        if (header === aliasNormalized) {
          potentialMappings.push({
            csvHeader: csvHeaders[headerIndex],
            headerIndex,
            confidence: alias === field ? 'exact' : 'alias',
            aliasIndex,
          });
        }
      });
    });

    if (potentialMappings.length > 0) {
      fieldMappings.set(field, potentialMappings);
    }
  }

  // Second pass: Process mappings and detect duplicates
  for (const [fieldKey, fieldConfig] of Object.entries(EXPECTED_COLUMNS)) {
    const field = fieldKey as ExpectedColumnKey;
    const potentialMappings = fieldMappings.get(field);

    if (!potentialMappings || potentialMappings.length === 0) {
      // Track missing columns
      if (fieldConfig.required) {
        missingRequired.push({
          field,
          description: fieldConfig.description,
          aliases: [...fieldConfig.aliases],
        });
      } else {
        missingOptional.push({
          field,
          description: fieldConfig.description,
          aliases: [...fieldConfig.aliases],
          defaultValue: 'defaultValue' in fieldConfig ? fieldConfig.defaultValue : undefined,
        });
      }
      continue;
    }

    // Handle single mapping
    if (potentialMappings.length === 1) {
      const mapping = potentialMappings[0];
      detectedColumns.push({
        csvHeader: mapping.csvHeader,
        mappedTo: field,
        confidence: mapping.confidence,
      });
      mappedHeaderIndices.add(mapping.headerIndex);
    }
    // Handle duplicate mappings
    else {
      // Select the best mapping based on priority:
      // 1. Exact matches over aliases
      // 2. Earlier position in aliases array (higher priority)
      // 3. First occurrence in CSV if all else equal
      const bestMapping = potentialMappings.reduce((best, current) => {
        // Prefer exact matches
        if (best.confidence === 'exact' && current.confidence !== 'exact') {
          return best;
        }
        if (current.confidence === 'exact' && best.confidence !== 'exact') {
          return current;
        }

        // If same confidence level, prefer higher priority alias (lower index)
        if (current.aliasIndex < best.aliasIndex) {
          return current;
        }
        if (best.aliasIndex < current.aliasIndex) {
          return best;
        }

        // If same priority, prefer first occurrence in CSV
        return current.headerIndex < best.headerIndex ? current : best;
      });

      // Add the selected mapping
      detectedColumns.push({
        csvHeader: bestMapping.csvHeader,
        mappedTo: field,
        confidence: bestMapping.confidence,
      });
      mappedHeaderIndices.add(bestMapping.headerIndex);

      // Track the duplicate mapping
      const reasonParts = [];
      if (bestMapping.confidence === 'exact') {
        reasonParts.push('exact field name match');
      } else {
        reasonParts.push(`primary alias "${fieldConfig.aliases[bestMapping.aliasIndex]}"`);
      }

      if (potentialMappings.some(m => m.headerIndex < bestMapping.headerIndex)) {
        reasonParts.push('appears first in CSV');
      }

      duplicateMappings.push({
        field,
        csvHeaders: potentialMappings.map(m => m.csvHeader),
        selectedHeader: bestMapping.csvHeader,
        reason: reasonParts.join(', '),
      });
    }
  }

  // Find unmapped columns
  csvHeaders.forEach((header, index) => {
    if (!mappedHeaderIndices.has(index)) {
      unmappedColumns.push(header);
    }
  });

  const result: ColumnAnalysisResult = {
    detectedColumns,
    missingRequired,
    missingOptional,
    unmappedColumns,
    duplicateMappings,
    summary: {
      totalCsvColumns: csvHeaders.length,
      mappedColumns: detectedColumns.length,
      missingRequiredCount: missingRequired.length,
      missingOptionalCount: missingOptional.length,
      duplicateMappingsCount: duplicateMappings.length,
      hasAllRequired: missingRequired.length === 0,
      hasDuplicateMappings: duplicateMappings.length > 0,
    },
  };

  logger.debug('Column analysis completed', result);
  return result;
}

/**
 * Generate detailed column validation message for user feedback
 */
export function generateColumnValidationMessage(analysis: ColumnAnalysisResult): {
  message: string;
  severity: 'success' | 'warning' | 'error';
  canProceed: boolean;
} {
  const { summary, missingRequired, missingOptional, unmappedColumns, duplicateMappings } =
    analysis;

  if (!summary.hasAllRequired) {
    const missingFields = missingRequired.map(m => m.field).join(', ');
    return {
      message: `Cannot import: Missing required columns (${missingFields}). Please add these columns to your CSV file.`,
      severity: 'error',
      canProceed: false,
    };
  }

  // Check for perfect scenario (no issues at all)
  if (
    missingOptional.length === 0 &&
    unmappedColumns.length === 0 &&
    duplicateMappings.length === 0
  ) {
    return {
      message: `All expected columns found and mapped successfully. Ready to import ${summary.mappedColumns} columns.`,
      severity: 'success',
      canProceed: true,
    };
  }

  let message = `Ready to import with ${summary.mappedColumns} columns mapped.`;

  // Handle duplicate mappings first (most important warning)
  if (duplicateMappings.length > 0) {
    message += ` WARNING: ${duplicateMappings.length} duplicate column mapping${duplicateMappings.length > 1 ? 's' : ''} detected.`;
    const duplicateDetails = duplicateMappings
      .map(dup => `${dup.field}: using "${dup.selectedHeader}" (${dup.reason})`)
      .join('; ');
    message += ` ${duplicateDetails}.`;
  }

  if (missingOptional.length > 0) {
    const withDefaults = missingOptional.filter(m => m.defaultValue);
    const withoutDefaults = missingOptional.filter(m => !m.defaultValue);

    if (withDefaults.length > 0) {
      message += ` Missing optional columns will use defaults: ${withDefaults.map(m => `${m.field}=${m.defaultValue}`).join(', ')}.`;
    }

    if (withoutDefaults.length > 0) {
      message += ` ${withoutDefaults.length} optional columns will be empty.`;
    }
  }

  if (unmappedColumns.length > 0) {
    message += ` ${unmappedColumns.length} unmapped columns will be ignored.`;
  }

  return {
    message,
    severity: 'warning',
    canProceed: true,
  };
}

/**
 * Generate user-friendly column analysis report
 */
export function generateColumnReport(analysis: ColumnAnalysisResult): {
  title: string;
  severity: 'success' | 'warning' | 'error';
  details: string[];
  suggestions: string[];
} {
  const {
    summary,
    detectedColumns,
    missingRequired,
    missingOptional,
    unmappedColumns,
    duplicateMappings,
  } = analysis;

  let severity: 'success' | 'warning' | 'error' = 'success';
  let title = 'CSV Column Analysis';
  const details: string[] = [];
  const suggestions: string[] = [];

  // Determine severity
  if (missingRequired.length > 0) {
    severity = 'error';
    title = 'Missing Required Columns';
  } else if (
    missingOptional.length > 0 ||
    unmappedColumns.length > 0 ||
    duplicateMappings.length > 0
  ) {
    severity = 'warning';
    title = 'CSV Import Ready with Notes';
  } else {
    title = 'All Expected Columns Found';
  }

  // Summary details
  details.push(
    `Found ${summary.mappedColumns} out of ${Object.keys(EXPECTED_COLUMNS).length} expected columns`
  );

  if (detectedColumns.length > 0) {
    details.push(`Mapped columns: ${detectedColumns.map(c => c.csvHeader).join(', ')}`);
  }

  // Duplicate mappings (handle before other warnings since this is critical)
  if (duplicateMappings.length > 0) {
    details.push(
      `Duplicate column mappings: ${duplicateMappings.length} field${duplicateMappings.length > 1 ? 's' : ''} mapped to multiple CSV columns`
    );
    duplicateMappings.forEach(dup => {
      details.push(
        `  - ${dup.field}: "${dup.selectedHeader}" selected from [${dup.csvHeaders.join(', ')}] (${dup.reason})`
      );
    });
    suggestions.push(
      'Review duplicate column mappings - ensure the selected columns contain the data you want to import'
    );
  }

  // Missing required columns
  if (missingRequired.length > 0) {
    details.push(`Missing required columns: ${missingRequired.map(m => m.field).join(', ')}`);
    suggestions.push('Add the required columns to your CSV file before importing');
  }

  // Missing optional columns
  if (missingOptional.length > 0) {
    const optionalWithDefaults = missingOptional.filter(m => m.defaultValue);
    const optionalWithoutDefaults = missingOptional.filter(m => !m.defaultValue);

    if (optionalWithDefaults.length > 0) {
      details.push(
        `Optional columns with defaults: ${optionalWithDefaults.map(m => `${m.field} (default: ${m.defaultValue})`).join(', ')}`
      );
    }

    if (optionalWithoutDefaults.length > 0) {
      details.push(
        `Optional columns that will be empty: ${optionalWithoutDefaults.map(m => m.field).join(', ')}`
      );
    }
  }

  // Unmapped columns
  if (unmappedColumns.length > 0) {
    details.push(`Unmapped columns (will be ignored): ${unmappedColumns.join(', ')}`);
    suggestions.push(
      'Review unmapped columns - they might contain useful data with slightly different names'
    );
  }

  // Success case suggestions
  if (severity === 'success') {
    suggestions.push('Your CSV file is ready for import!');
  }

  return { title, severity, details, suggestions };
}

/**
 * Generate CSV template with all expected columns
 */
export function generateCSVTemplate(): string {
  const headers = Object.entries(EXPECTED_COLUMNS).map(([, config]) => {
    // Use the first (primary) alias as the header
    return config.aliases[0];
  });

  // Add example row
  const exampleRow = [
    'My Diamond Painting Project', // title
    'completed', // status
    'Diamond Art Club', // company
    'Jane Doe', // artist
    '30', // width
    '40', // height
    '', // dimensions (optional when width/height provided)
    'square', // drill shape
    'full', // kit category
    '', // canvas type
    '', // drill type
    '2024-01-15', // date purchased
    '2024-01-20', // date received
    '2024-02-01', // date started
    '2024-03-15', // date completed
    'Beautiful colors and great quality canvas', // notes
    'https://example.com/project', // source url
    '89000', // total diamonds
    'landscape;nature;completed 2024', // tags
  ];

  // Create CSV content
  const csvContent = [headers.join(','), exampleRow.map(value => `"${value}"`).join(',')].join(
    '\n'
  );

  return csvContent;
}

/**
 * Analyze CSV file headers without parsing the entire file
 * Uses papaparse to correctly handle quoted fields, escaped quotes, and other CSV edge cases
 */
export async function analyzeCSVFile(file: File): Promise<ColumnAnalysisResult> {
  return new Promise((resolve, reject) => {
    // Use papaparse to parse just the header row
    Papa.parse(file, {
      header: false, // We want raw array data, not objects
      preview: 1, // Only parse the first row (headers)
      skipEmptyLines: true,
      transformHeader: (name: string) => name.trim(), // Clean up header names
      complete: results => {
        try {
          if (results.errors && results.errors.length > 0) {
            logger.warn('CSV parsing warnings during header analysis:', results.errors);
          }

          if (!results.data || results.data.length === 0) {
            reject(new Error('CSV file appears to be empty or has no valid header row'));
            return;
          }

          // Get the first row as headers
          const headerRow = results.data[0] as string[];
          if (!headerRow || headerRow.length === 0) {
            reject(new Error('CSV file has no columns in the header row'));
            return;
          }

          // Clean and validate headers
          const headers = headerRow
            .map(header => (header || '').toString().trim())
            .filter(header => header.length > 0); // Remove empty headers

          if (headers.length === 0) {
            reject(new Error('CSV file has no valid column headers'));
            return;
          }

          logger.debug('Successfully parsed CSV headers using papaparse', {
            headerCount: headers.length,
            headers: headers.slice(0, 10), // Log first 10 headers for debugging
          });

          const analysis = analyzeCSVColumns(headers);
          resolve(analysis);
        } catch (error) {
          reject(
            new Error(
              `Failed to analyze CSV headers: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          );
        }
      },
      error: error => {
        logger.error('Papaparse error during header analysis:', error);
        reject(new Error(`Failed to parse CSV file: ${error.message || 'Unknown parsing error'}`));
      },
    });
  });
}
