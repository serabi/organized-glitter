# Security Fix: Function Search Path Migration

**Date**: 2025-05-31  
**Linear Task**: ORG-13  
**Migration File**: `2025-05-31-fix-function-search-path-security.sql`

## Problem

Supabase Security Advisor detected two database functions with mutable search paths, creating potential security vulnerabilities:

1. `public.link_tag_to_project` - Function for linking tags to projects
2. `public.update_account_deletions_updated_at` - Trigger function for updating deletion timestamps

## Security Risk

Functions without explicit `search_path` settings are vulnerable to **search path injection attacks**:

- Malicious users could manipulate their session's search_path
- They could create malicious functions in schemas earlier in the search path
- The target function might execute malicious code instead of intended operations

## Solution

Added explicit `SET search_path TO 'public'` to both functions, following the security pattern already established by other functions in the schema (e.g., `delete_user`, `handle_new_user`).

## Changes Made

### Before

```sql
CREATE OR REPLACE FUNCTION "public"."link_tag_to_project"(...)
LANGUAGE "plpgsql" SECURITY DEFINER
-- Missing: SET search_path directive
```

### After

```sql
CREATE OR REPLACE FUNCTION "public"."link_tag_to_project"(...)
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'  -- ✅ Added security directive
```

## Testing

- Functions maintain identical behavior and functionality
- All existing permissions preserved
- No breaking changes to application code
- Security vulnerability resolved

## Impact

- **Security**: Eliminates search path injection vulnerability
- **Functionality**: No changes to existing behavior
- **Performance**: No performance impact
- **Compatibility**: Fully backward compatible

## Verification

After applying this migration, the Supabase Security Advisor should no longer show warnings for these functions.
