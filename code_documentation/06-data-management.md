# Data Management/CSV Import Flow

This diagram shows how users can bulk import projects via CSV files.

```mermaid
sequenceDiagram
    participant User
    participant Import as Import.tsx
    participant CSVUtils as csvImport.ts utilities
    participant ValidationSchema as CSV validation
    participant BulkMutations as Bulk import mutations
    participant MetadataService as Metadata services
    participant ProjectService as projectService
    participant PocketBase as PocketBase Backend
    participant Dashboard as Dashboard.tsx

    User->>Import: Navigate to /import
    Import-->>User: Show CSV import interface
    
    alt User downloads template
        User->>Import: Click "Download Template"
        Import->>CSVUtils: Generate CSV template
        CSVUtils-->>User: Download template file
        
    else User uploads CSV
        User->>Import: Select CSV file
        Import->>CSVUtils: Parse CSV file
        CSVUtils->>ValidationSchema: Validate CSV structure and data
        
        alt CSV validation fails
            ValidationSchema-->>CSVUtils: Return validation errors
            CSVUtils-->>Import: Show error details
            Import-->>User: Display validation errors with line numbers
            
        else CSV validation passes
            ValidationSchema-->>CSVUtils: CSV data valid
            CSVUtils-->>Import: Return parsed project data
            Import-->>User: Show preview of projects to import
            
            User->>Import: Confirm import
            Import->>BulkMutations: Start bulk import process
            
            loop For each project in CSV
                BulkMutations->>MetadataService: Create/find company
                MetadataService->>PocketBase: Insert or find company
                PocketBase-->>MetadataService: Return company ID
                
                BulkMutations->>MetadataService: Create/find artist  
                MetadataService->>PocketBase: Insert or find artist
                PocketBase-->>MetadataService: Return artist ID
                
                BulkMutations->>ProjectService: Create project
                ProjectService->>PocketBase: Insert project record
                PocketBase-->>ProjectService: Return created project
                ProjectService-->>BulkMutations: Project created
            end
            
            BulkMutations-->>Import: All projects imported successfully
            Import-->>User: Show import success summary
            
            User->>Import: Click "View Projects"
            Import->>Dashboard: Navigate to /dashboard
            Dashboard-->>User: Show updated project list
        end
    end
```

## Key Files Involved

- `src/pages/Import.tsx` - CSV import interface
- `src/utils/csvImport.ts` - CSV parsing and validation utilities
- `src/utils/csvExport.ts` - CSV template generation
- `src/hooks/mutations/useBulkImportMutations.ts` - Bulk import operations
- `src/services/pocketbase/projectService.ts` - Project data operations
- `src/services/pocketbase/companyService.ts` - Company metadata service
- `src/services/pocketbase/artistService.ts` - Artist metadata service
- `src/pages/Dashboard.tsx` - Full project management interface