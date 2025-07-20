/**
 * Tests for PocketBase FilterBuilder nested groups functionality
 * @author @serabi
 * @created 2025-07-20
 */

import { describe, it, expect } from 'vitest';
import { FilterBuilder } from '../FilterBuilder';

describe('FilterBuilder', () => {
  describe('Basic functionality', () => {
    it('should build simple conditions', () => {
      const filter = FilterBuilder.create()
        .equals('status', 'active')
        .equals('type', 'premium')
        .build();

      expect(filter.conditions).toHaveLength(2);
      expect(filter.conditions?.[0]).toEqual({
        field: 'status',
        operator: '=',
        value: 'active',
      });
      expect(filter.conditions?.[1]).toEqual({
        field: 'type',
        operator: '=',
        value: 'premium',
      });
    });

    it('should build simple groups', () => {
      const filter = FilterBuilder.create()
        .group(builder => builder.equals('status', 'active').equals('type', 'premium'))
        .build();

      expect(filter.groups).toHaveLength(1);
      expect(filter.groups?.[0].conditions).toHaveLength(2);
      expect(filter.groups?.[0].conditions?.[0]).toEqual({
        field: 'status',
        operator: '=',
        value: 'active',
      });
      expect(filter.groups?.[0].logic).toBe('AND');
    });
  });

  describe('Nested groups functionality (bug fix)', () => {
    it('should preserve nested groups within groups', () => {
      const filter = FilterBuilder.create()
        .equals('user', 'user123')
        .group(builder =>
          builder
            .equals('status', 'active')
            .group(nestedBuilder =>
              nestedBuilder.equals('type', 'premium').equals('category', 'special')
            )
        )
        .build();

      // Verify top-level structure
      expect(filter.conditions).toHaveLength(1);
      expect(filter.groups).toHaveLength(1);

      // Verify the outer group has both conditions and nested groups
      const outerGroup = filter.groups?.[0];
      expect(outerGroup?.conditions).toHaveLength(1);
      expect(outerGroup?.groups).toHaveLength(1);

      // Verify the nested group
      const nestedGroup = outerGroup?.groups?.[0];
      expect(nestedGroup?.conditions).toHaveLength(2);
      expect(nestedGroup?.conditions?.[0]).toEqual({
        field: 'type',
        operator: '=',
        value: 'premium',
      });
      expect(nestedGroup?.conditions?.[1]).toEqual({
        field: 'category',
        operator: '=',
        value: 'special',
      });
    });

    it('should handle multiple levels of nesting', () => {
      const filter = FilterBuilder.create()
        .group(builder =>
          builder
            .equals('level1', 'value1')
            .group(nested1 =>
              nested1
                .equals('level2', 'value2')
                .group(nested2 => nested2.equals('level3', 'value3'))
            )
        )
        .build();

      expect(filter.groups).toHaveLength(1);

      const level1Group = filter.groups?.[0];
      expect(level1Group?.conditions).toHaveLength(1);
      expect(level1Group?.groups).toHaveLength(1);

      const level2Group = level1Group?.groups?.[0];
      expect(level2Group?.conditions).toHaveLength(1);
      expect(level2Group?.groups).toHaveLength(1);

      const level3Group = level2Group?.groups?.[0];
      expect(level3Group?.conditions).toHaveLength(1);
      expect(level3Group?.groups).toBeUndefined();
    });
  });

  describe('String generation with nested groups', () => {
    it('should generate correct filter string for nested groups', () => {
      const filter = FilterBuilder.create()
        .equals('user', 'user123')
        .group(builder =>
          builder
            .equals('status', 'active')
            .group(nestedBuilder =>
              nestedBuilder.equals('type', 'premium').equals('category', 'special')
            )
        )
        .build();

      const filterString = FilterBuilder.toFilterString(filter);

      // Should contain the user condition
      expect(filterString).toContain("user = 'user123'");

      // Should contain the status condition in a group
      expect(filterString).toContain("status = 'active'");

      // Should contain the nested conditions in parentheses
      expect(filterString).toContain("type = 'premium'");
      expect(filterString).toContain("category = 'special'");

      // Should have proper nested parentheses structure
      expect(filterString).toBe(
        "user = 'user123' AND (status = 'active' AND (type = 'premium' AND category = 'special'))"
      );
    });

    it('should handle complex nested structure', () => {
      const filter = FilterBuilder.create()
        .group(builder =>
          builder
            .equals('a', '1')
            .group(nested => nested.equals('b', '2').equals('c', '3'))
            .equals('d', '4')
        )
        .build();

      const filterString = FilterBuilder.toFilterString(filter);

      // Verify all values are present
      expect(filterString).toContain("a = '1'");
      expect(filterString).toContain("b = '2'");
      expect(filterString).toContain("c = '3'");
      expect(filterString).toContain("d = '4'");

      // Verify structure - should have nested parentheses
      expect(filterString).toMatch(/\(/); // Has opening parenthesis
      expect(filterString).toMatch(/\)/); // Has closing parenthesis
    });
  });
});
