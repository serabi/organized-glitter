/**
 * @fileoverview Project Randomizer Page Component
 *
 * Main page component for the project randomizer feature. Provides a complete
 * interface for selecting projects, spinning the wheel, viewing results, and
 * managing spin history. Features responsive design, accessibility support,
 * and comprehensive error handling.
 *
 * @author Generated with Claude Code
 * @version 1.0.0
 * @since 2024-06-28
 */

import React from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RandomizerWheel } from '@/components/randomizer/RandomizerWheel';
import { ProjectSelector } from '@/components/randomizer/ProjectSelector';
import { SpinHistory } from '@/components/randomizer/SpinHistory';
import { useRandomizer } from '@/hooks/useRandomizer';
import { useAuth } from '@/hooks/useAuth';
import { Shuffle, ExternalLink, Lightbulb } from 'lucide-react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectRandomizer');

/**
 * Project Randomizer page component
 *
 * Main page for the randomizer feature that allows users to select from their
 * in-progress projects and spin a wheel to randomly choose which project to work on.
 * Includes project selection, spinning wheel, results display, and history tracking.
 *
 * @returns {JSX.Element} The complete randomizer page with all functionality
 *
 * @features
 * - Interactive spinning wheel with brand colors and animations
 * - Project selection interface with batch operations
 * - Spin result display with navigation to selected project
 * - Comprehensive statistics dashboard
 * - Spin history with pagination and timestamps
 * - Responsive design for all device sizes
 * - Accessibility support (WCAG 2.1 AA)
 * - Error handling and loading states
 * - Empty state guidance for new users
 *
 * @layout
 * 1. **Hero Section**: Large randomizer wheel at the top
 * 2. **Statistics**: 4-card grid showing key metrics
 * 3. **Two-Column Layout**:
 *    - Left: Project selection interface
 *    - Right: Spin history and management
 *
 * @userflow
 * 1. User sees their in-progress projects in the selection area
 * 2. User selects 2+ projects they want to include in randomization
 * 3. User clicks "Spin the Wheel!" to randomly select a project
 * 4. Result is displayed with link to go work on that project
 * 5. Spin is automatically saved to history for future reference
 *
 * @accessibility
 * - Keyboard navigation throughout
 * - Screen reader announcements for spin results
 * - Semantic HTML structure with proper headings
 * - Focus management and visual indicators
 * - Alternative content for complex interactions
 */
const ProjectRandomizer: React.FC = () => {
  const { user } = useAuth();

  /** Main randomizer hook providing all state and actions */
  const {
    availableProjects,
    selectedProjects,
    selectedProjectIds,
    lastSpinResult,
    stats,
    isLoading,
    isLoadingProjects,
    isCreatingSpin,
    error,
    toggleProject,
    selectAllProjects,
    selectNoProjects,
    handleSpinComplete,
    clearLastResult,
  } = useRandomizer();

  React.useEffect(() => {
    logger.debug('ProjectRandomizer mounted', {
      availableProjectsCount: availableProjects.length,
      selectedProjectsCount: selectedProjectIds.size,
    });
  }, [availableProjects.length, selectedProjectIds.size]);

  if (error) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load randomizer data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <Shuffle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Project Randomizer</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Can't decide which project to work on? Let the wheel choose for you!
          </p>
        </div>

        {/* Hero Section - Randomizer Wheel */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardDescription className="text-lg">
              Select your in-progress projects below, then come back to spin the wheel!
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <RandomizerWheel
              projects={selectedProjects}
              onSpinComplete={handleSpinComplete}
              disabled={!stats.canSpin || isCreatingSpin}
            />

            {/* Spin Result */}
            {lastSpinResult && (
              <div className="mt-8 w-full max-w-md">
                <Card className="border-primary bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-center text-xl">Selected Project</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-center">
                    <h3 className="text-2xl font-bold">{lastSpinResult.title}</h3>
                    {(lastSpinResult.company || lastSpinResult.artist) && (
                      <p className="text-lg text-muted-foreground">
                        {[lastSpinResult.company, lastSpinResult.artist]
                          .filter(Boolean)
                          .join(' • ')}
                      </p>
                    )}
                    <div className="flex justify-center gap-3">
                      <Button asChild>
                        <Link to={`/projects/${lastSpinResult.id}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Project
                        </Link>
                      </Button>
                      <Button variant="outline" onClick={clearLastResult}>
                        Clear Result
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Helper Messages */}
            {!stats.hasProjects && !isLoadingProjects && (
              <Alert className="mt-8 max-w-lg">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="text-base">
                  You don't have any projects in progress.
                  <Link to="/dashboard" className="ml-1 font-medium text-primary hover:underline">
                    Start some projects
                  </Link>{' '}
                  to use the randomizer!
                </AlertDescription>
              </Alert>
            )}

            {stats.hasSelection && !stats.canSpin && (
              <Alert className="mt-8 max-w-lg">
                <Lightbulb className="h-4 w-4" />
                <AlertDescription className="text-base">
                  Select at least 2 projects to make the randomizer interesting!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.totalProjects}</div>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.selectedCount}</div>
              <p className="text-sm text-muted-foreground">Selected</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.recentSpins}</div>
              <p className="text-sm text-muted-foreground">Total Spins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{stats.canSpin ? '✓' : '○'}</div>
              <p className="text-sm text-muted-foreground">Ready to Spin</p>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Section - Project Selection and History */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Left Panel - Project Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Projects</CardTitle>
              <CardDescription>
                Select which in-progress projects to include in the randomizer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectSelector
                projects={availableProjects}
                selectedProjects={selectedProjectIds}
                onProjectToggle={toggleProject}
                onSelectAll={selectAllProjects}
                onSelectNone={selectNoProjects}
                isLoading={isLoadingProjects}
              />
            </CardContent>
          </Card>

          {/* Right Panel - Spin History */}
          <Card>
            <CardHeader>
              <CardTitle>Spin History</CardTitle>
              <CardDescription>Your recent randomizer results</CardDescription>
            </CardHeader>
            <CardContent>
              <SpinHistory userId={user?.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProjectRandomizer;
