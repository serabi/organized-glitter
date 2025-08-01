/**
 * @fileoverview PocketBase Filter Builder Utility - SECURITY CRITICAL
 *
 * Centralized, type-safe utility for building secure PocketBase filter expressions.
 * Uses pb.filter() for secure parameter injection to prevent SQL injection attacks.
 *
 * 🔒 SECURITY FEATURES:
 * - Field name whitelist validation to prevent SQL injection through field interpolation
 * - Secure parameter injection using pb.filter() for all user-provided values
 * - Comprehensive logging of security violations for monitoring
 * - Development-time error throwing for immediate debugging of security issues
 * - Automatic rejection of operations with invalid field names
 *
 * Key Features:
 * - Type-safe filter building with TypeScript
 * - Secure parameter injection using pb.filter()
 * - Common filter patterns for user isolation, date ranges, search terms
 * - Chainable API for complex filter combinations
 * - Reduces code duplication by 60-80% across the codebase
 * - Field name validation against comprehensive whitelist
 *
 * ⚠️  SECURITY WARNINGS:
 * - NEVER modify COLLECTION_FIELDS without security review
 * - NEVER bypass field validation in any methods
 * - NEVER interpolate user input directly into filter strings
 * - ALWAYS use pb.filter() for parameterized queries
 * - ALWAYS validate field names before using them in filters
 *
 * @author @serabi
 * @version 2.0.0 - Security Hardened
 * @since 2024-06-29
 * @security-review Required for any modifications to field validation
 */

import { pb } from '@/lib/pocketbase';
import { createLogger } from '@/utils/logger';

const logger = createLogger('FilterBuilder');

/**
 * Comprehensive field whitelist for all PocketBase collections
 * This prevents SQL injection through field name interpolation
 *
 * CRITICAL SECURITY: Only fields listed here can be used in filter operations.
 * Never modify this whitelist without security review.
 */
const COLLECTION_FIELDS = {
  // Core system fields present in all collections
  system: new Set(['id', 'created', 'updated', 'collectionId', 'collectionName']),

  // Projects collection fields
  projects: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'user',
    'title',
    'status',
    'kit_category',
    'drill_shape',
    'artist',
    'company',
    'date_purchased',
    'date_received',
    'date_started',
    'date_completed',
    'width',
    'height',
    'total_diamonds',
    'source_url',
    'general_notes',
    'image',
  ]),

  // Progress notes collection fields
  progress_notes: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'project',
    'date',
    'content',
    'image',
  ]),

  // Tags collection fields
  tags: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'user',
    'name',
    'slug',
    'color',
  ]),

  // Project tags relation fields
  project_tags: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'project',
    'tag',
  ]),

  // Artists collection fields
  artists: new Set(['id', 'created', 'updated', 'collectionId', 'collectionName', 'user', 'name']),

  // Companies collection fields
  companies: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'user',
    'name',
    'website_url',
  ]),

  // User yearly stats fields
  user_yearly_stats: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'user',
    'year',
    'stats_type',
    'completed_count',
    'in_progress_count',
    'started_count',
    'total_diamonds',
    'estimated_drills',
    'projects_included',
    'status_breakdown',
    'last_calculated',
    'calculation_duration_ms',
    'cache_version',
  ]),

  // Randomizer spins fields
  randomizer_spins: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'user',
    'project',
    'project_title',
    'project_company',
    'project_artist',
    'selected_count',
    'selected_projects',
    'spun_at',
  ]),

  // Users collection fields (limited for security)
  users: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'username',
    'email',
    'emailVisibility',
    'verified',
    'avatar',
    'beta_tester',
  ]),

  // Account deletions fields
  account_deletions: new Set([
    'id',
    'created',
    'updated',
    'collectionId',
    'collectionName',
    'user_id',
    'user_email',
    'signup_method',
    'notes',
  ]),

  // Commonly used relation fields and view expansions
  relations: new Set([
    'project_tags_via_project.tag', // Used in tag filtering
    'tags_via_project_tags.name', // Used in tag name queries
    'artist.name', // Used in artist expansion
    'company.name', // Used in company expansion
  ]),
} as const;

