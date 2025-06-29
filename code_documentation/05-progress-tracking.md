# Progress Tracking Flow

This diagram shows how users add and manage progress notes with photos for their projects.

```mermaid
sequenceDiagram
    participant User
    participant ProgressNotes as ProjectProgressNotes.tsx
    participant ProgressForm as ProgressNoteForm.tsx
    participant ProgressQuery as useProgressNotes hook
    participant ProgressMutations as useProgressNoteMutations
    participant ImageUtils as Image compression utils
    participant PocketBase as PocketBase Backend

    User->>ProgressNotes: View progress notes section
    ProgressNotes->>ProgressQuery: Fetch existing progress notes
    ProgressQuery->>PocketBase: Query progress notes for project
    PocketBase-->>ProgressQuery: Return progress notes list
    ProgressQuery-->>ProgressNotes: Display notes timeline

    ProgressNotes-->>User: Show two tabs: Progress Notes + Add New Note

    User->>ProgressNotes: Click "Add New Note" tab
    ProgressNotes->>ProgressForm: Show add note form
    ProgressForm-->>User: Display note input form

    User->>ProgressForm: Enter progress note text
    User->>ProgressForm: Upload progress photos
    ProgressForm->>ImageUtils: Compress uploaded images
    ImageUtils-->>ProgressForm: Return compressed images

    User->>ProgressForm: Submit progress note
    ProgressForm->>ProgressMutations: Create progress note
    ProgressMutations->>PocketBase: POST progress note with images
    PocketBase-->>ProgressMutations: Return created note
    ProgressMutations-->>ProgressForm: Success response

    ProgressForm->>ProgressQuery: Invalidate progress notes cache
    ProgressQuery->>PocketBase: Refetch progress notes
    PocketBase-->>ProgressQuery: Return updated notes list
    ProgressQuery-->>ProgressNotes: Update timeline display

    ProgressNotes-->>User: Show new note in timeline with success toast

    alt User edits existing note
        User->>ProgressNotes: Click edit on existing note
        ProgressNotes->>ProgressForm: Populate form with existing data
        User->>ProgressForm: Modify note content
        User->>ProgressForm: Submit changes
        ProgressForm->>ProgressMutations: Update progress note
        ProgressMutations->>PocketBase: PATCH progress note
        PocketBase-->>ProgressMutations: Return updated note
        ProgressMutations-->>ProgressNotes: Refresh timeline

    else User deletes note
        User->>ProgressNotes: Click delete on note
        ProgressNotes->>ProgressMutations: Delete progress note
        ProgressMutations->>PocketBase: DELETE progress note
        PocketBase-->>ProgressMutations: Confirm deletion
        ProgressMutations-->>ProgressNotes: Remove from timeline
    end
```

## Key Files Involved

- `src/components/projects/ProjectProgressNotes.tsx` - Progress notes interface
- `src/components/projects/ProgressNoteForm/` - Modular progress note form
- `src/hooks/queries/useProgressNotes.ts` - Progress notes queries
- `src/hooks/mutations/useProgressNoteMutations.ts` - Progress note operations
- `src/utils/imageCompression.ts` - Image processing utilities
- `src/services/pocketbase/progressNotesService.ts` - Progress tracking operations
