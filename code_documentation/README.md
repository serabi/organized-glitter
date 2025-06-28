# Organized Glitter User Flow Documentation

This directory contains sequence diagrams showing how typical users flow through the Organized Glitter diamond painting project management app and the files they encounter.

## Available Diagrams

### [01. Authentication Flow](./01-authentication-flow.md)
Shows the complete authentication process from landing page through login/registration to authenticated dashboard access.

**Key Components:** RootRoute, AuthProvider, Login, Home, ProtectedRoute

### [02. Main Dashboard Experience](./02-dashboard-experience.md) 
Illustrates how users navigate the overview page and access main features through quick actions.

**Key Components:** Overview, Dashboard, DashboardStats, Projects queries

### [03. Project Creation Flow](./03-project-creation.md)
Details the comprehensive project creation process with form validation, image upload, and metadata management.

**Key Components:** NewProject, ProjectForm, Validation schemas, Services

### [04. Project Management Flow](./04-project-management.md)
Shows how users view and manage individual projects, including status updates, notes, and editing.

**Key Components:** ProjectDetail, ProjectMutations, AdvancedEdit, ProgressNotes

### [05. Progress Tracking Flow](./05-progress-tracking.md)
Demonstrates the progress note system for tracking project updates with photos and timeline management.

**Key Components:** ProjectProgressNotes, ProgressNoteForm, Progress mutations

### [06. Data Management/CSV Import Flow](./06-data-management.md)
Covers the bulk import process for adding multiple projects via CSV files with validation and error handling.

**Key Components:** Import, CSV utilities, Bulk mutations, Validation

## How to View These Diagrams

### Option 1: VS Code with Mermaid Preview Extension
1. Install the "Mermaid Preview" extension by vstirbu
2. Open any diagram file
3. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
4. Type "Mermaid Preview: Open Preview"
5. View the rendered diagram in a side panel

### Option 2: Online Mermaid Editors
- Copy the mermaid code from any file
- Paste into [Mermaid Live Editor](https://mermaid.live)
- View and export the rendered diagram

### Option 3: GitHub/GitLab
These platforms automatically render Mermaid diagrams in markdown files when viewing them in the web interface.

## Architecture Overview

**Organized Glitter** is a React + TypeScript application built with:
- **Frontend:** React 18, Vite, shadcn/ui, Tailwind CSS
- **Backend:** PocketBase for data persistence and authentication
- **State Management:** React Query (TanStack Query v5) for server state
- **Forms:** React Hook Form with Zod validation
- **Testing:** Vitest + React Testing Library

The application follows a service-oriented architecture with:
- Modular component structure organized by features
- Custom hooks for business logic
- Repository pattern for data access
- Comprehensive error handling and loading states
- Progressive image compression and optimization