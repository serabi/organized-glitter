/**
 * Tests for service utility functions - FilterBuilder, FieldMapper, ErrorHandler
 * @author @serabi
 * @created 2025-07-16
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterBuilder } from '../FilterBuilder';
import type { StructuredFilter, FilterCondition } from '../types';

describe('Service Utilities', () => {
  describe('FilterBuilder', () => {
    let builder: FilterBuilder;

    beforeEach(() => {
      builder = FilterBuilder.create();
    });

    describe('Basic Conditions', () => {
      it('should create equals condition', () => {
        const filter = builder.equals('name', 'John').build();

        expect(filter.conditions).toEqual([{ field: 'name', operator: '=', value: 'John' }]);
        expect(filter.logic).toBe('AND');
      });

      it('should create not equals condition', () => {
        const filter = builder.notEquals('status', 'deleted').build();

        expect(filter.conditions).toEqual([{ field: 'status', operator: '!=', value: 'deleted' }]);
      });

      it('should create greater than condition', () => {
        const filter = builder.greaterThan('age', 18).build();

        expect(filter.conditions).toEqual([{ field: 'age', operator: '>', value: 18 }]);
      });

      it('should create greater than or equal condition', () => {
        const filter = builder.greaterThanOrEqual('score', 100).build();

        expect(filter.conditions).toEqual([{ field: 'score', operator: '>=', value: 100 }]);
      });

      it('should create less than condition', () => {
        const filter = builder.lessThan('price', 50).build();

        expect(filter.conditions).toEqual([{ field: 'price', operator: '<', value: 50 }]);
      });

      it('should create less than or equal condition', () => {
        const filter = builder.lessThanOrEqual('weight', 10.5).build();

        expect(filter.conditions).toEqual([{ field: 'weight', operator: '<=', value: 10.5 }]);
      });

      it('should create contains condition', () => {
        const filter = builder.contains('title', 'search term').build();

        expect(filter.conditions).toEqual([
          { field: 'title', operator: '~', value: 'search term' },
        ]);
      });

      it('should create not contains condition', () => {
        const filter = builder.notContains('description', 'spam').build();

        expect(filter.conditions).toEqual([
          { field: 'description', operator: '!~', value: 'spam' },
        ]);
      });

      it('should create in condition', () => {
        const filter = builder.in('category', ['tech', 'science', 'art']).build();

        expect(filter.conditions).toEqual([
          { field: 'category', operator: '?=', value: ['tech', 'science', 'art'] },
        ]);
      });

      it('should create not in condition', () => {
        const filter = builder.notIn('status', ['deleted', 'archived']).build();

        expect(filter.conditions).toEqual([
          { field: 'status', operator: '?!=', value: ['deleted', 'archived'] },
        ]);
      });
    });

    describe('Complex Conditions', () => {
      it('should chain multiple conditions with AND logic', () => {
        const filter = builder
          .equals('status', 'active')
          .greaterThan('created', '2024-01-01')
          .contains('title', 'test')
          .build();

        expect(filter.conditions).toHaveLength(3);
        expect(filter.logic).toBe('AND');
      });

      it('should chain multiple conditions with OR logic', () => {
        const filter = builder
          .setLogic('OR')
          .equals('priority', 'high')
          .equals('urgent', true)
          .build();

        expect(filter.conditions).toHaveLength(2);
        expect(filter.logic).toBe('OR');
      });

      it('should handle custom where conditions', () => {
        const filter = builder.where('custom_field', '?>', [1, 2, 3]).build();

        expect(filter.conditions).toEqual([
          { field: 'custom_field', operator: '?>', value: [1, 2, 3] },
        ]);
      });
    });

    describe('Groups', () => {
      it('should create grouped conditions', () => {
        const filter = builder
          .equals('user', 'john')
          .group(subBuilder =>
            subBuilder.equals('status', 'draft').setLogic('OR').equals('status', 'pending')
          )
          .build();

        expect(filter.conditions).toHaveLength(1);
        expect(filter.groups).toHaveLength(1);
        expect(filter.groups![0].conditions).toHaveLength(2);
        expect(filter.groups![0].logic).toBe('OR');
      });

      it('should handle nested groups', () => {
        const filter = builder
          .equals('type', 'project')
          .group(subBuilder =>
            subBuilder
              .equals('status', 'active')
              .group(nestedBuilder =>
                nestedBuilder.greaterThan('priority', 5).lessThan('deadline', '2024-12-31')
              )
          )
          .build();

        expect(filter.conditions).toHaveLength(1);
        expect(filter.groups).toHaveLength(1);
      });

      it('should ignore empty groups', () => {
        const filter = builder
          .equals('status', 'active')
          .group(() => FilterBuilder.create()) // Empty group
          .build();

        expect(filter.conditions).toHaveLength(1);
        expect(filter.groups).toBeUndefined();
      });
    });

    describe('Static Helper Methods', () => {
      it('should create user-scoped filter', () => {
        const filter = FilterBuilder.forUser('user-123').build();

        expect(filter.conditions).toEqual([{ field: 'user', operator: '=', value: 'user-123' }]);
      });

      it('should create date range filter', () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const filter = FilterBuilder.dateRange('created', startDate, endDate).build();

        expect(filter.conditions).toHaveLength(2);
        expect(filter.conditions![0]).toEqual({
          field: 'created',
          operator: '>=',
          value: startDate.toISOString(),
        });
        expect(filter.conditions![1]).toEqual({
          field: 'created',
          operator: '<=',
          value: endDate.toISOString(),
        });
      });

      it('should create single status filter', () => {
        const filter = FilterBuilder.withStatus('active').build();

        expect(filter.conditions).toEqual([{ field: 'status', operator: '=', value: 'active' }]);
      });

      it('should create multiple status filter', () => {
        const filter = FilterBuilder.withStatus(['active', 'pending']).build();

        expect(filter.conditions).toEqual([
          { field: 'status', operator: '?=', value: ['active', 'pending'] },
        ]);
      });
    });

    describe('Filter String Conversion', () => {
      it('should convert simple conditions to filter string', () => {
        const filter: StructuredFilter = {
          conditions: [
            { field: 'name', operator: '=', value: 'John' },
            { field: 'age', operator: '>', value: 18 },
          ],
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe("name = 'John' AND age > '18'");
      });

      it('should convert OR conditions to filter string', () => {
        const filter: StructuredFilter = {
          conditions: [
            { field: 'status', operator: '=', value: 'active' },
            { field: 'status', operator: '=', value: 'pending' },
          ],
          logic: 'OR',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe("status = 'active' OR status = 'pending'");
      });

      it('should apply field mapping in filter string', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'datePurchased', operator: '>=', value: '2024-01-01' }],
          logic: 'AND',
        };

        const fieldMapping = {
          datePurchased: 'date_purchased',
        };

        const filterString = FilterBuilder.toFilterString(filter, fieldMapping);

        expect(filterString).toBe("date_purchased >= '2024-01-01'");
      });

      it('should handle array values in filter string', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'category', operator: '?=', value: ['tech', 'science'] }],
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe("category ?= ('tech', 'science')");
      });

      it('should handle grouped conditions in filter string', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'user', operator: '=', value: 'john' }],
          groups: [
            {
              conditions: [
                { field: 'status', operator: '=', value: 'draft' },
                { field: 'status', operator: '=', value: 'pending' },
              ],
              logic: 'OR',
            },
          ],
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe("user = 'john' AND (status = 'draft' OR status = 'pending')");
      });

      it('should escape special characters in values', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'title', operator: '~', value: 'John\'s "Project"' }],
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe("title ~ 'John\\'s \\\"Project\\\"'");
      });

      it('should handle null and undefined values', () => {
        const filter: StructuredFilter = {
          conditions: [
            { field: 'deleted_at', operator: '=', value: null },
            { field: 'archived_at', operator: '=', value: undefined },
          ],
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe("deleted_at = '' AND archived_at = ''");
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty filter', () => {
        const filter = builder.build();

        expect(filter.conditions).toBeUndefined();
        expect(filter.groups).toBeUndefined();
        expect(filter.logic).toBe('AND');
      });

      it('should handle filter with only groups', () => {
        const filter = builder.group(subBuilder => subBuilder.equals('status', 'active')).build();

        expect(filter.conditions).toBeUndefined();
        expect(filter.groups).toHaveLength(1);
      });

      it('should convert empty filter to empty string', () => {
        const filter: StructuredFilter = {
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe('');
      });

      it('should handle complex nested filters', () => {
        const filter = builder
          .equals('type', 'project')
          .setLogic('OR')
          .group(subBuilder =>
            subBuilder
              .equals('status', 'active')
              .greaterThan('priority', 5)
              .group(nestedBuilder =>
                nestedBuilder
                  .setLogic('OR')
                  .contains('title', 'urgent')
                  .contains('description', 'critical')
              )
          )
          .build();

        expect(filter.conditions).toHaveLength(1);
        expect(filter.groups).toHaveLength(1);
        expect(filter.logic).toBe('OR');
      });

      it('should handle very long arrays in in() conditions', () => {
        const longArray = Array.from({ length: 100 }, (_, i) => `item-${i}`);
        const filter = builder.in('id', longArray).build();

        expect(filter.conditions![0].value).toEqual(longArray);

        const filterString = FilterBuilder.toFilterString(filter);
        expect(filterString).toContain('?=');
        expect(filterString).toContain('item-0');
        expect(filterString).toContain('item-99');
      });

      it('should handle special characters in field names', () => {
        const filter = builder.equals('field_with_underscores', 'value').build();

        expect(filter.conditions).toEqual([
          { field: 'field_with_underscores', operator: '=', value: 'value' },
        ]);
      });

      it('should handle boolean values correctly', () => {
        const filter = builder.equals('is_active', true).equals('is_deleted', false).build();

        const filterString = FilterBuilder.toFilterString(filter);
        expect(filterString).toBe("is_active = 'true' AND is_deleted = 'false'");
      });

      it('should handle numeric values correctly', () => {
        const filter = builder
          .equals('integer_field', 42)
          .equals('float_field', 3.14159)
          .equals('zero_field', 0)
          .build();

        const filterString = FilterBuilder.toFilterString(filter);
        expect(filterString).toBe(
          "integer_field = '42' AND float_field = '3.14159' AND zero_field = '0'"
        );
      });
    });

    describe('Builder Pattern', () => {
      it('should support method chaining', () => {
        const result = FilterBuilder.create()
          .equals('status', 'active')
          .greaterThan('created', '2024-01-01')
          .setLogic('OR')
          .contains('title', 'test');

        expect(result).toBeInstanceOf(FilterBuilder);
      });

      it('should be immutable across different instances', () => {
        // Create separate builders to test instance isolation
        const builder1 = FilterBuilder.create().equals('user', 'john').equals('status', 'active');
        const builder2 = FilterBuilder.create().equals('user', 'john').equals('status', 'pending');

        const filter1 = builder1.build();
        const filter2 = builder2.build();

        // Each should have user condition + one status condition
        expect(filter1.conditions).toHaveLength(2);
        expect(filter2.conditions).toHaveLength(2);

        // But they should have different status values
        expect(filter1.conditions![1].value).toBe('active');
        expect(filter2.conditions![1].value).toBe('pending');
      });
    });

    describe('Performance Considerations', () => {
      it('should handle large numbers of conditions efficiently', () => {
        let largeBuilder = FilterBuilder.create();

        // Add 1000 conditions
        for (let i = 0; i < 1000; i++) {
          largeBuilder = largeBuilder.equals(`field_${i}`, `value_${i}`);
        }

        const filter = largeBuilder.build();
        expect(filter.conditions).toHaveLength(1000);

        // Test conversion to string doesn't timeout
        const startTime = Date.now();
        const filterString = FilterBuilder.toFilterString(filter);
        const endTime = Date.now();

        expect(endTime - startTime).toBeLessThan(1000); // Should complete in less than 1 second
        expect(filterString).toContain('field_0');
        expect(filterString).toContain('field_999');
      });

      it('should handle deeply nested groups', () => {
        let nestedBuilder = FilterBuilder.create();

        // Create 10 levels of nested groups
        for (let i = 0; i < 10; i++) {
          nestedBuilder = nestedBuilder.group(subBuilder =>
            subBuilder.equals(`level_${i}`, `value_${i}`)
          );
        }

        const filter = nestedBuilder.build();
        expect(filter.groups).toHaveLength(10);

        // Should be able to convert to string without stack overflow
        const filterString = FilterBuilder.toFilterString(filter);
        expect(filterString).toContain('level_0');
        expect(filterString).toContain('level_9');
      });
    });

    describe('Array Validation', () => {
      it('should allow arrays with ? operators', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'category', operator: '?=', value: ['tech', 'science'] }],
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toBe("category ?= ('tech', 'science')");
      });

      it('should throw error for arrays with non-? operators', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'status', operator: '=', value: ['active', 'pending'] }],
          logic: 'AND',
        };

        expect(() => FilterBuilder.toFilterString(filter)).toThrow(
          "Invalid filter: Array values cannot be used with operator '=' on field 'status'. Use array operators like '?=', '?!=', '?>', etc. instead."
        );
      });

      it('should throw error for arrays with comparison operators', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'score', operator: '>', value: [100, 200] }],
          logic: 'AND',
        };

        expect(() => FilterBuilder.toFilterString(filter)).toThrow(
          "Invalid filter: Array values cannot be used with operator '>' on field 'score'. Use array operators like '?=', '?!=', '?>', etc. instead."
        );
      });

      it('should throw error for arrays with like operators', () => {
        const filter: StructuredFilter = {
          conditions: [{ field: 'title', operator: '~', value: ['test', 'demo'] }],
          logic: 'AND',
        };

        expect(() => FilterBuilder.toFilterString(filter)).toThrow(
          "Invalid filter: Array values cannot be used with operator '~' on field 'title'. Use array operators like '?=', '?!=', '?>', etc. instead."
        );
      });

      it('should work correctly with ? operators for different comparison types', () => {
        const filter: StructuredFilter = {
          conditions: [
            { field: 'status', operator: '?=', value: ['active', 'pending'] },
            { field: 'priority', operator: '?>', value: [5, 7, 9] },
            { field: 'category', operator: '?~', value: ['tech', 'science'] },
          ],
          logic: 'AND',
        };

        const filterString = FilterBuilder.toFilterString(filter);

        expect(filterString).toContain("status ?= ('active', 'pending')");
        expect(filterString).toContain("priority ?> ('5', '7', '9')");
        expect(filterString).toContain("category ?~ ('tech', 'science')");
      });
    });
  });
});
