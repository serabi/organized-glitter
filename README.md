# Organized Glitter - Diamond Art Project Management

[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://www.instagram.com/organized_glitter/)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/serabi/organized-glitter?utm_source=oss&utm_medium=github&utm_campaign=serabi%2Forganized-glitter&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

Organized Glitter is a modern web application for diamond painters! Allows for tracking projects, managing your "stash", and documenting progress.

Currently built with React, TypeScript, and PocketBase.

## Core Features

- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices with adaptive layouts
- **Mobile-First Navigation**: Bottom navigation bar for mobile and tablet users
- **Secure Authentication**: Email/password authentication with PocketBase Auth - everything should be fully secure, with data only available to the person who adds the data.
- **Modern UI**: Dark/light theme support
- **Cloud Storage**: Secure image and data storage with PocketBase, backed up to Cloudflare
- **User-Centric**: Designed specifically for diamond painters by a diamond painter

## Project Management Features

- **Project Tracking**: Comprehensive project management with multiple status levels:

  - Wishlist: Projects you want to buy
  - Purchased: Projects bought but not yet received
  - In Stash: Projects in your collection/stash, but not started
  - In Progress: Currently working on
  - Completed: Finished projects
  - Archived: Projects you've put aside
  - Destashed: Projects you've sold or given away

- **Progress Documentation**: Add detailed progress notes with photos and dates
- **Project Details**: Track comprehensive information:

  - Project title, company, and artist
  - Drill shape (round/square)
  - Dimensions and diamond count
  - Purchase, start, and completion dates
  - Source URLs and general notes
  - Kit category (full/mini)

- **Organization Tools**:

  - Tag system for custom categorization
  - Company and artist management
  - Advanced filtering and sorting
  - Search functionality
  - Import/export capabilities - currently text based, looking to add image export in the future!

- **User Management**:
  - Individual user profiles with customizable avatars
  - Individual account settings and preferences
  - Data export and account deletion options
  - Ability to sign in with Google or Discord

## Security Features

- **Data Privacy**: All user data is private and only accessible to the account owner
- **Authentication Security**: Email/password and OAuth2 authentication with PocketBase Auth
- **Image Security**: Secure image upload and storage with automatic compression

## Technology Stack

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS with CSS Variables
- **State Management**: React Query (TanStack Query) + React Context
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: React Router DOM
- **Theme**: next-themes for dark/light mode
- **Icons**: Lucide React
- **Image Processing**: browser-image-compression for optimized uploads

### Backend Services

- **Authentication**: PocketBase Auth
- **Database**: PocketBase (SQLite)
- **Storage**: PocketBase Storage connected to Cloudflare R2

### Development & Quality

- **Testing**: Vitest with Testing Library
- **Linting**: ESLint with TypeScript support
- **Code Formatting**: Prettier for consistent code style
- **Type Safety**: Strict TypeScript configuration
- **Build Optimization**: Terser for minification
- **Bundle Analysis**: Built-in bundle analyzer scripts
- **Logging**: Unified LogTape-based logging system with security features and performance monitoring

### Deployment & Monitoring

- **Deployment**: Vercel
- **Analytics**: Vercel Analytics

## Project Structure

```
src/
├── components/                    # Reusable UI components
│   ├── advanced/                 # Advanced table editing components
│   ├── artist/                   # Artist management components
│   ├── auth/                     # Authentication components
│   ├── company/                  # Company management components
│   ├── dashboard/                # Dashboard and project grid components
│   ├── error/                    # Error boundary components
│   ├── integrations/             # External service integrations
│   ├── layout/                   # Layout and navigation components
│   ├── overview/                 # Overview page sections
│   ├── profile/                  # User profile components
│   ├── projects/                 # Project-specific components
│   ├── randomizer/               # Project randomizer wheel components
│   ├── routing/                  # Application routing
│   ├── tags/                     # Tag management components
│   └── ui/                       # shadcn/ui base components
├── contexts/                     # React context providers
│   ├── AuthContext/              # Authentication state management
│   ├── DashboardFiltersContext.tsx # Dashboard filtering state
│   └── MetadataContext.tsx       # Application metadata
├── features/                     # Feature-specific logic
│   └── dashboard/                # Dashboard feature constants
├── hooks/                        # Custom React hooks
│   ├── dashboard/                # Dashboard-specific hooks
│   ├── mutations/                # React Query mutation hooks
│   ├── queries/                  # React Query query hooks
│   └── __tests__/                # Hook test files
├── lib/                          # Configuration and utilities
│   ├── pocketbase.ts             # PocketBase client setup
│   ├── queryClient.ts            # React Query configuration
│   └── utils.ts                  # Common utilities
├── pages/                        # Page components
├── schemas/                      # Zod validation schemas
├── services/                     # Service layer
│   ├── pocketbase/               # PocketBase service implementations
│   │   ├── artistService.ts      # Artist data operations
│   │   ├── baseService.ts        # Base service class
│   │   ├── companyService.ts     # Company data operations
│   │   ├── dashboardStatsService.ts # Dashboard statistics with caching
│   │   ├── progressNotesService.ts # Progress notes operations
│   │   └── projectService.ts     # Project data operations
│   └── auth.ts                   # Authentication service
├── stores/                       # State management stores
├── styles/                       # CSS stylesheets
├── test-utils/                   # Testing utilities
│   ├── factories/                # Data factories for tests
│   ├── helpers/                  # Test helper functions
│   └── mocks/                    # Mock implementations
├── types/                        # TypeScript type definitions
│   ├── pocketbase.types.ts       # Auto-generated PocketBase types
│   ├── project.ts                # Project-related types
│   ├── dashboard-stats.ts        # Dashboard statistics types
│   └── ...                       # Other type definitions
└── utils/                        # Helper functions
    ├── csvExport.ts              # CSV export functionality
    ├── csvImport.ts              # CSV import functionality
    ├── imageUtils.ts             # Image processing utilities
    ├── overviewStatsCalculator.ts # Overview statistics calculations
    ├── logger.ts                 # Unified logging system 
    └── __tests__/                # Utility test files

Root Level Structure:
├── api/                          # Vercel API endpoints
├── public/                       # Static assets
│   ├── images/                   # Project images and logos
│   ├── css/                      # Static CSS files
│   └── js/                       # Static JavaScript files
└── test/                         # Global test configuration
```

## Getting Started

### Prerequisites

- Node.js 22.x and npm 10.0.0+
- Modern browser (Chrome, Firefox, Safari, Edge)

### Local PocketBase Setup

```bash
# 1. Set up environment (one-time)
cp env.template .env
# Edit .env with your PocketBase credentials

# 2. Start development
npm run dev
```

For local development, you'll need to set up your own PocketBase instance:

1. **Download PocketBase**

   Visit [PocketBase Downloads](https://pocketbase.io/docs/) and download PocketBase - OG currently runs on v0.28.x

2. **Create a local PocketBase directory**

   ```bash
   mkdir pocketbase-local
   cd pocketbase-local
   ```

3. **Extract and run PocketBase**

   ```bash
   # Extract the downloaded file to this directory
   # Then start PocketBase
   ./pocketbase serve
   ```

4. **Set up admin account**

   Navigate to `http://127.0.0.1:8090/_/` in your browser and create an admin account.

5. **Configure collections**

   You'll need to set up the required collections for the application. You can find a list of the collections in the [Database Readme](database_readme.md) Use the PocketBase admin interface or a migration script to create these collections with the appropriate fields.

6. **Update environment variables**

   In your `.env` file, set:

   ```
   VITE_POCKETBASE_URL=http://127.0.0.1:8090
   ```

7. **Use local development commands**
   ```bash
   npm run dev:local    # Development with local PocketBase
   npm run pb:local     # Start local PocketBase server
   ```

### Standard Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/serabi/organized-glitter.git
   cd organized-glitter
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.template .env
   ```

   Fill in your PocketBase credentials and other required environment variables.

4. **Start development server**

   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Testing

### Available Test Commands

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Code Formatting

```bash
# Format all files with Prettier
npm run format

# Check if files are formatted correctly
npm run format:check
```

### Performance & Bundle Analysis

```bash
# Build with bundle analysis
npm run build:analyze

# Monitor bundle size changes
npm run bundle:monitor

# Run performance benchmarks
npm run perf:benchmark

# Build and monitor bundle size
npm run build:monitor
```

### Test Coverage

The project includes comprehensive test coverage for:

- React components with Testing Library
- Custom hooks and utilities
- Authentication flows
- Data management logic

## Deployment

The application is deployed at [organizedglitter.app](https://organizedglitter.app).

## Database Schema

The application uses a comprehensive collection-based structure managed by PocketBase (using SQLite), with the following main collections:

- **profiles**: User profile information and preferences
- **projects**: Diamond art project data with comprehensive tracking
- **progress_notes**: Progress documentation with photos and dates
- **companies**: Project manufacturer information
- **artists**: Project artist information
- **tags**: Custom categorization system
- **project_tags**: Many-to-many relationship for project tagging

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write tests for new features
- Use semantic commit messages
- Update documentation as needed
- Ensure accessibility standards are met
- When using AI for programming assistance, please use the Context7 MCP server to ensure you have the most up to date PocketBase documentation

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

### What This Means

- **Free to use** for personal and non-commercial purposes
- **Open source contributions** welcome (see [CONTRIBUTING.md](CONTRIBUTING.md))
- **Network copyleft** - anyone running this as a service must provide source code

### Commercial Licensing

At this time, **no commercial licensing is available.** I will update this README if that changes in the future.

## Acknowledgments

- [PocketBase](https://pocketbase.io) for backend services
- [shadcn/ui](https://ui.shadcn.com) for UI components
- [Vite](https://vitejs.dev) for build tooling
- [Vercel](https://vercel.com) for deployment platform
- The diamond painting community for inspiration and feedback - especially the Crafter's Den Discord

---

**Live Application**: [organizedglitter.app](https://organizedglitter.app)  
**Repository**: [GitHub](https://github.com/serabi/organized-glitter)
