# Project Status Standardization

## Overview

This migration standardizes project status values in the database to ensure consistency between the database and application. Specifically, it converts all instances of `"in_progress"` to `"progress"` to match the application's `ProjectStatus` type definition.

## Background

We identified an issue where projects with status `"in_progress"` were not appearing in the Overview page but were visible in the Dashboard. This inconsistency was caused by:

1. The database storing project status as either `"progress"` or `"in_progress"` (two different formats)
2. Different components using different status values in their filter criteria

## Changes Made

1. **Database Migration**: Created a migration script to update all existing records with `"in_progress"` status to use `"progress"` instead
2. **Standardized Status Mapping**: Updated the `dbConversion.ts` utility to ensure consistent mapping between database and application status values
3. **Query Standardization**: Added helper methods to `ProjectQueryService` and `ProjectQueryServiceImpl` to standardize status values in queries

## Running the Migration

To run the migration and update all existing projects:

```bash
# From the project root
node scripts/run-status-migration.js
```

## Verification

After running the migration, you should see:

1. Consistent project counts between the Overview and Dashboard pages
2. All in-progress projects appearing in both views
3. No projects with status `"in_progress"` in the database (all should be `"progress"`)

## Future Considerations

For future development:

1. Always use `"progress"` (not `"in_progress"`) when referring to in-progress projects
2. Use the standardized status values from the `ProjectStatus` type
3. Leverage the `mapAppStatusToDbStatus` and `standardizeStatusForQuery` helper methods when working with project status values
