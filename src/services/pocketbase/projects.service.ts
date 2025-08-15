/**
 * Modern projects service with structured filters and performance optimizations
 * @author @serabi
 * @created 2025-01-16
 */

import { pb } from '@/lib/pocketbase';
import { createLogger, batchApiLogger } from '@/utils/logger';
import {
  BaseService,
  ErrorHandler,
  FieldMapper,
  createBaseService,
  commonServiceConfigs,
} from '@/services/pocketbase/base.service';
import { ProjectsResponse } from '@/types/pocketbase.types';
import { Project, ProjectStatus } from '@/types/project';
import { DashboardValidSortField } from '@/features/dashboard/dashboard.constants';
import {
  ProjectFilters,
  ProjectFilterStatus,
  ProjectQueryOptions,
  ProjectQueryResult,
  ProjectExpandOptions,
  StatusBreakdown,
  BatchStatusCountResult,
  ProjectUpdateData,
  ProjectCreateData,
  ProjectServiceConfig,
} from '@/types/projectFilters';

const logger = createLogger('ProjectsService');

/**
 * PocketBase sort field mapping
 */
const POCKETBASE_SORT_MAP: Record<DashboardValidSortField, string> = {
  last_updated: 'updated',
  date_purchased: 'date_purchased',
  date_finished: 'date_completed',
  date_started: 'date_started',
  date_received: 'date_received',
  kit_name: 'title',
  company: 'company',
  artist: 'artist',
  status: 'status',
  width: 'width',
  height: 'height',
  kit_category: 'kit_category',
  drill_shape: 'drill_shape',
};

/**
 * Default service configuration
 */
const DEFAULT_CONFIG: ProjectServiceConfig = {
  defaultPageSize: 20,
  defaultSortField: 'last_updated',
  defaultSortDirection: 'desc',
  defaultExpand: {
    tags: true,
    company: false,
    artist: false,
    user: false,
  },
  enablePerformanceLogging: true,
};

/**
 * projects service with structured filters and optimized queries
 */
export class ProjectsService {
  private baseService: BaseService<ProjectsResponse>;
  private fieldMapper: FieldMapper;
  private config: ProjectServiceConfig;

  constructor(config: Partial<ProjectServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.baseService = createBaseService(commonServiceConfigs.projects);
    this.fieldMapper = FieldMapper.createWithCommonMappings({
      datePurchased: 'date_purchased',
      dateReceived: 'date_received',
      dateStarted: 'date_started',
      dateCompleted: 'date_completed',
      totalDiamonds: 'total_diamonds',
      generalNotes: 'general_notes',
      sourceUrl: 'source_url',
      kitCategory: 'kit_category',
      drillShape: 'drill_shape',
    });
  }