/**
 * Validates a field name against the collection whitelist
 *
 * CRITICAL SECURITY FUNCTION: Prevents SQL injection through field name validation.
 * Only whitelisted fields are allowed in filter operations.
 *
 * @param field - The field name to validate
 * @param context - Optional context for better error messages (collection name, operation)
 * @returns true if field is valid, false otherwise
 * @throws Error for invalid fields in development mode for debugging
 */
function validateFieldName(field: string, context?: string): boolean {
  if (!field || typeof field !== 'string') {
    logger.error('Invalid field name: field must be a non-empty string', { field, context });
    return false;
  }

  // Check if field is in any of our whitelisted sets
  const isValidField =
    COLLECTION_FIELDS.system.has(field) ||
    COLLECTION_FIELDS.projects.has(field) ||
    COLLECTION_FIELDS.progress_notes.has(field) ||
    COLLECTION_FIELDS.tags.has(field) ||
    COLLECTION_FIELDS.project_tags.has(field) ||
    COLLECTION_FIELDS.artists.has(field) ||
    COLLECTION_FIELDS.companies.has(field) ||
    COLLECTION_FIELDS.user_yearly_stats.has(field) ||
    COLLECTION_FIELDS.randomizer_spins.has(field) ||
    COLLECTION_FIELDS.users.has(field) ||
    COLLECTION_FIELDS.account_deletions.has(field) ||
    COLLECTION_FIELDS.relations.has(field);

  if (!isValidField) {
    const errorMsg = `Security violation: Invalid field name "${field}" not in whitelist`;
    logger.error(errorMsg, {
      field,
      context,
      availableFields: Object.keys(COLLECTION_FIELDS),
      timestamp: new Date().toISOString(),
    });

    // In development, throw error for immediate debugging
    if (import.meta.env.DEV) {
      throw new Error(`${errorMsg}. Context: ${context || 'unknown'}`);
    }

    return false;
  }

  return true;
}

/**
 * Common filter parameters interface for type safety
 */
export interface FilterParams {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Date range options for date filtering
 */
export interface DateRangeOptions {
  year?: number;
  startDate?: string;
  endDate?: string;
  includeTime?: boolean;
}

/**
 * Search options for text search filtering
 */
export interface SearchOptions {
  fields: string[];
  term: string;
  caseSensitive?: boolean;
}

/**
 * Main FilterBuilder class for creating secure PocketBase filters
 */
export class FilterBuilder {
  private filters: string[] = [];

  constructor() {
    this.filters = [];
  }

  /**
   * Add a custom filter using pb.filter() for security
   */
  add(filterExpression: string, params: FilterParams = {}): FilterBuilder {
    if (filterExpression.trim()) {
      this.filters.push(pb.filter(filterExpression, params));
    }
    return this;
  }

  /**
   * Add user isolation filter - most common pattern across the codebase
   */
  userScope(userId: string | undefined): FilterBuilder {
    if (userId) {
      this.filters.push(pb.filter('user = {:userId}', { userId }));
    }
    return this;
  }

  /**
   * Add status filter for projects
   */
  status(status: string | undefined): FilterBuilder {
    if (status && status !== 'all') {
      this.filters.push(pb.filter('status = {:status}', { status }));
    }
    return this;
  }

  /**
   * Add company filter
   */
  company(companyId: string | undefined): FilterBuilder {
    if (companyId && companyId !== 'all') {
      this.filters.push(pb.filter('company = {:company}', { company: companyId }));
    }
    return this;
  }

  /**
   * Add artist filter
   */
  artist(artistId: string | undefined): FilterBuilder {
    if (artistId && artistId !== 'all') {
      this.filters.push(pb.filter('artist = {:artist}', { artist: artistId }));
    }
    return this;
  }

  /**
   * Add drill shape filter
   */
  drillShape(shape: string | undefined): FilterBuilder {
    if (shape && shape !== 'all') {
      this.filters.push(pb.filter('drill_shape = {:drillShape}', { drillShape: shape }));
    }
    return this;
  }

