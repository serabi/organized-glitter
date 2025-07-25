# PocketBase Services

This directory contains PocketBase integration services that follow consistent patterns for data access, error handling, and type safety.

## Services

### FilesService (`files.service.ts`)

File handling service that consolidates upload, compression, and validation patterns.

**Features:**
- Context-aware validation (project images, progress notes, avatars)
- Automatic image compression with progress tracking
- Consistent error handling and retry logic
- Type-safe PocketBase integration
- Support for thumbnails and file URLs

**Usage:**
```typescript
import { FilesService } from '@/services/pocketbase/files.service';

// Upload a project image
const result = await FilesService.uploadFile(file, {
  context: 'project-image',
  collection: 'projects',
  recordId: projectId,
  compress: true,
  onProgress: (progress) => console.log(`${progress}%`),
});

// Get file URL with thumbnail
const url = FilesService.getFileUrl(project, 'image', '300x200f');

// Delete file
await FilesService.deleteFile('projects', projectId, 'image');
```

### ProjectsService (`projects.service.ts`)

Optimized service for project data operations with structured filtering and performance monitoring.

### Base Services (`base/`)

Foundation classes providing:
- `BaseService`: Generic CRUD operations
- `FilterBuilder`: Type-safe query building
- `ErrorHandler`: Consistent error handling
- `FieldMapper`: camelCase ↔ snake_case conversion
- `SubscriptionManager`: Real-time updates

## Migration from Legacy Services

The new services replace several legacy utilities:

- `@/utils/imageUpload.ts` → `FilesService.uploadFile()`
- `@/utils/storageService.ts` → `FilesService` methods
- Raw PocketBase calls → `BaseService` or specific services

## Error Handling

All services use consistent error handling:

```typescript
try {
  const result = await FilesService.uploadFile(file, options);
} catch (error) {
  // Error is already processed and user-friendly
  console.error('Upload failed:', error.message);
}
```

## Type Safety

Services are fully typed with TypeScript:

```typescript
// Type-safe options
const options: FileUploadOptions = {
  context: 'project-image', // Autocomplete available
  collection: 'projects',   // Only valid collections
  recordId: 'abc123',
  compress: true,
};

// Type-safe results
const result: FileUploadResult = await FilesService.uploadFile(file, options);
```

## Performance

- Automatic image compression reduces bandwidth by 60-95%
- Retry logic handles transient network issues
- Progress callbacks for user feedback
- Optimized PocketBase queries with structured filters