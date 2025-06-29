# Main Dashboard Experience Flow

This diagram shows how users navigate the main dashboard and overview pages.

```mermaid
sequenceDiagram
    participant User
    participant Overview as Overview.tsx
    participant DashboardStats as useDashboardStats hook
    participant ProjectsQuery as useProjects hook
    participant Dashboard as Dashboard.tsx
    participant NewProject as NewProject.tsx
    participant Import as Import.tsx
    participant PocketBase as PocketBase Backend

    User->>Overview: Land on overview page
    Overview->>DashboardStats: Fetch dashboard statistics
    DashboardStats->>PocketBase: Query project counts by status
    PocketBase-->>DashboardStats: Return stats data
    DashboardStats-->>Overview: Display welcome section with stats

    Overview->>ProjectsQuery: Fetch in-progress projects
    ProjectsQuery->>PocketBase: Query projects where status = 'In Progress'
    PocketBase-->>ProjectsQuery: Return project list
    ProjectsQuery-->>Overview: Display in-progress projects grid

    Overview-->>User: Show personalized dashboard with quick actions

    alt User clicks "Add New Project"
        User->>Overview: Click "Add New Project"
        Overview->>NewProject: Navigate to /projects/new
        NewProject-->>User: Show project creation form

    else User clicks "View Full Dashboard"
        User->>Overview: Click "View Full Dashboard"
        Overview->>Dashboard: Navigate to /dashboard
        Dashboard->>ProjectsQuery: Fetch all projects with filters
        ProjectsQuery->>PocketBase: Query projects with pagination/filters
        PocketBase-->>ProjectsQuery: Return filtered project list
        Dashboard-->>User: Show comprehensive project management interface

    else User clicks "Import Projects via CSV"
        User->>Overview: Click "Import Projects via CSV"
        Overview->>Import: Navigate to /import
        Import-->>User: Show CSV import interface
    end
```

## Key Files Involved

- `src/pages/Overview.tsx` - Primary dashboard after login
- `src/pages/Dashboard.tsx` - Full project management interface
- `src/hooks/queries/useDashboardStats.ts` - Dashboard statistics
- `src/hooks/queries/useProjects.ts` - Project list queries
- `src/pages/NewProject.tsx` - Project creation form
- `src/pages/Import.tsx` - CSV import interface
