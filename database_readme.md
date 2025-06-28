# Database Schema Documentation

This document provides a comprehensive overview of the PocketBase database schema for the Organized Glitter diamond painting app.

## Overview

**Database**: PocketBase v0.28.2  

The database follows a relational model with user-scoped data access and comprehensive security rules.

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
- Admin access is separate from user access

## Core Collections

### users (Authentication Collection)
Primary user accounts with authentication and profile data.

**Fields:**
- `id` (text, 15 chars, primary key)
- `email` (email, required, unique)
- `username` (text, 4-25 chars, required, unique)
- `avatar` (file, optional)
  - Supported formats: JPEG, PNG, SVG, GIF, WebP, HEIC, HEIF
- `beta_tester` (boolean, default false)
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
  - Values: `wishlist`, `purchased`, `stash`, `progress`, `completed`, `archived`, `destashed`
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
Audit trail for deleted user accounts (admin access only).

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

### Caching
- Yearly statistics are pre-calculated and cached
- Cache invalidation on relevant data changes
- Performance monitoring with calculation duration tracking

## Data Integrity

### Referential Integrity
- Cascade deletes configured for user-owned data
- Foreign key constraints enforced at database level
- Orphaned record prevention through proper relationship configuration

### Validation
- Field-level validation for data types and formats
- Business logic validation in application layer
- Comprehensive error handling for constraint violations


## Migration Notes

### Recent Changes
- Migrated from Cloudflare R2 to PocketBase native file storage
- Enhanced image support including HEIC/HEIF formats
- Added yearly statistics caching system
- Implemented comprehensive indexing strategy

### Frontend-Database Field Mapping
**CRITICAL**: The database uses snake_case field names while the frontend uses camelCase. This mapping is required for proper data submission:

| Frontend (camelCase) | Database (snake_case) |
|---------------------|----------------------|
| `datePurchased`     | `date_purchased`     |
| `dateReceived`      | `date_received`      |
| `dateStarted`       | `date_started`      |
| `dateCompleted`     | `date_completed`     |

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
