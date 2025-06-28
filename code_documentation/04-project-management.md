# Project Management Flow

This diagram shows how users view and manage individual projects.

```mermaid
sequenceDiagram
    participant User
    participant ProjectDetail as ProjectDetail.tsx
    participant ProjectQuery as useProjectDetailQuery
    participant ProjectMutations as useProjectDetailMutations
    participant ProgressNotes as ProjectProgressNotes.tsx
    participant AdvancedEdit as AdvancedEdit.tsx
    participant PocketBase as PocketBase Backend

    User->>ProjectDetail: Navigate to /projects/{id}
    ProjectDetail->>ProjectQuery: Fetch project details
    ProjectQuery->>PocketBase: Query project with expanded relations
    PocketBase-->>ProjectQuery: Return project with company/artist data
    ProjectQuery-->>ProjectDetail: Display project information
    
    ProjectDetail-->>User: Show project details with action buttons
    
    alt User updates project status
        User->>ProjectDetail: Change status dropdown
        ProjectDetail->>ProjectMutations: Update project status
        ProjectMutations->>PocketBase: PATCH project record
        PocketBase-->>ProjectMutations: Return updated project
        ProjectMutations-->>ProjectDetail: Optimistic update success
        ProjectDetail-->>User: Show updated status
        
    else User adds project notes
        User->>ProjectDetail: Enter notes in textarea
        ProjectDetail->>ProjectMutations: Update project notes
        ProjectMutations->>PocketBase: PATCH project record
        PocketBase-->>ProjectMutations: Return updated project
        ProjectMutations-->>ProjectDetail: Update success
        
    else User views progress notes
        User->>ProjectDetail: Click progress notes section
        ProjectDetail->>ProgressNotes: Load progress notes component
        ProgressNotes-->>User: Show progress timeline and add note form
        
    else User edits project details
        User->>ProjectDetail: Click "Edit Project"
        ProjectDetail->>AdvancedEdit: Navigate to /projects/{id}/edit
        AdvancedEdit-->>User: Show comprehensive edit form
        
    else User archives project
        User->>ProjectDetail: Click archive button
        ProjectDetail->>ProjectMutations: Archive project
        ProjectMutations->>PocketBase: Update project status to archived
        PocketBase-->>ProjectMutations: Confirm archive
        ProjectMutations-->>ProjectDetail: Show success toast
        ProjectDetail-->>User: Project archived notification
    end
```

## Key Files Involved

- `src/pages/ProjectDetail.tsx` - Individual project view and management
- `src/hooks/queries/useProjectDetailQuery.ts` - Project detail queries
- `src/hooks/mutations/useProjectDetailMutations.ts` - Project update operations
- `src/components/projects/ProjectProgressNotes.tsx` - Progress notes interface
- `src/pages/AdvancedEdit.tsx` - Comprehensive project editing
- `src/components/ui/toast.tsx` - Toast notification system