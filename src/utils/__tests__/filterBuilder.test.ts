/**
 * @fileoverview Tests for the PocketBase Filter Builder Utility
 * 
 * Tests the centralized, type-safe filter building utility to ensure
 * secure parameter injection using pb.filter().
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createFilter, buildUserProjectFilter, buildUserYearStatsFilter } from '../filterBuilder';

// Mock pb.filter() to return predictable results for testing
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    filter: (expression: string, params: Record<string, unknown>) => {
      // Simple mock that replaces placeholders with [PARAM] for testing
      let result = expression;
      Object.keys(params).forEach(key => {
        result = result.replace(new RegExp(`\\{:${key}\\}`, 'g'), `[${key}:${params[key]}]`);
      });
      return result;
    },
  },
}));

describe('FilterBuilder', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createFilter()', () => {
    it('should create an empty filter builder', () => {
      const filter = createFilter().build();
      expect(filter).toBe('');
    });

    it('should build a single user scope filter', () => {
      const filter = createFilter()
        .userScope('user123')
        .build();
      
      expect(filter).toBe('user = [userId:user123]');
    });

    it('should build multiple chained filters', () => {
      const filter = createFilter()
        .userScope('user123')
        .status('completed')
        .build();
      
      expect(filter).toBe('user = [userId:user123] && status = [status:completed]');
    });

    it('should handle undefined values gracefully', () => {
      const filter = createFilter()
        .userScope(undefined)
        .status(undefined)
        .company(undefined)
        .build();
      
      expect(filter).toBe('');
    });

    it('should skip "all" values for filters', () => {
      const filter = createFilter()
        .userScope('user123')
        .status('all')
        .company('all')
        .artist('all')
        .build();
      
      expect(filter).toBe('user = [userId:user123]');
    });
  });

  describe('Date Range Filters', () => {
    it('should build year-based date range filter', () => {
      const filter = createFilter()
        .dateRange('date_completed', { year: 2024 })
        .build();
      
      expect(filter).toBe('date_completed >= [startDate:2024-01-01] && date_completed <= [endDate:2024-12-31]');
    });

    it('should build year-based date range filter with time', () => {
      const filter = createFilter()
        .dateRange('date_completed', { year: 2024, includeTime: true })
        .build();
      
      expect(filter).toBe('date_completed >= [startDate:2024-01-01 00:00:00] && date_completed <= [endDate:2024-12-31 23:59:59]');
    });

    it('should build custom date range filter', () => {
      const filter = createFilter()
        .dateRange('date_started', { 
          startDate: '2024-01-01', 
          endDate: '2024-12-31' 
        })
        .build();
      
      expect(filter).toBe('date_started >= [startDate:2024-01-01] && date_started <= [endDate:2024-12-31]');
    });

    it('should handle single date boundaries', () => {
      const startFilter = createFilter()
        .dateRange('date_started', { startDate: '2024-01-01' })
        .build();
      
      const endFilter = createFilter()
        .dateRange('date_started', { endDate: '2024-12-31' })
        .build();
      
      expect(startFilter).toBe('date_started >= [startDate:2024-01-01]');
      expect(endFilter).toBe('date_started <= [endDate:2024-12-31]');
    });
  });

  describe('Search Filters', () => {
    it('should build search filter across multiple fields', () => {
      const filter = createFilter()
        .search({
          fields: ['title', 'general_notes'],
          term: 'landscape'
        })
        .build();
      
      expect(filter).toBe('(title ~ [term0:landscape] || general_notes ~ [term1:landscape])');
    });

    it('should handle empty search terms', () => {
      const filter = createFilter()
        .search({
          fields: ['title'],
          term: ''
        })
        .build();
      
      expect(filter).toBe('');
    });

    it('should trim search terms', () => {
      const filter = createFilter()
        .search({
          fields: ['title'],
          term: '  landscape  '
        })
        .build();
      
      expect(filter).toBe('(title ~ [term0:landscape])');
    });
  });

  describe('Tag Filters', () => {
    it('should build tag filter for multiple tags', () => {
      const filter = createFilter()
        .tags(['tag1', 'tag2', 'tag3'])
        .build();
      
      expect(filter).toBe('(project_tags_via_project.tag ?= [tagId0:tag1] || project_tags_via_project.tag ?= [tagId1:tag2] || project_tags_via_project.tag ?= [tagId2:tag3])');
    });

    it('should handle empty tag arrays', () => {
      const filter = createFilter()
        .tags([])
        .build();
      
      expect(filter).toBe('');
    });
  });

  describe('Comparison Filters', () => {
    it('should build equality filters', () => {
      const filter = createFilter()
        .equals('status', 'completed')
        .equals('year', 2024)
        .build();
      
      expect(filter).toBe('status = [status:completed] && year = [year:2024]');
    });

    it('should build not equals filters', () => {
      const filter = createFilter()
        .notEquals('kit_category', 'mini')
        .build();
      
      expect(filter).toBe('kit_category != [kit_category:mini]');
    });

    it('should build comparison filters', () => {
      const filter = createFilter()
        .greaterThan('total_diamonds', 1000)
        .lessThan('width', 50)
        .build();
      
      expect(filter).toBe('total_diamonds > [total_diamonds:1000] && width < [width:50]');
    });

    it('should build like filters', () => {
      const filter = createFilter()
        .like('title', 'landscape')
        .build();
      
      expect(filter).toBe('title ~ [title:landscape]');
    });
  });

  describe('Null Checks', () => {
    it('should build null check filters', () => {
      const filter = createFilter()
        .isNull('date_completed')
        .isNotNull('date_started')
        .build();
      
      expect(filter).toBe('date_completed = null && date_started != null');
    });
  });

  describe('Complex Combinations', () => {
    it('should build complex project filter', () => {
      const filter = createFilter()
        .userScope('user123')
        .status('completed')
        .dateRange('date_completed', { year: 2024 })
        .search({
          fields: ['title'],
          term: 'landscape'
        })
        .build();
      
      expect(filter).toContain('user = [userId:user123]');
      expect(filter).toContain('status = [status:completed]');
      expect(filter).toContain('date_completed >= [startDate:2024-01-01]');
      expect(filter).toContain('title ~ [term0:landscape]');
    });
  });
});

describe('Convenience Functions', () => {
  describe('buildUserProjectFilter()', () => {
    it('should build comprehensive project filter', () => {
      const filter = buildUserProjectFilter('user123', {
        status: 'completed',
        company: 'company456',
        yearFinished: '2024',
        searchTerm: 'landscape',
        includeMiniKits: false,
      });

      expect(filter).toContain('user = [userId:user123]');
      expect(filter).toContain('status = [status:completed]');
      expect(filter).toContain('company = [company:company456]');
      expect(filter).toContain('date_completed >= [startDate:2024-01-01 00:00:00]');
      expect(filter).toContain('kit_category != [kit_category:mini]');
      expect(filter).toContain('title ~ [term0:landscape]');
    });

    it('should handle empty options', () => {
      const filter = buildUserProjectFilter('user123');
      expect(filter).toBe('user = [userId:user123]');
    });

    it('should handle undefined user', () => {
      const filter = buildUserProjectFilter(undefined);
      expect(filter).toBe('');
    });
  });

  describe('buildUserYearStatsFilter()', () => {
    it('should build user year stats filter', () => {
      const filter = buildUserYearStatsFilter('user123', 2024, 'yearly');
      
      expect(filter).toBe('user = [userId:user123] && year = [year:2024] && stats_type = [stats_type:yearly]');
    });

    it('should use default stats type', () => {
      const filter = buildUserYearStatsFilter('user123', 2024);
      
      expect(filter).toBe('user = [userId:user123] && year = [year:2024] && stats_type = [stats_type:yearly]');
    });
  });
});

describe('Builder State Management', () => {
  it('should reset builder state', () => {
    const builder = createFilter()
      .userScope('user123')
      .status('completed');
    
    expect(builder.build()).toContain('user = [userId:user123]');
    
    builder.reset();
    expect(builder.build()).toBe('');
  });

  it('should count filters', () => {
    const builder = createFilter()
      .userScope('user123')
      .status('completed');
    
    expect(builder.count()).toBe(2);
    
    builder.reset();
    expect(builder.count()).toBe(0);
  });
});