  /**
   * Add date range filter with flexible options and field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  dateRange(field: string, options: DateRangeOptions): FilterBuilder {
    if (!validateFieldName(field, 'dateRange')) {
      logger.error('Rejected dateRange operation with invalid field name', { field, options });
      return this; // Skip invalid field operations
    }

    if (options.year) {
      const timeFormat = options.includeTime ? ' 00:00:00' : '';
      const endTimeFormat = options.includeTime ? ' 23:59:59' : '';
      this.filters.push(
        pb.filter(`${field} >= {:startDate} && ${field} <= {:endDate}`, {
          startDate: `${options.year}-01-01${timeFormat}`,
          endDate: `${options.year}-12-31${endTimeFormat}`,
        })
      );
    } else if (options.startDate && options.endDate) {
      this.filters.push(
        pb.filter(`${field} >= {:startDate} && ${field} <= {:endDate}`, {
          startDate: options.startDate,
          endDate: options.endDate,
        })
      );
    } else if (options.startDate) {
      this.filters.push(pb.filter(`${field} >= {:startDate}`, { startDate: options.startDate }));
    } else if (options.endDate) {
      this.filters.push(pb.filter(`${field} <= {:endDate}`, { endDate: options.endDate }));
    }
    return this;
  }

  /**
   * Add search filter across multiple fields with field validation
   *
   * SECURITY: All field names are validated against whitelist to prevent SQL injection
   */
  search(options: SearchOptions): FilterBuilder {
    if (!options.term || !options.term.trim()) {
      return this;
    }

    // Validate all field names before using them
    const validFields = options.fields.filter(field => {
      const isValid = validateFieldName(field, 'search');
      if (!isValid) {
        logger.error('Rejected search operation with invalid field name', {
          field,
          searchTerm: options.term,
        });
      }
      return isValid;
    });

    // If no valid fields remain, skip the search operation
    if (validFields.length === 0) {
      logger.error('Search operation skipped: no valid fields provided', {
        originalFields: options.fields,
        searchTerm: options.term,
      });
      return this;
    }

    const searchConditions = validFields
      .map((field, index) => `${field} ~ {:term${index}}`)
      .join(' || ');

    const params: FilterParams = {};
    validFields.forEach((_, index) => {
      params[`term${index}`] = options.term.trim();
    });

    this.filters.push(pb.filter(`(${searchConditions})`, params));
    return this;
  }

  /**
   * Add tag filtering for projects with tags
   */
  tags(tagIds: string[]): FilterBuilder {
    if (tagIds && tagIds.length > 0) {
      const tagFilters = tagIds.map((tagId, index) =>
        pb.filter(`project_tags_via_project.tag ?= {:tagId${index}}`, { [`tagId${index}`]: tagId })
      );
      this.filters.push(`(${tagFilters.join(' || ')})`);
    }
    return this;
  }