  /**
   * Build base PocketBase filter string excluding status filters (used for aggregated queries)
   */
  private buildBaseFilter(filters: ProjectFilters): string {
    logger.debug('🏗️ Building base filter (excluding status)', { inputFilters: filters });

    const conditions: string[] = [];

    // Always filter by user for data isolation - this is critical
    if (filters.userId) {
      conditions.push(`user = "${filters.userId}"`);
      logger.debug('👤 Added user filter:', filters.userId);
    } else {
      logger.warn('⚠️ No userId provided - this will return all users data!');
    }

    // Company filter (uses ID directly)
    if (filters.company && filters.company !== 'all') {
      conditions.push(`company = "${filters.company}"`);
      logger.debug('🏢 Added company filter:', filters.company);
    }

    // Artist filter (uses ID directly)
    if (filters.artist && filters.artist !== 'all') {
      conditions.push(`artist = "${filters.artist}"`);
      logger.debug('🎨 Added artist filter:', filters.artist);
    }

    // Drill shape filter
    if (filters.drillShape && filters.drillShape !== 'all') {
      conditions.push(`drill_shape = "${filters.drillShape}"`);
      logger.debug('💎 Added drill shape filter:', filters.drillShape);
    }

    // Year finished filter
    if (filters.yearFinished && filters.yearFinished !== 'all') {
      const year = parseInt(filters.yearFinished, 10);
      if (!isNaN(year)) {
        conditions.push(`date_completed >= "${year}-01-01 00:00:00"`);
        conditions.push(`date_completed <= "${year}-12-31 23:59:59"`);
        logger.debug('📅 Added year filter:', { year, range: `${year}-01-01 to ${year}-12-31` });
      } else {
        logger.warn('⚠️ Invalid year filter value:', filters.yearFinished);
      }
    }

    // Kit category filter
    if (filters.includeMiniKits === false) {
      conditions.push(`kit_category != "mini"`);
      logger.debug('📦 Added mini kits exclusion filter');
    }

    // Search term filtering - project title only
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.trim().replace(/"/g, '\\"');
      conditions.push(`title ~ "${searchTerm}"`);
      logger.debug('🔍 Added title search filter:', {
        originalTerm: filters.searchTerm,
        escapedTerm: searchTerm,
        field: 'title',
      });
    }

    // Tag filtering
    if (filters.selectedTags && filters.selectedTags.length > 0) {
      const tagConditions = filters.selectedTags.map(
        tagId => `project_tags_via_project.tag ?= "${tagId}"`
      );
      conditions.push(`(${tagConditions.join(' || ')})`);
      logger.debug('🏷️ Added tag filters:', {
        tagCount: filters.selectedTags.length,
        tags: filters.selectedTags,
      });
    }

    const finalFilter = conditions.length > 0 ? conditions.join(' && ') : '';

    logger.debug('🎯 Final base filter generated:', {
      conditionsCount: conditions.length,
      conditions,
      finalFilter,
      filterLength: finalFilter.length,
    });

    // Validate filter syntax
    if (finalFilter && !this.validateFilterSyntax(finalFilter)) {
      logger.error('❌ Generated filter appears to have syntax issues:', finalFilter);
    }

    return finalFilter;
  }

