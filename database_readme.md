# Database Schema Documentation

## Overview

**Database**: PocketBase v0.28.2

## Security Model

### Authentication

- **Primary Auth**: Email/password authentication
- **OAuth2 Providers**: Google, Discord
- **Token Duration**: 7 days for user sessions
- **Password Requirements**: Minimum 8 characters

### Access Control

All user data is strictly scoped to the authenticated user:

- Users can only access their own projects, notes, tags, artists, and companies
- Cross-user data access is prevented at the database level
- Admin access is separate from the user access and is not accessible from the actual application - it's only accessible from the actual database, and only @serabi has access to this.

## Core Collections

### users (Authentication Collection)

Primary user accounts with authentication and profile data.

**Fields:**

- `id` (text, 15 chars, primary key)
- `email` (email, required, unique)
- `username` (text, 4-25 chars, required, unique)
- `avatar` (file, optional)
  - Supported formats: JPEG, PNG, SVG, GIF, WebP, HEIC, HEIF
- `beta_tester` (boolean, default false during testing period)
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- List/View: `id = @request.auth.id`
- Create: Open registration
- Update/Delete: `id = @request.auth.id`

**OAuth2 Configuration:**

- Google and Discord providers enabled
- Username and avatar mapping from OAuth providers

### projects

Core project management with comprehensive metadata.

**Fields:**

- `id` (text, 15 chars, primary key)
- `title` (text, required)
- `user` (relation to users, required)
- `company` (relation to companies, optional)
- `artist` (relation to artists, optional)
- `status` (select, required)
  - Values: `wishlist`, `purchased`, `stash`, `progress`, `onhold`, `completed`, `archived`, `destashed`
- `kit_category` (select, required)
  - Values: `full`, `mini`
- `drill_shape` (select, optional)
  - Values: `round`, `square`
- `source_url` (URL, optional)
- `general_notes` (rich text editor, optional)
- Date fields (all optional):
  - `date_purchased`
  - `date_started`
  - `date_completed`
  - `date_received`
  - **Note**: Frontend forms use camelCase (`datePurchased`) but database expects snake_case (`date_purchased`)
- Dimension fields (numbers, optional):
  - `width`, `height`
  - `total_diamonds`
- `image` (file, optional)
  - Supported formats: PNG, JPEG, GIF, WebP, HEIC, HEIF
  - Max size: 10MB
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `user = @request.auth.id`

**Indexes:**

- User-based filtering and sorting optimizations
- Status and date-based queries
- Composite indexes for common query patterns

### progress_notes

Progress tracking with rich content and image support.

**Fields:**

- `id` (text, 15 chars, primary key)
- `project` (relation to projects, required, cascade delete)
- `content` (rich text editor, optional)
- `date` (date, required)
- `image` (file, optional)
  - Supported formats: JPEG, PNG, WebP, GIF, HEIC, HEIF
  - Max size: 10MB
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `project.user = @request.auth.id`

### artists

Artist/designer management for project attribution.

**Fields:**

- `id` (text, 15 chars, primary key)
- `name` (text, required)
- `user` (relation to users, required)
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `user = @request.auth.id`

### companies

Company/brand management for project sourcing.

**Fields:**

- `id` (text, 15 chars, primary key)
- `name` (text, required)
- `website_url` (URL, optional)
- `user` (relation to users, required, cascade delete)
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `user = @request.auth.id`

### tags

Flexible tagging system for project organization.

**Fields:**

- `id` (text, 15 chars, primary key)
- `name` (text, 1-50 chars, required)
- `slug` (text, required)
- `color` (text, hex color pattern, required)
- `user` (relation to users, required, cascade delete)
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `user = @request.auth.id`

### project_tags

Junction table for many-to-many relationship between projects and tags.

**Fields:**

- `id` (text, 15 chars, primary key)
- `project` (relation to projects, required)
- `tag` (relation to tags, required)
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `project.user = @request.auth.id`
- Create: Additional validation `tag.user = @request.auth.id`

### user_yearly_stats

Cached statistics for performance optimization of yearly analytics.

**Fields:**

- `id` (text, 15 chars, primary key)
- `user` (relation to users, required, cascade delete)
- `year` (number, 2020-2050, required)
- `stats_type` (select, required)
  - Values: `yearly`
- Statistics (all optional integers):
  - `completed_count`
  - `in_progress_count`
  - `started_count`
  - `total_diamonds`
  - `estimated_drills`
  - `projects_included`
  - `calculation_duration_ms`
- `status_breakdown` (JSON, optional)
- `last_calculated` (date, required)
- `cache_version` (text, 0-50 chars, optional)
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `user = @request.auth.id`

**Unique Constraint:**

- Combination of user, year, and stats_type must be unique

### account_deletions

Audit trail for deleted user accounts (database admin access only).

**Fields:**

- `id` (text, 15 chars, primary key)
- `user_id` (text, required)
- `user_email` (text, required)
- `signup_method` (text, required)
- `notes` (text, optional)
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- Create: `@request.auth.id != ""`
- List/View/Update/Delete: Admin only

