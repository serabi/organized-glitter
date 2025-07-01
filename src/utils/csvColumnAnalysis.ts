/**
 * @fileoverview CSV column analysis and validation utilities
 * 
 * Provides functions to analyze CSV headers, detect missing columns,
 * and provide user feedback about column mapping for CSV imports.
 * 
 * @version 1.0.0
 * @since 2025-07-01
 */

import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('CSVColumnAnalysis');

/**
 * Expected CSV column mappings with possible header variations
 */
export const EXPECTED_COLUMNS = {
  // Required fields
  title: {
    aliases: ['title', 'name', 'project name', 'project title', 'project_name', 'project_title'],
    required: true,
    description: 'Project title or name'
  },
  
  // Core project fields
  status: {
    aliases: ['status', 'state', 'project status', 'project_status'],
    required: false,
    description: 'Project status (wishlist, purchased, progress, completed, etc.)',
    defaultValue: 'wishlist'
  },
  
  company: {
    aliases: ['company', 'manufacturer', 'brand'],
    required: false,
    description: 'Company or manufacturer name'
  },
  
  artist: {
    aliases: ['artist', 'creator', 'designer'],
    required: false,
    description: 'Artist or designer name'
  },
  
  // Dimensions
  width: {
    aliases: ['width'],
    required: false,
    description: 'Canvas width (in cm or inches)'
  },
  
  height: {
    aliases: ['height', 'length'],
    required: false,
    description: 'Canvas height (in cm or inches)'
  },
  
  dimensions: {
    aliases: ['dimensions'],
    required: false,
    description: 'Combined dimensions (e.g., "30x40")'
  },
  
  // Project details
  drillShape: {
    aliases: ['drill shape', 'shape', 'drill_shape'],
    required: false,
    description: 'Drill shape (round or square)'
  },
  
  kitCategory: {
    aliases: ['type of kit', 'kit category', 'category', 'kit_category'],
    required: false,
    description: 'Kit category (full or mini)',
    defaultValue: 'full'
  },
  
  canvasType: {
    aliases: ['canvas type', 'canvas', 'canvas_type'],
    required: false,
    description: 'Canvas type'
  },
  
  drillType: {
    aliases: ['drill type', 'drilltype', 'drill_type'],
    required: false,
    description: 'Drill type'
  },
  
  // Dates
  datePurchased: {
    aliases: ['date purchased', 'date_purchased', 'purchase date', 'purchased'],
    required: false,
    description: 'Date when project was purchased (YYYY-MM-DD)'
  },
  
  dateReceived: {
    aliases: ['date received', 'date_received', 'received date', 'received'],
    required: false,
    description: 'Date when project was received (YYYY-MM-DD)'
  },
  
  dateStarted: {
    aliases: ['date started', 'date_started', 'start date', 'started'],
    required: false,
    description: 'Date when project was started (YYYY-MM-DD)'
  },
  
  dateCompleted: {
    aliases: ['date completed', 'date_completed', 'completion date', 'completed'],
    required: false,
    description: 'Date when project was completed (YYYY-MM-DD)'
  },
  
  // Additional fields
  generalNotes: {
    aliases: ['notes', 'general notes', 'general_notes', 'description'],
    required: false,
    description: 'General notes or description'
  },
  
  sourceUrl: {
    aliases: ['source url', 'url', 'source', 'link', 'source_url'],
    required: false,
    description: 'Source URL or link'
  },
  
  totalDiamonds: {
    aliases: ['total diamonds', 'diamond count', 'diamonds', 'count', 'total_diamonds'],
    required: false,
    description: 'Total number of diamonds'
  },
  
  tags: {
    aliases: ['tags', 'tag', 'labels'],
    required: false,
    description: 'Tags separated by semicolons (;)'
  }
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
  
  // Summary
  summary: {
    totalCsvColumns: number;
    mappedColumns: number;
    missingRequiredCount: number;
    missingOptionalCount: number;
    hasAllRequired: boolean;
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
  const mappedHeaderIndices = new Set<number>();

  logger.debug('Analyzing CSV columns', { csvHeaders, normalizedHeaders });

  // Check each expected column against CSV headers
  for (const [fieldKey, fieldConfig] of Object.entries(EXPECTED_COLUMNS)) {
    const field = fieldKey as ExpectedColumnKey;
    let found = false;

    // Check for exact matches first, then aliases
    for (const alias of fieldConfig.aliases) {
      const aliasNormalized = alias.toLowerCase().trim();
      const headerIndex = normalizedHeaders.findIndex(h => h === aliasNormalized);
      
      if (headerIndex !== -1) {
        detectedColumns.push({
          csvHeader: csvHeaders[headerIndex],
          mappedTo: field,
          confidence: alias === field ? 'exact' : 'alias'
        });
        mappedHeaderIndices.add(headerIndex);
        found = true;
        break;
      }
    }

    // Track missing columns
    if (!found) {
      if (fieldConfig.required) {
        missingRequired.push({
          field,
          description: fieldConfig.description,
          aliases: [...fieldConfig.aliases] // Convert readonly to mutable array
        });
      } else {
        missingOptional.push({
          field,
          description: fieldConfig.description,
          aliases: [...fieldConfig.aliases], // Convert readonly to mutable array
          defaultValue: 'defaultValue' in fieldConfig ? fieldConfig.defaultValue : undefined
        });
      }
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
    summary: {
      totalCsvColumns: csvHeaders.length,
      mappedColumns: detectedColumns.length,
      missingRequiredCount: missingRequired.length,
      missingOptionalCount: missingOptional.length,
      hasAllRequired: missingRequired.length === 0
    }
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
  const { summary, missingRequired, missingOptional, unmappedColumns } = analysis;
  
  if (!summary.hasAllRequired) {
    const missingFields = missingRequired.map(m => m.field).join(', ');
    return {
      message: `Cannot import: Missing required columns (${missingFields}). Please add these columns to your CSV file.`,
      severity: 'error',
      canProceed: false
    };
  }

  if (missingOptional.length === 0 && unmappedColumns.length === 0) {
    return {
      message: `All expected columns found and mapped successfully. Ready to import ${summary.mappedColumns} columns.`,
      severity: 'success',
      canProceed: true
    };
  }

  let message = `Ready to import with ${summary.mappedColumns} columns mapped.`;
  
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
    canProceed: true
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
  const { summary, detectedColumns, missingRequired, missingOptional, unmappedColumns } = analysis;
  
  let severity: 'success' | 'warning' | 'error' = 'success';
  let title = 'CSV Column Analysis';
  const details: string[] = [];
  const suggestions: string[] = [];

  // Determine severity
  if (missingRequired.length > 0) {
    severity = 'error';
    title = 'Missing Required Columns';
  } else if (missingOptional.length > 0 || unmappedColumns.length > 0) {
    severity = 'warning';
    title = 'CSV Import Ready with Notes';
  } else {
    title = 'All Expected Columns Found';
  }

  // Summary details
  details.push(`Found ${summary.mappedColumns} out of ${Object.keys(EXPECTED_COLUMNS).length} expected columns`);
  
  if (detectedColumns.length > 0) {
    details.push(`Mapped columns: ${detectedColumns.map(c => c.csvHeader).join(', ')}`);
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
      details.push(`Optional columns with defaults: ${optionalWithDefaults.map(m => `${m.field} (default: ${m.defaultValue})`).join(', ')}`);
    }
    
    if (optionalWithoutDefaults.length > 0) {
      details.push(`Optional columns that will be empty: ${optionalWithoutDefaults.map(m => m.field).join(', ')}`);
    }
  }

  // Unmapped columns
  if (unmappedColumns.length > 0) {
    details.push(`Unmapped columns (will be ignored): ${unmappedColumns.join(', ')}`);
    suggestions.push('Review unmapped columns - they might contain useful data with slightly different names');
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
    'landscape;nature;completed 2024' // tags
  ];

  // Create CSV content
  const csvContent = [
    headers.join(','),
    exampleRow.map(value => `"${value}"`).join(',')
  ].join('\n');

  return csvContent;
}

/**
 * Analyze CSV file headers without parsing the entire file
 */
export async function analyzeCSVFile(file: File): Promise<ColumnAnalysisResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const firstLine = text.split('\n')[0];
        const headers = firstLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        
        const analysis = analyzeCSVColumns(headers);
        resolve(analysis);
      } catch (error) {
        reject(new Error(`Failed to analyze CSV headers: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    // Read only the first 1KB to get headers
    const blob = file.slice(0, 1024);
    reader.readAsText(blob);
  });
}