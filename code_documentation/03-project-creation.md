# Project Creation Flow

This diagram shows the complete project creation process with validation and metadata handling.

```mermaid
sequenceDiagram
    participant User
    participant NewProject as NewProject.tsx
    participant ProjectForm as ProjectForm components
    participant ValidationSchema as Zod validation
    participant ProjectService as projectService
    participant MetadataService as Metadata services
    participant PocketBase as PocketBase Backend
    participant ProjectDetail as ProjectDetail.tsx

    User->>NewProject: Navigate to /projects/new
    NewProject->>ProjectForm: Initialize form with default values
    ProjectForm-->>User: Show two-tab form (Details + Statistics)

    User->>ProjectForm: Fill project details
    User->>ProjectForm: Upload project image
    ProjectForm->>ProjectForm: Compress image if needed
    User->>ProjectForm: Enter company/artist (creates if new)
    User->>ProjectForm: Add tags
    User->>ProjectForm: Set project status and dates

    User->>ProjectForm: Switch to Statistics tab
    User->>ProjectForm: Enter dimensions, diamond count, etc.

    User->>ProjectForm: Submit form
    ProjectForm->>ValidationSchema: Validate form data

    alt Validation fails
        ValidationSchema-->>ProjectForm: Return validation errors
        ProjectForm-->>User: Show error messages
    else Validation passes
        ValidationSchema-->>ProjectForm: Data valid

        ProjectForm->>MetadataService: Create company if new
        MetadataService->>PocketBase: Insert company record
        PocketBase-->>MetadataService: Return company ID

        ProjectForm->>MetadataService: Create artist if new
        MetadataService->>PocketBase: Insert artist record
        PocketBase-->>MetadataService: Return artist ID

        ProjectForm->>ProjectService: Create project
        ProjectService->>PocketBase: Insert project with image upload
        PocketBase-->>ProjectService: Return created project
        ProjectService-->>ProjectForm: Project created successfully

        ProjectForm->>ProjectDetail: Navigate to /projects/{projectId}
        ProjectDetail-->>User: Show created project detail page
    end
```

## Key Files Involved

- `src/pages/NewProject.tsx` - Project creation form
- `src/components/projects/ProjectForm/` - Modular project form components
- `src/schemas/projectSchema.ts` - Zod validation schemas
- `src/services/pocketbase/projectService.ts` - Project data operations
- `src/services/pocketbase/companyService.ts` - Company metadata service
- `src/services/pocketbase/artistService.ts` - Artist metadata service
- `src/pages/ProjectDetail.tsx` - Individual project view
- `src/utils/imageCompression.ts` - Image processing utilities