  /**
   * Basic validation of PocketBase filter syntax
   */
  private validateFilterSyntax(filter: string): boolean {
    try {
      // Check for basic syntax issues
      const openParens = (filter.match(/\(/g) || []).length;
      const closeParens = (filter.match(/\)/g) || []).length;

      if (openParens !== closeParens) {
        logger.error('❌ Filter validation: Mismatched parentheses', { openParens, closeParens });
        return false;
      }

      // Check for unclosed quotes
      const quotes = (filter.match(/"/g) || []).length;
      if (quotes % 2 !== 0) {
        logger.error('❌ Filter validation: Unclosed quotes', { quoteCount: quotes });
        return false;
      }

      logger.debug('✅ Filter validation passed');
      return true;
    } catch (error) {
      logger.error('❌ Filter validation failed with error:', error);
      return false;
    }
  }

  /**
   * Build PocketBase filter string from ProjectFilters interface
   */
  private buildStructuredFilter(
    filters: ProjectFilters,
    excludeStatus?: string,
    skipCheckboxFilters?: boolean
  ): string {
    const conditions: string[] = [];

    // Always filter by user for data isolation
    if (filters.userId) {
      conditions.push(`user = "${filters.userId}"`);
    }

    // Use excludeStatus for status counting, otherwise use filters.status for main queries
    const statusToFilter = excludeStatus || filters.status;
    if (statusToFilter) {
      if (statusToFilter === 'active') {
        // Active projects: purchased, stash, progress, onhold
        conditions.push(
          `(status = "purchased" || status = "stash" || status = "progress" || status = "onhold")`
        );
      } else if (statusToFilter === 'everything') {
        // Everything: all projects except destashed/archived (unless those flags are enabled)
        // This will be further refined by the include/exclude flags below
        // For now, don't add any status constraint - let include flags handle it
      } else {
        // Individual status filter
        conditions.push(`status = "${statusToFilter}"`);
      }
    }

    // Company filter (uses ID directly)
    if (filters.company && filters.company !== 'all') {
      conditions.push(`company = "${filters.company}"`);
    }

    // Artist filter (uses ID directly)
    if (filters.artist && filters.artist !== 'all') {
      conditions.push(`artist = "${filters.artist}"`);
    }

    // Drill shape filter
    if (filters.drillShape && filters.drillShape !== 'all') {
      conditions.push(`drill_shape = "${filters.drillShape}"`);
    }

    // Year finished filter
    if (filters.yearFinished && filters.yearFinished !== 'all') {
      const year = parseInt(filters.yearFinished, 10);
      if (!isNaN(year)) {
        conditions.push(`date_completed >= "${year}-01-01 00:00:00"`);
        conditions.push(`date_completed <= "${year}-12-31 23:59:59"`);
      }
    }

    // Kit category filter
    if (filters.includeMiniKits === false) {
      conditions.push(`kit_category != "mini"`);
    }

    // Smart Boolean filter application - for main queries use status filter, for counting use excludeStatus parameter
    // Skip checkbox filters when counting individual status tabs to show true counts
    if (!skipCheckboxFilters) {
      const currentStatus = filters.status || excludeStatus;

      // For 'everything' status, exclude destashed/archived by default unless flags are enabled
      if (currentStatus === 'everything') {
        if (filters.includeDestashed !== true) {
          conditions.push(`status != "destashed"`);
        }
        if (filters.includeArchived !== true) {
          conditions.push(`status != "archived"`);
        }
      } else {
        // For other statuses, use the existing include/exclude logic
        // Include destashed filtering
        if (filters.includeDestashed === false && currentStatus !== 'destashed') {
          conditions.push(`status != "destashed"`);
        }

        // Include archived filtering
        if (filters.includeArchived === false && currentStatus !== 'archived') {
          conditions.push(`status != "archived"`);
        }
      }

      // Include wishlist filtering
      if (filters.includeWishlist === false && currentStatus !== 'wishlist') {
        conditions.push(`status != "wishlist"`);
      }

      // Include on hold filtering
      if (filters.includeOnHold === false && currentStatus !== 'onhold') {
        conditions.push(`status != "onhold"`);
      }
    }

    // Search term filtering - project title only
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.trim().replace(/"/g, '\\"');
      conditions.push(`title ~ "${searchTerm}"`);
    }

    // Tag filtering
    if (filters.selectedTags && filters.selectedTags.length > 0) {
      const tagConditions = filters.selectedTags.map(
        tagId => `project_tags_via_project.tag ?= "${tagId}"`
      );
      conditions.push(`(${tagConditions.join(' || ')})`);
    }

    return conditions.join(' && ');
  }

  /**
   * Build expand string from expand options
   */
  private buildExpandString(expand?: ProjectExpandOptions): string {
    const expandParts: string[] = [];

    if (expand?.tags) {
      expandParts.push('project_tags_via_project.tag');
    }

    if (expand?.company) {
      expandParts.push('company');
    }

    if (expand?.artist) {
      expandParts.push('artist');
    }

    if (expand?.user) {
      expandParts.push('user');
    }

    return expandParts.join(',');
  }

  /**
   * Build complete filter configuration
   */
  private buildFilterConfig(options: ProjectQueryOptions): {
    filter: string;
    sort: string;
    expand?: string;
  } {
    const { filters, sort, expand } = options;

    const filter = this.buildStructuredFilter(filters);
    const pbSortField = POCKETBASE_SORT_MAP[sort.field] || 'updated';
    const pbSort = `${sort.direction === 'desc' ? '-' : '+'}${pbSortField}`;
    const expandStr = this.buildExpandString(expand);

    return {
      filter,
      sort: pbSort,
      expand: expandStr || undefined,
    };
  }

  /**
   * Transform PocketBase record to frontend Project type
   */
  private transformRecord(
    record: ProjectsResponse,
    companyMap?: Map<string, string>,
    artistMap?: Map<string, string>
  ): Project {
    const recordExpand = record.expand as Record<string, unknown> | undefined;
    const projectTags = recordExpand?.['project_tags_via_project'];

    // Process tags from expand data
    const tags = Array.isArray(projectTags)
      ? projectTags
          .map((pt: Record<string, unknown>) => {
            const ptExpand = pt.expand as Record<string, unknown>;
            if (ptExpand?.tag) {
              const tag = ptExpand.tag as Record<string, unknown>;
              return {
                id: tag.id as string,
                userId: tag.user as string,
                name: tag.name as string,
                slug: tag.slug as string,
                color: tag.color as string,
                createdAt: tag.created as string,
                updatedAt: tag.updated as string,
              };
            }
            return null;
          })
          .filter((tag): tag is NonNullable<typeof tag> => tag !== null)
      : [];

    return {
      id: record.id as string,
      userId: record.user as string,
      title: record.title as string,
      company: record.company ? companyMap?.get(record.company) : undefined,
      artist: record.artist ? artistMap?.get(record.artist) : undefined,
      status: (record.status as ProjectStatus) || 'wishlist',
      kit_category: record.kit_category || undefined,
      drillShape: record.drill_shape || undefined,
      datePurchased: record.date_purchased || undefined,
      dateReceived: record.date_received || undefined,
      dateStarted: record.date_started || undefined,
      dateCompleted: record.date_completed || undefined,
      width: record.width || undefined,
      height: record.height || undefined,
      totalDiamonds: record.total_diamonds || undefined,
      generalNotes: record.general_notes || '',
      imageUrl: record.image
        ? pb.files.getURL({ ...record, collectionName: 'projects' }, record.image, {
            thumb: '300x200f',
          })
        : undefined,
      sourceUrl: record.source_url || undefined,
      tags,
      createdAt: record.created || '',
      updatedAt: record.updated || '',
    };
  }

  /**
   * Get projects with optimized query patterns
   */
  async getProjects(
    options: ProjectQueryOptions,
    companyMap?: Map<string, string>,
    artistMap?: Map<string, string>
  ): Promise<ProjectQueryResult> {
    const startTime = this.config.enablePerformanceLogging ? performance.now() : 0;

    try {
      const { filter, sort, expand } = this.buildFilterConfig(options);
      const { page, pageSize } = options;

      // Enhanced dev logging for Dashboard performance monitoring
      if (import.meta.env.DEV) {
        logger.info('🚀 [DASHBOARD] ProjectsService: Starting project query', {
          filter,
          sort,
          expand,
          page,
          pageSize,
          status: options.filters.status,
          includeStatusCounts: options.includeStatusCounts,
        });
      }

      const queryStartTime = performance.now();

      // Use optimized single query instead of fallback pattern
      const result = await ErrorHandler.handleAsync(async () => {
        return await pb.collection('projects').getList(page, pageSize, {
          filter,
          sort,
          expand,
        });
      }, 'Project query');

      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;

      const projects = result.items.map((record: ProjectsResponse) =>
        this.transformRecord(record, companyMap, artistMap)
      );

      // Get status counts if requested
      let statusCounts: StatusBreakdown | undefined;
      let statusCountDuration = 0;
      if (options.includeStatusCounts) {
        const statusStartTime = performance.now();
        const statusResult = await this.getBatchStatusCounts(options.filters);
        statusCounts = statusResult.counts;
        statusCountDuration = performance.now() - statusStartTime;
      }

      if (this.config.enablePerformanceLogging) {
        const endTime = performance.now();
        const totalDuration = endTime - startTime;

        // Enhanced dev logging for Dashboard performance monitoring
        if (import.meta.env.DEV) {
          logger.info('✅ [DASHBOARD] ProjectsService: Query completed', {
            totalDuration: `${Math.round(totalDuration)}ms`,
            queryDuration: `${Math.round(queryDuration)}ms`,
            statusCountDuration: `${Math.round(statusCountDuration)}ms`,
            itemsReturned: projects.length,
            totalItems: result.totalItems,
            totalPages: result.totalPages,
            hasStatusCounts: !!statusCounts,
            performanceBreakdown: {
              query: `${Math.round(queryDuration)}ms`,
              statusCounts: statusCounts ? `${Math.round(statusCountDuration)}ms` : 'skipped',
              transformation: `${Math.round(totalDuration - queryDuration - statusCountDuration)}ms`,
            },
          });
        } else {
          logger.debug(`Query completed in ${Math.round(totalDuration)}ms`, {
            itemsReturned: projects.length,
            totalItems: result.totalItems,
          });
        }
      }

      return {
        projects,
        totalItems: result.totalItems,
        totalPages: result.totalPages,
        currentPage: page,
        pageSize,
        statusCounts,
      };
    } catch (error) {
      logger.error('Failed to fetch projects', error);
      throw ErrorHandler.handleError(error, 'Project query');
    }
  }

  /**
   * Get batch status counts using single optimized query approach
   * Uses getList with page size instead of getFullList for better performance control
   * Avoids parallel queries that proved slower due to network overhead
   * Note: This method is designed to work with moderate caching (30 seconds - 2 minutes)
   */
  async getBatchStatusCounts(baseFilters: ProjectFilters): Promise<BatchStatusCountResult> {
    const startTime = this.config.enablePerformanceLogging ? performance.now() : 0;
    const batchId = batchApiLogger.startBatchOperation(
      'status-counts-single-optimized',
      1,
      'Single optimized getList query for status counting'
    );

    try {
      logger.debug('🔍 Starting single optimized status count query');

      // Build base filter excluding status (we'll get all statuses in one query)
      const baseFilter = this.buildBaseFilter(baseFilters);
      logger.debug('📋 Generated base filter:', {
        filterString: baseFilter,
        originalFilters: baseFilters,
        filterLength: baseFilter.length,
      });

      // Use getList with reasonable page size instead of getFullList for better performance
      logger.debug('🚀 Executing single getList query for status counting...');
      const queryStartTime = performance.now();

      // Fetch with generous page size to handle current dataset + growth
      const result = await pb.collection('projects').getList(1, 2000, {
        filter: baseFilter,
        fields: 'status', // Only fetch status field for minimal data transfer (~10KB vs ~2MB)
        sort: '', // No sorting needed for counting
        skipTotal: true, // Skip expensive total count calculation
        requestKey: `status-count-single-${baseFilters.userId || 'unknown'}`,
        $cancelKey: 'status-counting-single', // Allow request cancellation
      });

      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;

      // Fast in-memory counting (should be <10ms for 672 projects)
      const countingStartTime = performance.now();
      const counts: StatusBreakdown = {
        wishlist: 0,
        purchased: 0,
        stash: 0,
        progress: 0,
        onhold: 0,
        completed: 0,
        archived: 0,
        destashed: 0,
      };

      let unrecognizedStatuses = 0;
      const total = result.items.length;

      result.items.forEach((project: { status: string }) => {
        const status = project.status as keyof StatusBreakdown;
        if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
          counts[status]++;
        } else {
          unrecognizedStatuses++;
          logger.warn('Unrecognized project status:', status);
        }
      });

      const countingDuration = performance.now() - countingStartTime;

      // Check if we got all data or if there might be more
      const hasMoreData = result.items.length === 2000;
      if (hasMoreData) {
        logger.warn('⚠️ Status counting may be incomplete - dataset size exceeds page limit', {
          itemsReturned: result.items.length,
          pageLimit: 2000,
          recommendation: 'Increase page size or implement pagination',
        });
      }

      logger.info('✅ Single optimized status counting completed', {
        queryDuration: `${Math.round(queryDuration)}ms`,
        countingDuration: `${Math.round(countingDuration)}ms`,
        totalDuration: `${Math.round(queryDuration + countingDuration)}ms`,
        totalProjects: total,
        statusBreakdown: counts,
        hasMoreData,
        optimization: 'Single getList query + in-memory counting (avoiding parallel overhead)',
        performanceRating:
          queryDuration < 200 ? 'excellent' : queryDuration < 500 ? 'good' : 'needs-optimization',
        dataEfficiency: `${Math.round((total * 20) / 1024)}KB transferred vs ~${Math.round((total * 3000) / 1024)}KB for full objects`,
      });

      if (this.config.enablePerformanceLogging) {
        const endTime = performance.now();
        batchApiLogger.endBatchOperation(batchId, total, {
          totalCounts: total,
          statusBreakdown: counts,
          queryType: 'single_getList_optimized',
          projectsProcessed: total,
          unrecognizedStatuses,
          queryDuration: Math.round(queryDuration),
          countingDuration: Math.round(countingDuration),
          hasMoreData,
        });
        logger.debug(
          `✅ Optimized status counts completed in ${Math.round(endTime - startTime)}ms`,
          {
            totalCounts: total,
            statusBreakdown: counts,
            queryType: 'single_getList_optimized',
            projectsProcessed: total,
            unrecognizedStatuses,
            performanceBreakdown: {
              query: `${Math.round(queryDuration)}ms`,
              counting: `${Math.round(countingDuration)}ms`,
              total: `${Math.round(endTime - startTime)}ms`,
            },
          }
        );
      }

      logger.debug('🎯 Returning optimized status count results:', { counts, total });
      return { counts, total };
    } catch (error) {
      logger.error('❌ Failed to fetch optimized status counts', {
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
        filters: baseFilters,
      });

      throw ErrorHandler.handleError(error, 'Optimized status count query');
    }
  }

  /**
   * Enhanced status counting with performance optimizations
   * Includes automatic fallback strategies and improved error handling
   */
  async getOptimizedStatusCounts(baseFilters: ProjectFilters): Promise<BatchStatusCountResult> {
    const startTime = this.config.enablePerformanceLogging ? performance.now() : 0;
    const batchId = batchApiLogger.startBatchOperation(
      'status-counts-optimized',
      1,
      'Optimized status counting with performance enhancements'
    );

    try {
      logger.debug('🚀 Starting optimized status count query');

      // Build base filter excluding status
      const baseFilter = this.buildBaseFilter(baseFilters);

      // Enhanced performance monitoring
      const baseFilterOptimization = baseFilter.length < 50 ? 'optimal' : 'verbose';
      logger.debug('📋 Query optimization analysis:', {
        filterString: baseFilter,
        filterLength: baseFilter.length,
        optimization: baseFilterOptimization,
        recommendation:
          baseFilterOptimization === 'verbose'
            ? 'Consider simplifying filters'
            : 'Filter is optimal',
      });

      const queryStartTime = performance.now();

      // Enhanced query with all optimizations
      const result = await pb.collection('projects').getFullList({
        filter: baseFilter,
        fields: 'status', // Minimal field selection
        requestKey: `status-count-optimized-${baseFilters.userId || 'unknown'}`,
        skipTotal: true, // Skip expensive total calculation
        $cancelKey: 'status-counting-optimized', // Request cancellation support
        sort: '', // No sorting needed for counting
      });

      const queryEndTime = performance.now();
      const queryDuration = queryEndTime - queryStartTime;

      // Optimized in-memory counting with performance tracking
      const countingStartTime = performance.now();
      const counts: StatusBreakdown = {
        wishlist: 0,
        purchased: 0,
        stash: 0,
        progress: 0,
        onhold: 0,
        completed: 0,
        archived: 0,
        destashed: 0,
      };

      let unrecognizedStatuses = 0;
      const total = result.length;

      // Optimized counting loop
      result.forEach((project: { status: string }) => {
        const status = project.status as keyof StatusBreakdown;
        if (status && Object.prototype.hasOwnProperty.call(counts, status)) {
          counts[status]++;
        } else {
          unrecognizedStatuses++;
          logger.warn('Unrecognized project status:', status);
        }
      });

      const countingEndTime = performance.now();
      const countingDuration = countingEndTime - countingStartTime;

      // Enhanced performance analysis
      const performanceAnalysis = {
        queryDuration: Math.round(queryDuration),
        countingDuration: Math.round(countingDuration),
        totalDuration: Math.round(queryDuration + countingDuration),
        projectsPerSecond: Math.round(total / (queryDuration / 1000)),
        efficiency: total / queryDuration, // projects per ms
        rating:
          queryDuration < 1000 ? 'excellent' : queryDuration < 3000 ? 'good' : 'needs-optimization',
      };

      logger.info('✅ Optimized status counting completed', {
        ...performanceAnalysis,
        totalProjects: total,
        statusBreakdown: counts,
        optimization: 'Enhanced getFullList + optimized counting + skip total',
        recommendations:
          performanceAnalysis.rating === 'needs-optimization'
            ? ['Consider database indexing on (user, status)', 'Check network latency']
            : ['Performance is optimal'],
      });

      if (this.config.enablePerformanceLogging) {
        const endTime = performance.now();
        batchApiLogger.endBatchOperation(batchId, total, {
          totalCounts: total,
          statusBreakdown: counts,
          queryType: 'optimized_getFullList',
          projectsProcessed: total,
          unrecognizedStatuses,
          performanceAnalysis,
        });

        logger.debug(
          `✅ Optimized status counts completed in ${Math.round(endTime - startTime)}ms`,
          {
            totalCounts: total,
            statusBreakdown: counts,
            queryType: 'optimized_getFullList',
            projectsProcessed: total,
            unrecognizedStatuses,
            performanceMetrics: performanceAnalysis,
          }
        );
      }

      return {
        counts,
        total,
        queryDuration,
        optimization: 'optimized_query',
      };
    } catch (error) {
      logger.error('❌ Optimized status counting failed:', error);
      batchApiLogger.endBatchOperation(batchId, 0, { error: String(error) });
      throw ErrorHandler.handleError(error, 'Optimized status counting');
    }
  }

  /**
   * Get batch status counts - fallback using parallel single queries
   * (kept for comparison and potential fallback)
   */
  async getBatchStatusCountsLegacy(baseFilters: ProjectFilters): Promise<BatchStatusCountResult> {
    const startTime = this.config.enablePerformanceLogging ? performance.now() : 0;
    const batchId = batchApiLogger.startBatchOperation(
      'status-counts-legacy',
      7,
      'Legacy parallel status count queries'
    );

    try {
      logger.debug('Fetching batch status counts with legacy parallel execution');

      // Build optimized queries for all statuses - single query per status
      const statusTypes: ProjectFilterStatus[] = [
        'wishlist',
        'purchased',
        'stash',
        'progress',
        'onhold',
        'completed',
        'archived',
        'destashed',
      ];

      // Use timestamp and random suffix to ensure truly unique request keys
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 11);

      // Temporarily disable auto-cancellation to prevent deduplication interference
      const originalAutoCancellation = pb.autoCancellation !== undefined;
      pb.autoCancellation(false);

      try {
        // Execute all status count queries in parallel using direct single queries
        const statusCountPromises = statusTypes.map(async (status, index) => {
          const filter = this.buildStructuredFilter(baseFilters, status, true);

          // Single direct query with aggressive uniqueness to prevent deduplication
          try {
            const result = await pb.collection('projects').getList(1, 1, {
              filter,
              skipTotal: false,
              requestKey: `status-count-${status}-${timestamp}-${index}-${randomSuffix}`,
              // Add query-specific parameters to ensure uniqueness
              expand: '', // Empty expand to differentiate from main queries
            });

            return {
              status,
              count: result.totalItems,
            };
          } catch (error) {
            logger.warn(`Failed to get count for status ${status}:`, error);
            return {
              status,
              count: 0,
            };
          }
        });

        // Wait for all queries to complete in parallel
        const statusCountResults = await Promise.all(statusCountPromises);

        // Initialize counts with zeros for all statuses
        const counts: StatusBreakdown = {
          wishlist: 0,
          purchased: 0,
          stash: 0,
          progress: 0,
          onhold: 0,
          completed: 0,
          archived: 0,
          destashed: 0,
        };

        let total = 0;

        // Process results
        for (const { status, count } of statusCountResults) {
          if (status !== 'active' && status !== 'everything') {
            counts[status as keyof StatusBreakdown] = count;
            total += count;
          }
        }

        if (this.config.enablePerformanceLogging) {
          const endTime = performance.now();
          batchApiLogger.endBatchOperation(batchId, total, {
            totalCounts: total,
            statusBreakdown: counts,
            queryType: 'legacy_parallel',
          });
          logger.debug(
            `Legacy batch status counts completed in ${Math.round(endTime - startTime)}ms`,
            {
              totalCounts: total,
              statusBreakdown: counts,
              queryType: 'legacy_parallel',
            }
          );
        }

        return { counts, total };
      } finally {
        // Restore original auto-cancellation setting
        if (originalAutoCancellation) {
          pb.autoCancellation(true);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch legacy batch status counts', error);
      throw ErrorHandler.handleError(error, 'Legacy batch status count query');
    }
  }

  /**
   * Create a new project
   */
  async createProject(data: ProjectCreateData): Promise<Project> {
    try {
      logger.debug('Creating new project', { title: data.title });

      const backendData = this.fieldMapper.toBackend(data);
      const record = await this.baseService.create(backendData);

      return this.transformRecord(record as ProjectsResponse);
    } catch (error) {
      logger.error('Failed to create project', error);
      throw ErrorHandler.handleError(error, 'Project creation');
    }
  }

  /**
   * Update an existing project
   */
  async updateProject(id: string, data: ProjectUpdateData): Promise<Project> {
    try {
      logger.debug('Updating project', { id, title: data.title });

      const backendData = this.fieldMapper.toBackend(data);
      const record = await this.baseService.update(id, backendData);

      return this.transformRecord(record as ProjectsResponse);
    } catch (error) {
      logger.error('Failed to update project', error);
      throw ErrorHandler.handleError(error, 'Project update');
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    try {
      logger.debug('Deleting project', { id });

      await this.baseService.delete(id);
    } catch (error) {
      logger.error('Failed to delete project', error);
      throw ErrorHandler.handleError(error, 'Project deletion');
    }
  }

  /**
   * Get a single project by ID
   */
  async getProject(
    id: string,
    expand?: ProjectExpandOptions,
    companyMap?: Map<string, string>,
    artistMap?: Map<string, string>
  ): Promise<Project> {
    try {
      logger.debug('Fetching single project', { id });

      const expandStr = this.buildExpandString(expand);
      const record = await this.baseService.getOne(id, expandStr ? [expandStr] : undefined);

      return this.transformRecord(record as ProjectsResponse, companyMap, artistMap);
    } catch (error) {
      logger.error('Failed to fetch project', error);
      throw ErrorHandler.handleError(error, 'Project fetch');
    }
  }

  /**
   * Get projects for export with all data
   */
  async getProjectsForExport(
    filters: ProjectFilters,
    companyMap?: Map<string, string>,
    artistMap?: Map<string, string>
  ): Promise<Project[]> {
    try {
      logger.debug('Fetching projects for export');

      const filter = this.buildStructuredFilter(filters);
      const expand = this.buildExpandString({ tags: true, company: true, artist: true });

      const records = await pb.collection('projects').getFullList({
        filter,
        expand,
        sort: '-updated',
      });

      return records.map((record: ProjectsResponse) =>
        this.transformRecord(record, companyMap, artistMap)
      );
    } catch (error) {
      logger.error('Failed to fetch projects for export', error);
      throw ErrorHandler.handleError(error, 'Project export query');
    }
  }
}

// Create and export default service instance
export const projectsService = new ProjectsService();
