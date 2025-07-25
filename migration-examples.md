# LogLayer Migration Examples

## Before vs After Comparison

### 1. Service Logging (ProjectsService)

**BEFORE (Current System):**

```typescript
import { createLogger, batchApiLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectsService');

// Complex performance tracking
async getBatchStatusCounts(baseFilters: ProjectFilters): Promise<BatchStatusCountResult> {
  const startTime = this.config.enablePerformanceLogging ? performance.now() : 0;
  const batchId = batchApiLogger.startBatchOperation(
    'batch-status-counts',
    'status-counts-single-optimized',
    1,
  );

  try {
    // ... business logic ...

    if (this.config.enablePerformanceLogging) {
      const endTime = performance.now();
      batchApiLogger.endBatchOperation(batchId, total, {
        totalCounts: total,
        statusBreakdown: counts,
      });
    }
  } catch (error) {
    logger.error('❌ Status counting failed:', error);
    batchApiLogger.endBatchOperation(batchId, 0, { error: String(error) });
    throw ErrorHandler.handleError(error, 'Status counting');
  }
}
```

**AFTER (LogLayer):**

```typescript
import { apiLogger, performanceLogger } from '@/utils/modernLogger';

// Simplified with built-in performance tracking
async getBatchStatusCounts(baseFilters: ProjectFilters): Promise<BatchStatusCountResult> {
  const perf = performanceLogger.start('batch-status-counts', 'Single optimized status count query', 1);

  try {
    apiLogger
      .withContext({ operation: 'getBatchStatusCounts' })
      .withMetadata({ filters: baseFilters })
      .debug('Starting status count operation');

    // ... business logic ...

    perf.end(total, { totalCounts: total, statusBreakdown: counts });

    return { counts, total };
  } catch (error) {
    apiLogger
      .withError(error)
      .withContext({ operation: 'getBatchStatusCounts' })
      .error('Status counting failed');

    perf.end(0, { error: error.message });
    throw ErrorHandler.handleError(error, 'Status counting');
  }
}
```

### 2. Hook Logging (useDashboardPersistence)

**BEFORE:**

```typescript
import { secureLogger } from '@/utils/secureLogger';

try {
  localStorage.setItem('dashboardFilters', JSON.stringify(filterState));
} catch (error) {
  secureLogger.error('Failed to persist dashboardFilters to localStorage', error);
}
```

**AFTER:**

```typescript
import { uiLogger } from '@/utils/modernLogger';

try {
  localStorage.setItem('dashboardFilters', JSON.stringify(filterState));
} catch (error) {
  uiLogger
    .withError(error)
    .withContext({ operation: 'persistFilters' })
    .withMetadata({ filterState })
    .error('Failed to persist dashboard filters to localStorage');
}
```

### 3. Authentication Service

**BEFORE:**

```typescript
import { createLogger } from '@/utils/secureLogger';

const authLogger = createLogger('AuthService');

authLogger.debug('Processing login attempt', { email: userData.email });
```

**AFTER:**

```typescript
import { authLogger } from '@/utils/modernLogger';

authLogger
  .withContext({ userId: userData.id, sessionId: generateSessionId() })
  .withMetadata({ email: userData.email, loginMethod: 'password' })
  .info('Processing login attempt');
```

## Code Reduction Summary

### Files You Can DELETE:

- `src/utils/secureLogger.ts` (300+ lines) → DELETED
- All logger mocking in tests → SIMPLIFIED

### Files You Can SIMPLIFY:

- Every service file: Remove complex logger setup
- Every hook: Simplified error logging
- Test files: Minimal mocking needed

### New Capabilities You Get:

1. **Structured Context**: Every log can carry persistent context
2. **Rich Metadata**: Per-log metadata without manual serialization
3. **Built-in Performance**: No more manual timing logic
4. **Automatic Redaction**: Sensitive data automatically censored
5. **Better Development**: Rich console output in dev, silent in prod
6. **Type Safety**: Full TypeScript support
7. **Easy Testing**: Minimal mocking required

## Migration Impact

### Lines of Code Reduction:

- **secureLogger.ts**: 300+ lines → 50 lines (-83%)
- **Service files**: ~5-10 lines per file → 2-3 lines (-60%)
- **Test mocks**: ~10-15 lines per test → 2-3 lines (-80%)

### Total Estimated Reduction: **~500-800 lines of code**

### Maintenance Benefits:

- Single logging configuration
- Consistent API across all modules
- Better debugging information
- Easier to add new logging destinations
- Plugin system for future enhancements
