# Authentication Flow

This diagram shows how users authenticate and gain access to the Organized Glitter app.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant RootRoute as RootRoute.tsx
    participant Home as Home.tsx  
    participant Login as Login.tsx
    participant AuthProvider as AuthProvider.tsx
    participant PocketBase as PocketBase Backend
    participant ProtectedRoute as ProtectedRoute.tsx
    participant Overview as Overview.tsx

    User->>Browser: Navigate to app
    Browser->>RootRoute: Load /
    RootRoute->>AuthProvider: Check authentication status
    AuthProvider->>PocketBase: Validate session token
    
    alt User not authenticated
        PocketBase-->>AuthProvider: No valid session
        AuthProvider-->>RootRoute: User not authenticated
        RootRoute->>Home: Render landing page
        Home-->>User: Show marketing page with CTAs
        
        User->>Home: Click "Get Started for Free"
        Home->>Login: Navigate to /login
        Login-->>User: Show login/register form
        
        alt User registers
            User->>Login: Submit registration form
            Login->>AuthProvider: Register user
            AuthProvider->>PocketBase: Create user account
            PocketBase-->>AuthProvider: Send verification email
            AuthProvider-->>Login: Registration success
            Login-->>User: Show "Check email" message
            
            User->>User: Check email and click verification link
            User->>Login: Return to login with verified account
        end
        
        User->>Login: Submit login credentials
        Login->>AuthProvider: Authenticate user
        AuthProvider->>PocketBase: Validate credentials
        PocketBase-->>AuthProvider: Return user data + token
        AuthProvider-->>Login: Authentication success
        Login->>Browser: Redirect to /overview
        
    else User authenticated
        PocketBase-->>AuthProvider: Valid session
        AuthProvider-->>RootRoute: User authenticated
        RootRoute->>Browser: Redirect to /overview
    end
    
    Browser->>ProtectedRoute: Load protected route
    ProtectedRoute->>AuthProvider: Verify authentication
    AuthProvider-->>ProtectedRoute: User authenticated
    ProtectedRoute->>Overview: Render overview page
    Overview-->>User: Show personalized dashboard
```

## Key Files Involved

- `src/components/auth/RootRoute.tsx` - Main app entry point and auth routing
- `src/components/auth/ProtectedRoute.tsx` - Wrapper for authenticated routes
- `src/contexts/AuthContext/AuthProvider.tsx` - Authentication state management
- `src/pages/Home.tsx` - Landing page for unauthenticated users
- `src/pages/Login.tsx` - Login and registration forms
- `src/pages/Overview.tsx` - Primary dashboard after login