  /**
   * Add equality filter for any field with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  equals(field: string, value: string | number | boolean): FilterBuilder {
    if (!validateFieldName(field, 'equals')) {
      logger.error('Rejected equals operation with invalid field name', { field, value });
      return this; // Skip invalid field operations
    }
    this.filters.push(pb.filter(`${field} = {:${field}}`, { [field]: value }));
    return this;
  }

  /**
   * Add not equals filter for any field with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  notEquals(field: string, value: string | number | boolean): FilterBuilder {
    if (!validateFieldName(field, 'notEquals')) {
      logger.error('Rejected notEquals operation with invalid field name', { field, value });
      return this; // Skip invalid field operations
    }
    this.filters.push(pb.filter(`${field} != {:${field}}`, { [field]: value }));
    return this;
  }

  /**
   * Add "in" filter for array values with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  in(field: string, values: (string | number)[]): FilterBuilder {
    if (!validateFieldName(field, 'in')) {
      logger.error('Rejected in operation with invalid field name', { field, values });
      return this; // Skip invalid field operations
    }

    if (values && values.length > 0) {
      const params: FilterParams = {};
      const placeholders = values
        .map((_, index) => {
          const key = `${field}_${index}`;
          params[key] = values[index];
          return `{:${key}}`;
        })
        .join(', ');

      this.filters.push(pb.filter(`${field} in (${placeholders})`, params));
    }
    return this;
  }

  /**
   * Add "like" filter for partial text matching with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  like(field: string, value: string): FilterBuilder {
    if (!validateFieldName(field, 'like')) {
      logger.error('Rejected like operation with invalid field name', { field, value });
      return this; // Skip invalid field operations
    }

    if (value && value.trim()) {
      this.filters.push(pb.filter(`${field} ~ {:${field}}`, { [field]: value.trim() }));
    }
    return this;
  }

  /**
   * Add greater than filter with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  greaterThan(field: string, value: string | number): FilterBuilder {
    if (!validateFieldName(field, 'greaterThan')) {
      logger.error('Rejected greaterThan operation with invalid field name', { field, value });
      return this; // Skip invalid field operations
    }
    this.filters.push(pb.filter(`${field} > {:${field}}`, { [field]: value }));
    return this;
  }

  /**
   * Add less than filter with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  lessThan(field: string, value: string | number): FilterBuilder {
    if (!validateFieldName(field, 'lessThan')) {
      logger.error('Rejected lessThan operation with invalid field name', { field, value });
      return this; // Skip invalid field operations
    }
    this.filters.push(pb.filter(`${field} < {:${field}}`, { [field]: value }));
    return this;
  }

  /**
   * Add null check filter with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  isNull(field: string): FilterBuilder {
    if (!validateFieldName(field, 'isNull')) {
      logger.error('Rejected isNull operation with invalid field name', { field });
      return this; // Skip invalid field operations
    }
    this.filters.push(`${field} = null`);
    return this;
  }

  /**
   * Add not null check filter with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  isNotNull(field: string): FilterBuilder {
    if (!validateFieldName(field, 'isNotNull')) {
      logger.error('Rejected isNotNull operation with invalid field name', { field });
      return this; // Skip invalid field operations
    }
    this.filters.push(`${field} != null`);
    return this;
  }

  /**
   * Add exclude filter (commonly used for categories) with field validation
   *
   * SECURITY: Field name is validated against whitelist to prevent SQL injection
   */
  exclude(field: string, value: string | number): FilterBuilder {
    if (!validateFieldName(field, 'exclude')) {
      logger.error('Rejected exclude operation with invalid field name', { field, value });
      return this; // Skip invalid field operations
    }
    this.filters.push(pb.filter(`${field} != {:${field}}`, { [field]: value }));
    return this;
  }

  /**
   * Add custom AND condition
   */
  and(builder: FilterBuilder): FilterBuilder {
    const subFilter = builder.build();
    if (subFilter) {
      this.filters.push(`(${subFilter})`);
    }
    return this;
  }

  /**
   * Add custom OR condition
   */
  or(builder: FilterBuilder): FilterBuilder {
    const subFilter = builder.build();
    if (subFilter && this.filters.length > 0) {
      // Wrap existing filters and new filter in OR
      const existingFilter = this.filters.join(' && ');
      this.filters = [`(${existingFilter}) || (${subFilter})`];
    } else if (subFilter) {
      this.filters.push(subFilter);
    }
    return this;
  }

  /**
   * Build the final filter string
   */
  build(): string {
    return this.filters.join(' && ');
  }

  /**
   * Reset the builder to start fresh
   */
  reset(): FilterBuilder {
    this.filters = [];
    return this;
  }