### randomizer_spins

Project randomizer spin history for tracking which projects users have randomly selected.

**Fields:**

- `id` (text, 15 chars, primary key)
- `user` (relation to users, required, cascade delete)
- `project` (relation to projects, optional, set null on delete)
- `project_title` (text, required) - Stores project title for historical reference
- `selected_projects` (JSON, required) - Array of project IDs that were available during spin
- `metadata` (JSON, optional) - Analytics metadata including selection time, device type, and spin method
- `spun_at` (date, required) - Timestamp when the spin occurred
- `created`, `updated` (auto-managed timestamps)

**Security Rules:**

- All operations: `user = @request.auth.id`

**Cascade Delete Rules:**

- When user deleted: CASCADE DELETE (remove all spin records)
- When project deleted: SET NULL (preserve spin history with readable title)

**Indexes:**

- `idx_randomizer_spins_user_spun_at` - Composite index on (user, spun_at DESC) for primary query pattern
- `idx_randomizer_spins_user` - User-only index for user-specific operations
- `idx_randomizer_spins_spun_at` - Date-only index on (spun_at DESC) for analytics
- `idx_randomizer_spins_project` - Project index for analytics and cascade operations

**Usage:**

- Records each randomizer wheel spin with the selected project
- Maintains history even if projects are deleted (via project_title field)
- Supports pagination with "Show More" functionality (8 recent, expand to 50)
- Enables analytics on most-spun projects and user engagement

## System Collections

The following collections are managed by PocketBase for authentication and security:

- `_mfas` - Multi-factor authentication records
- `_otps` - One-time password records
- `_externalAuths` - OAuth2 authentication records
- `_authOrigins` - Authentication origin tracking
- `_superusers` - Administrator accounts

## File Storage

### Image Handling

- **Storage**: PocketBase native file storage
- **Formats**: JPEG, PNG, WebP, GIF, HEIC, HEIF, SVG (avatars only)
- **Size Limits**: 10MB for project and progress images
- **Processing**: Automatic compression and thumbnail generation
- **Security**: File access controlled by collection permissions

### Content Security

- All file uploads are validated for type and size
- Rich text content is sanitized to prevent XSS
- URL fields validate proper URL format

## Performance Optimizations

### Indexing Strategy

- User-scoped queries optimized with composite indexes
- Date range queries supported for analytics
- Status filtering optimized for dashboard queries

### Date Field Performance Indexes

**Single Date Field Indexes:**

- `idx_projects_date_completed` - Completed date filtering (most common)
- `idx_projects_date_started` - Started date filtering
- `idx_projects_date_received` - Received date filtering
- `idx_projects_date_purchased` - Purchased date filtering

**Composite User + Date Indexes:**

- `idx_projects_user_date_completed` - User-scoped completed date queries
- `idx_projects_user_date_started` - User-scoped started date queries
- `idx_projects_user_date_received` - User-scoped received date queries
- `idx_projects_user_date_purchased` - User-scoped purchased date queries

**Year Extraction Optimization:**

- `idx_projects_year_completed` - Optimized year filtering using `strftime('%Y', date_completed)`

These indexes specifically support:

- useAvailableYears hook
- Year dropdown filtering across all date fields
- Dashboard date-based sorting and filtering
- Reduced database load for metadata queries

### Caching

- Yearly statistics are pre-calculated and cached
- Cache invalidation on relevant data changes
- Performance monitoring with calculation duration tracking

### React Query Optimization

**Modern Cache Management:**

- Optimistic updates replace broad cache invalidation for sort order preservation
- Targeted cache updates using `updateProjectInCache` utility
- 30-minute stale time for metadata queries
- Ultra-lightweight queries using PocketBase field selection

**Query Patterns:**

- `useAvailableYears` hook with field selection optimization
- Request deduplication for repeated metadata queries
- Conservative refetch settings for stable data
- Automatic error recovery with fallback invalidation

## Data Integrity

### Referential Integrity

- Cascade deletes configured for user-owned data
- Foreign key constraints enforced at database level
- Orphaned record prevention via relationship configuration

### Validation

- Field-level validation for data types and formats
- logic validation in application layer
- error handling for constraint violations

### Frontend-Database Field Mapping

**CRITICAL**: The database uses snake_case field names while the frontend uses camelCase. This mapping is required for proper data submission:

| Frontend (camelCase) | Database (snake_case) |
| -------------------- | --------------------- |
| `datePurchased`      | `date_purchased`      |
| `dateReceived`       | `date_received`       |
| `dateStarted`        | `date_started`        |
| `dateCompleted`      | `date_completed`      |

**Implementation**: See `src/hooks/useEditProjectSimplified.tsx` for the field mapping logic used in project updates.

### Future Considerations

- Schema changes should be backward compatible
- Type generation should be updated after schema modifications
- Performance monitoring for query optimization
- Maintain field mapping consistency across all form submissions

## Development Commands

```bash
# Generate TypeScript types from schema
npm run generate:types

# Local development with PocketBase
npm run pb:local
npm run dev:local

# Database health check
npm run db:check
```
