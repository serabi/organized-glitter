# Account Deletions Migration Guide

This guide explains how to migrate from the dual `deletion_requests` and `deletion_events` tables to a unified `account_deletions` table.

## Overview

The migration consolidates two separate tables into one unified table that properly tracks account deletion requests and their processing status, along with user feedback.

## Migration Steps

### 1. Create the Unified Table

```sql
-- Run this first
\i src/migrations/2025-05-31-create-unified-account-deletions.sql
```

### 2. Migrate Existing Data

```sql
-- Run this second to consolidate existing data
\i src/migrations/2025-05-31-migrate-deletion-data.sql
```

### 3. Update Database Functions

```sql
-- Run this third to update database functions
\i src/migrations/2025-05-31-update-deletion-functions.sql
```

### 4. Deploy Application Updates

Deploy the updated application code that:

- Uses the new `account_deletions` table
- Calls the new `record_account_deletion` function
- Has updated TypeScript types

### 5. Test the New System

- Test account deletion flow end-to-end
- Verify data is being written to `account_deletions` table
- Confirm old tables are no longer being used

### 6. Clean Up (Optional)

```sql
-- Only run after confirming everything works correctly
\i src/migrations/2025-05-31-cleanup-old-deletion-tables.sql
```

## New Schema

### account_deletions Table

| Column          | Type        | Description                                       |
| --------------- | ----------- | ------------------------------------------------- |
| id              | uuid        | Primary key                                       |
| user_id         | uuid        | User requesting deletion                          |
| user_email      | text        | Email of user                                     |
| signup_method   | text        | How user originally signed up (optional)          |
| notes           | text        | User feedback (optional)                          |
| status          | text        | pending, processing, completed, failed, cancelled |
| created_at      | timestamptz | When request was created                          |
| processed_at    | timestamptz | When request was processed                        |
| processed_by    | uuid        | Who processed the request                         |
| deletion_method | text        | user_requested, admin_action, automated_cleanup   |
| error_details   | text        | Error details if deletion failed                  |
| updated_at      | timestamptz | Last update timestamp                             |

## New Functions

### record_account_deletion

```sql
SELECT record_account_deletion(
    user_id,
    user_email,
    notes,
    signup_method
);
```

### update_account_deletion_status

```sql
SELECT update_account_deletion_status(
    deletion_id,
    new_status,
    error_details
);
```

## Benefits

1. **Single Source of Truth**: One table for all deletion tracking
2. **Better Status Management**: Clear status progression
3. **Enhanced Auditing**: More detailed tracking of deletion process
4. **Improved Performance**: No need to join multiple tables
5. **Cleaner Code**: Simplified queries and logic

## Rollback Plan

If issues arise, you can:

1. Restore from the backup views created during cleanup
2. Revert application code to use old functions
3. The old table structures are preserved in backup views

## Verification Queries

After migration, verify data integrity:

```sql
-- Check record counts
SELECT 'account_deletions' as table_name, COUNT(*) FROM account_deletions
UNION ALL
SELECT 'deletion_requests_backup', COUNT(*) FROM deletion_requests_backup
UNION ALL
SELECT 'deletion_events_backup', COUNT(*) FROM deletion_events_backup;

-- Check status distribution
SELECT status, COUNT(*)
FROM account_deletions
GROUP BY status;

-- Check recent deletions
SELECT user_email, status, created_at, notes
FROM account_deletions
ORDER BY created_at DESC
LIMIT 10;
```
