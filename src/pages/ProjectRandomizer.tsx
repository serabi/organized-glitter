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
import { Shuffle, ExternalLink, Lightbulb } from 'lucide-react';
import { createLogger } from '@/utils/secureLogger';

const logger = createLogger('ProjectRandomizer');

const ProjectRandomizer: React.FC = () => {
  const {
    availableProjects,
    selectedProjects,
    selectedProjectIds,
    spinHistory,
    lastSpinResult,
    stats,
    isLoading,
    isLoadingProjects,
    isLoadingHistory,
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
      historyCount: spinHistory.length,
    });
  }, [availableProjects.length, selectedProjectIds.size, spinHistory.length]);

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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shuffle className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Project Randomizer</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Can't decide which project to work on? Let the wheel choose for you!
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              <p className="text-sm text-muted-foreground">Recent Spins</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">
                {stats.canSpin ? '✓' : '○'}
              </div>
              <p className="text-sm text-muted-foreground">Ready to Spin</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Panel - Project Selection */}
          <div className="lg:col-span-4">
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
          </div>

          {/* Center Panel - Randomizer Wheel */}
          <div className="lg:col-span-5">
            <Card>
              <CardHeader>
                <CardTitle>Spin the Wheel</CardTitle>
                <CardDescription>
                  Click to randomly select a project to work on
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <RandomizerWheel
                  projects={selectedProjects}
                  onSpinComplete={handleSpinComplete}
                  disabled={!stats.canSpin || isCreatingSpin}
                />

                {/* Spin Result */}
                {lastSpinResult && (
                  <div className="mt-6 w-full max-w-md">
                    <Card className="border-primary bg-primary/5">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-center">
                          🎉 Selected Project
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-center space-y-3">
                        <h3 className="text-xl font-bold">{lastSpinResult.title}</h3>
                        {(lastSpinResult.company || lastSpinResult.artist) && (
                          <p className="text-muted-foreground">
                            {[lastSpinResult.company, lastSpinResult.artist]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        )}
                        <div className="flex gap-2 justify-center">
                          <Button asChild size="sm">
                            <Link to={`/projects/${lastSpinResult.id}`}>
                              <ExternalLink className="w-4 h-4 mr-1" />
                              View Project
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" onClick={clearLastResult}>
                            Clear
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Helper Messages */}
                {!stats.hasProjects && !isLoadingProjects && (
                  <Alert className="mt-6 max-w-md">
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      You don't have any projects in progress. 
                      <Link to="/dashboard" className="text-primary hover:underline ml-1">
                        Start some projects
                      </Link> to use the randomizer!
                    </AlertDescription>
                  </Alert>
                )}

                {stats.hasProjects && !stats.hasSelection && (
                  <Alert className="mt-6 max-w-md">
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      Select some projects from the left panel to get started!
                    </AlertDescription>
                  </Alert>
                )}

                {stats.hasSelection && !stats.canSpin && (
                  <Alert className="mt-6 max-w-md">
                    <Lightbulb className="h-4 w-4" />
                    <AlertDescription>
                      Select at least 2 projects to make the randomizer interesting!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Spin History */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Spin History</CardTitle>
                <CardDescription>
                  Your recent randomizer results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SpinHistory
                  history={spinHistory}
                  isLoading={isLoadingHistory}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Tips */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            💡 Tip: Use the randomizer when you have multiple projects calling your attention 
            and need help deciding which one to focus on today!
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProjectRandomizer;