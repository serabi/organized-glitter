/**
 * Field mapping utilities for camelCase ↔ snake_case conversion
 * @author @serabi
 * @created 2025-01-16
 */

import { FieldMapping } from './types';

export class FieldMapper {
  private mapping: FieldMapping;
  private reverseMapping: Record<string, string>;

  constructor(mapping: FieldMapping = {}) {
    this.mapping = mapping;
    this.reverseMapping = this.createReverseMapping(mapping);
  }

  /**
   * Create reverse mapping for snake_case to camelCase
   */
  private createReverseMapping(mapping: FieldMapping): Record<string, string> {
    const reverse: Record<string, string> = {};
    Object.entries(mapping).forEach(([camelCase, snake_case]) => {
      reverse[snake_case] = camelCase;
    });
    return reverse;
  }

  /**
   * Convert camelCase to snake_case
   */
  static camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Convert snake_case to camelCase
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Map frontend fields to backend fields for PocketBase
   */
  toBackend<T extends Record<string, unknown>>(frontendData: T): Record<string, unknown> {
    const backendData: Record<string, unknown> = {};

    Object.entries(frontendData).forEach(([frontendKey, value]) => {
      // Use explicit mapping first, then fallback to automatic conversion
      const backendKey = this.mapping[frontendKey] || FieldMapper.camelToSnake(frontendKey);

      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        backendData[backendKey] = this.toBackend(value as Record<string, unknown>);
      } else {
        backendData[backendKey] = value;
      }
    });

    return backendData;
  }

  /**
   * Map backend fields to frontend fields from PocketBase
   */
  toFrontend<T extends Record<string, unknown>>(backendData: T): Record<string, unknown> {
    const frontendData: Record<string, unknown> = {};

    Object.entries(backendData).forEach(([backendKey, value]) => {
      // Use explicit reverse mapping first, then fallback to automatic conversion
      const frontendKey = this.reverseMapping[backendKey] || FieldMapper.snakeToCamel(backendKey);

      // Handle nested objects
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        frontendData[frontendKey] = this.toFrontend(value as Record<string, unknown>);
      } else {
        frontendData[frontendKey] = value;
      }
    });

    return frontendData;
  }

  /**
   * Map filter fields to backend format
   */
  mapFilterFields(filter: Record<string, unknown>): Record<string, unknown> {
    const mappedFilter: Record<string, unknown> = {};

    Object.entries(filter).forEach(([key, value]) => {
      const backendKey = this.mapping[key] || FieldMapper.camelToSnake(key);
      mappedFilter[backendKey] = value;
    });

    return mappedFilter;
  }

  /**
   * Get backend field name for a frontend field
   */
  getBackendField(frontendField: string): string {
    return this.mapping[frontendField] || FieldMapper.camelToSnake(frontendField);
  }

  /**
   * Get frontend field name for a backend field
   */
  getFrontendField(backendField: string): string {
    return this.reverseMapping[backendField] || FieldMapper.snakeToCamel(backendField);
  }

  /**
   * Validate that frontend data matches expected structure
   */
  validateFrontendData<T>(data: unknown, requiredFields: (keyof T)[]): data is T {
    if (!data || typeof data !== 'object') {
      return false;
    }

    return requiredFields.every(field => {
      const fieldName = String(field);
      return fieldName in (data as Record<string, unknown>);
    });
  }

  /**
   * Create a field mapper with common PocketBase mappings
   */
  static createWithCommonMappings(additionalMappings: FieldMapping = {}): FieldMapper {
    const commonMappings: FieldMapping = {
      // Common datetime fields
      dateCreated: 'date_created',
      dateUpdated: 'date_updated',
      dateReceived: 'date_received',
      datePurchased: 'date_purchased',
      dateCompleted: 'date_completed',

      // Common user fields
      userId: 'user_id',
      userName: 'user_name',
      userEmail: 'user_email',

      // Common project fields
      projectId: 'project_id',
      projectName: 'project_name',
      projectStatus: 'project_status',

      // Common metadata fields
      metaData: 'meta_data',
      isActive: 'is_active',
      isPublic: 'is_public',
      isDeleted: 'is_deleted',

      // File fields
      fileName: 'file_name',
      fileSize: 'file_size',
      fileType: 'file_type',

      ...additionalMappings,
    };

    return new FieldMapper(commonMappings);
  }

  /**
   * Process an array of records
   */
  mapArrayToFrontend<T extends Record<string, unknown>>(
    backendArray: T[]
  ): Record<string, unknown>[] {
    return backendArray.map(item => this.toFrontend(item));
  }

  /**
   * Process an array of records for backend
   */
  mapArrayToBackend<T extends Record<string, unknown>>(
    frontendArray: T[]
  ): Record<string, unknown>[] {
    return frontendArray.map(item => this.toBackend(item));
  }

  /**
   * Merge multiple field mappings
   */
  static mergeMappings(...mappings: FieldMapping[]): FieldMapping {
    return Object.assign({}, ...mappings);
  }

  /**
   * Create field mapping from a type definition
   */
  static createMappingFromType<T extends Record<string, unknown>>(
    sampleObject: T,
    customMappings: FieldMapping = {}
  ): FieldMapping {
    const autoMapping: FieldMapping = {};

    Object.keys(sampleObject).forEach(key => {
      if (!(key in customMappings)) {
        autoMapping[key] = FieldMapper.camelToSnake(key);
      }
    });

    return { ...autoMapping, ...customMappings };
  }
}
