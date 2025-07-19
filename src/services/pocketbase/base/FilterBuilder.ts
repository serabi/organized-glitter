/**
 * Type-safe filter builder for PocketBase queries
 * @author @serabi
 * @created 2025-01-16
 */

import { StructuredFilter, FilterCondition, FilterGroup, FilterOperator } from './types';

export class FilterBuilder {
  private conditions: FilterCondition[] = [];
  private groups: FilterGroup[] = [];
  private logic: 'AND' | 'OR' = 'AND';

  /**
   * Add a filter condition
   */
  where(field: string, operator: FilterOperator, value: unknown): FilterBuilder {
    this.conditions.push({ field, operator, value });
    return this;
  }

  /**
   * Add an equals condition
   */
  equals(field: string, value: unknown): FilterBuilder {
    return this.where(field, '=', value);
  }

  /**
   * Add a not equals condition
   */
  notEquals(field: string, value: unknown): FilterBuilder {
    return this.where(field, '!=', value);
  }

  /**
   * Add a greater than condition
   */
  greaterThan(field: string, value: unknown): FilterBuilder {
    return this.where(field, '>', value);
  }

  /**
   * Add a greater than or equal condition
   */
  greaterThanOrEqual(field: string, value: unknown): FilterBuilder {
    return this.where(field, '>=', value);
  }

  /**
   * Add a less than condition
   */
  lessThan(field: string, value: unknown): FilterBuilder {
    return this.where(field, '<', value);
  }

  /**
   * Add a less than or equal condition
   */
  lessThanOrEqual(field: string, value: unknown): FilterBuilder {
    return this.where(field, '<=', value);
  }

  /**
   * Add a contains/like condition
   */
  contains(field: string, value: string): FilterBuilder {
    return this.where(field, '~', value);
  }

  /**
   * Add a not contains condition
   */
  notContains(field: string, value: string): FilterBuilder {
    return this.where(field, '!~', value);
  }

  /**
   * Add an "in" condition (any of the values)
   */
  in(field: string, values: unknown[]): FilterBuilder {
    return this.where(field, '?=', values);
  }

  /**
   * Add a "not in" condition
   */
  notIn(field: string, values: unknown[]): FilterBuilder {
    return this.where(field, '?!=', values);
  }

  /**
   * Set the logic operator for conditions
   */
  setLogic(logic: 'AND' | 'OR'): FilterBuilder {
    this.logic = logic;
    return this;
  }

  /**
   * Add a group of conditions
   */
  group(callback: (builder: FilterBuilder) => FilterBuilder): FilterBuilder {
    const groupBuilder = new FilterBuilder();
    callback(groupBuilder);
    const group = groupBuilder.build();

    if (group.conditions && group.conditions.length > 0) {
      this.groups.push({
        conditions: group.conditions,
        logic: group.logic || 'AND',
      });
    }

    return this;
  }

  /**
   * Build the structured filter object
   */
  build(): StructuredFilter {
    return {
      conditions: this.conditions.length > 0 ? this.conditions : undefined,
      groups: this.groups.length > 0 ? this.groups : undefined,
      logic: this.logic,
    };
  }

  /**
   * Convert structured filter to PocketBase filter string
   */
  static toFilterString(filter: StructuredFilter, fieldMapping?: Record<string, string>): string {
    const parts: string[] = [];

    // Process conditions
    if (filter.conditions) {
      const conditionStrings = filter.conditions.map(condition =>
        this.conditionToString(condition, fieldMapping)
      );
      parts.push(conditionStrings.join(` ${filter.logic || 'AND'} `));
    }

    // Process groups
    if (filter.groups) {
      const groupStrings = filter.groups.map(group => {
        const groupConditions = group.conditions.map(condition =>
          this.conditionToString(condition, fieldMapping)
        );
        return `(${groupConditions.join(` ${group.logic} `)})`;
      });
      parts.push(groupStrings.join(` ${filter.logic || 'AND'} `));
    }

    return parts.join(` ${filter.logic || 'AND'} `);
  }

  /**
   * Convert a single condition to string
   */
  private static conditionToString(
    condition: FilterCondition,
    fieldMapping?: Record<string, string>
  ): string {
    const field = fieldMapping?.[condition.field] || condition.field;
    const { operator, value } = condition;

    // Handle arrays
    if (Array.isArray(value)) {
      if (operator.startsWith('?')) {
        // Handle arrays for "any" operators
        const arrayValue = value.map(v => `'${FilterBuilder.escapeValue(v)}'`).join(', ');
        return `${field} ${operator} (${arrayValue})`;
      } else {
        // Arrays with non-'?' operators are invalid
        throw new Error(
          `Invalid filter: Array values cannot be used with operator '${operator}' on field '${condition.field}'. ` +
            `Use array operators like '?=', '?!=', '?>', etc. instead.`
        );
      }
    }

    // Handle single values
    const escapedValue = FilterBuilder.escapeValue(value);
    return `${field} ${operator} '${escapedValue}'`;
  }

  /**
   * Escape special characters in filter values
   */
  private static escapeValue(value: unknown): string {
    if (value == null) return '';
    const str = String(value);
    return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
  }

  /**
   * Create a new FilterBuilder instance
   */
  static create(): FilterBuilder {
    return new FilterBuilder();
  }

  /**
   * Helper method to build common user-scoped filters
   */
  static forUser(userId: string): FilterBuilder {
    return FilterBuilder.create().equals('user', userId);
  }

  /**
   * Helper method to build date range filters
   */
  static dateRange(field: string, startDate: Date, endDate: Date): FilterBuilder {
    return FilterBuilder.create()
      .greaterThanOrEqual(field, startDate.toISOString())
      .lessThanOrEqual(field, endDate.toISOString());
  }

  /**
   * Helper method to build status filters
   */
  static withStatus(status: string | string[]): FilterBuilder {
    const builder = FilterBuilder.create();
    if (Array.isArray(status)) {
      return builder.in('status', status);
    }
    return builder.equals('status', status);
  }
}