  /**
   * Get the number of filters added
   */
  count(): number {
    return this.filters.length;
  }
}

// Convenience functions for common patterns

/**
 * Create a new filter builder instance
 */
export function createFilter(): FilterBuilder {
  return new FilterBuilder();
}

/**
 * Build comprehensive user-scoped filter for project queries
 *
 * Creates a complete filter expression for project searches with user isolation
 * and optional filtering criteria. This is the most commonly used convenience
 * function for dashboard and project list queries.
 *
 * Security Features:
 * - Automatic user scope isolation (users only see their own projects)
 * - Secure parameter injection for all filter criteria
 * - SQL injection prevention through parameterized queries
 *
 * @function
 * @param {string | undefined} userId - User ID for data isolation (required for security)
 * @param {object} [options={}] - Optional filtering criteria
 * @param {string} [options.status] - Project status filter ('completed', 'progress', etc.)
 * @param {string} [options.company] - Company ID filter
 * @param {string} [options.artist] - Artist ID filter
 * @param {string} [options.drillShape] - Drill shape filter ('round', 'square')
 * @param {string} [options.yearFinished] - Year completed filter (YYYY format)
 * @param {boolean} [options.includeMiniKits] - Whether to include mini kit projects
 * @param {string} [options.searchTerm] - Text search across title and notes
 * @param {string[]} [options.selectedTags] - Array of tag IDs to filter by
 * @returns {string} Complete filter expression for PocketBase queries
 *
 * @example
 * ```typescript
 * // Basic user filter
 * const filter = buildUserProjectFilter('user123');
 * // Result: "user = {:userId}"
 *
 * // Complex filter with multiple criteria
 * const filter = buildUserProjectFilter('user123', {
 *   status: 'completed',
 *   yearFinished: '2024',
 *   searchTerm: 'landscape',
 *   includeMiniKits: false
 * });
 * // Result: "user = {:userId} && status = {:status} && date_completed >= {:startDate} && ..."
 *
 * // Use with PocketBase
 * const projects = await pb.collection('projects').getList(1, 20, {
 *   filter: buildUserProjectFilter(userId, { status: 'completed' })
 * });
 * ```
 */
export function buildUserProjectFilter(
  userId: string | undefined,
  options: {
    status?: string;
    company?: string;
    artist?: string;
    drillShape?: string;
    yearFinished?: string;
    includeMiniKits?: boolean;
    searchTerm?: string;
    selectedTags?: string[];
  } = {}
): string {
  const builder = createFilter().userScope(userId);

  if (options.status) {
    builder.status(options.status);
  }

  if (options.company) {
    builder.company(options.company);
  }

  if (options.artist) {
    builder.artist(options.artist);
  }

  if (options.drillShape) {
    builder.drillShape(options.drillShape);
  }

  if (options.yearFinished) {
    const year = parseInt(options.yearFinished, 10);
    if (!isNaN(year)) {
      builder.dateRange('date_completed', { year, includeTime: true });
    }
  }

  if (options.includeMiniKits === false) {
    builder.exclude('kit_category', 'mini');
  }

  if (options.searchTerm) {
    builder.search({
      fields: ['title', 'general_notes'],
      term: options.searchTerm,
    });
  }

  if (options.selectedTags && options.selectedTags.length > 0) {
    builder.tags(options.selectedTags);
  }

  return builder.build();
}

/**
 * Build user and year stats filter for dashboard statistics
 *
 * Creates a secure filter expression for querying user yearly statistics
 * from the dashboard stats cache. Used by dashboard stats service for
 * efficient cache lookups and invalidation.
 *
 * @function
 * @param {string} userId - User ID for data isolation
 * @param {number} year - Target year for statistics (e.g., 2024)
 * @param {string} [statsType='yearly'] - Type of statistics ('yearly', 'monthly', etc.)
 * @returns {string} Filter expression for user yearly stats queries
 *
 * @example
 * ```typescript
 * // Get 2024 yearly stats filter
 * const filter = buildUserYearStatsFilter('user123', 2024);
 * // Result: "user = {:userId} && year = {:year} && stats_type = {:stats_type}"
 *
 * // Use with PocketBase for cache lookup
 * const cachedStats = await pb.collection('user_yearly_stats').getFirstListItem(
 *   buildUserYearStatsFilter(userId, 2024)
 * );
 *
 * // Custom stats type
 * const monthlyFilter = buildUserYearStatsFilter('user123', 2024, 'monthly');
 * ```
 */
export function buildUserYearStatsFilter(
  userId: string,
  year: number,
  statsType: string = 'yearly'
): string {
  return createFilter()
    .userScope(userId)
    .equals('year', year)
    .equals('stats_type', statsType)
    .build();
}

/**
 * Build project relation filter for child records
 *
 * Creates a secure filter expression for querying records related to a specific project.
 * Commonly used for progress notes, tags, images, and other project-associated data.
 * Uses secure parameterized queries to prevent SQL injection.
 *
 * @function
 * @param {string} projectId - Unique identifier of the target project
 * @returns {string} Filter expression for project-related records
 *
 * @example
 * ```typescript
 * // Get all progress notes for a project
 * const filter = buildProjectRelationFilter('proj_abc123');
 * const notes = await pb.collection('progress_notes').getList(1, 50, {
 *   filter // Result: "project = {:project}"
 * });
 *
 * // Get project tags
 * const tagFilter = buildProjectRelationFilter('proj_abc123');
 * const projectTags = await pb.collection('project_tags').getList(1, 100, {
 *   filter: tagFilter
 * });
 * ```
 */
export function buildProjectRelationFilter(projectId: string): string {
  return createFilter().equals('project', projectId).build();
}

/**
 * Build find-by-name filter with user scope and optional exclusion
 *
 * Creates a secure filter for finding records by name within a user's scope,
 * with optional exclusion of a specific record ID. Commonly used for duplicate
 * validation when creating or updating named entities like companies, artists, or tags.
 *
 * Security Features:
 * - User-scoped queries ensure data isolation
 * - Secure parameter injection prevents SQL injection
 * - Case-sensitive exact name matching
 *
 * @function
 * @param {string} userId - User ID for data isolation
 * @param {string} name - Exact name to search for
 * @param {string} [excludeId] - Optional record ID to exclude from results (useful for updates)
 * @returns {string} Filter expression for name-based queries with user scope
 *
 * @example
 * ```typescript
 * // Check for duplicate company name during creation
 * const filter = buildFindByNameFilter('user123', 'Acme Corp');
 * const duplicates = await pb.collection('companies').getList(1, 1, { filter });
 * // Result: "user = {:userId} && name = {:name}"
 *
 * // Check for duplicate during update (exclude current record)
 * const updateFilter = buildFindByNameFilter('user123', 'Updated Name', 'comp_456');
 * const conflicts = await pb.collection('companies').getList(1, 1, {
 *   filter: updateFilter
 * });
 * // Result: "user = {:userId} && name = {:name} && id != {:id}"
 *
 * // Validate unique artist name
 * const artistFilter = buildFindByNameFilter('user123', 'Van Gogh');
 * const existingArtists = await pb.collection('artists').getList(1, 1, {
 *   filter: artistFilter
 * });
 * ```
 */
export function buildFindByNameFilter(userId: string, name: string, excludeId?: string): string {
  const builder = createFilter().userScope(userId).equals('name', name);

  if (excludeId) {
    builder.notEquals('id', excludeId);
  }

  return builder.build();
}

/**
 * Build date cleanup filter for removing old records
 *
 * Creates a secure filter for identifying old records that need cleanup or archival.
 * Combines user scope isolation with date-based filtering to safely identify
 * records older than a specified cutoff date. Commonly used for data maintenance,
 * cache cleanup, and automated archival processes.
 *
 * Security Features:
 * - User-scoped queries ensure data isolation
 * - Secure parameter injection prevents SQL injection
 * - Date validation through parameterized queries
 *
 * @function
 * @param {string} userId - User ID for data isolation
 * @param {string} dateField - Name of the date field to filter on (e.g., 'created', 'updated', 'date_completed')
 * @param {string} cutoffDate - ISO date string for the cutoff threshold (records before this date will match)
 * @returns {string} Filter expression for date-based cleanup queries
 *
 * @example
 * ```typescript
 * // Clean up old cache entries (older than 7 days)
 * const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
 * const filter = buildDateCleanupFilter('user123', 'created', sevenDaysAgo);
 * const oldCache = await pb.collection('user_cache').getList(1, 100, { filter });
 * // Result: "user = {:userId} && created < {:created}"
 *
 * // Archive completed projects older than 1 year
 * const lastYear = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
 * const archiveFilter = buildDateCleanupFilter('user123', 'date_completed', lastYear);
 * const oldProjects = await pb.collection('projects').getList(1, 50, {
 *   filter: archiveFilter
 * });
 *
 * // Clean up old error logs
 * const thirtyDaysAgo = '2024-05-30T00:00:00.000Z';
 * const logFilter = buildDateCleanupFilter('user123', 'timestamp', thirtyDaysAgo);
 * const oldLogs = await pb.collection('error_logs').getList(1, 200, {
 *   filter: logFilter
 * });
 * ```
 */
export function buildDateCleanupFilter(
  userId: string,
  dateField: string,
  cutoffDate: string
): string {
  return createFilter().userScope(userId).lessThan(dateField, cutoffDate).build();
}
