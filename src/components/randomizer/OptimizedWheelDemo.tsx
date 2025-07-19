/**
 * @fileoverview OptimizedWheel Demo Component
 *
 * Demonstration component showcasing the OptimizedWheel with different configurations
 * and sample data. Useful for testing and development.
 */

import React, { useState } from 'react';
import { OptimizedWheel } from './OptimizedWheel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Project } from '@/types/shared';

// Sample projects for demonstration
const sampleProjects: Project[] = [
  {
    id: '1',
    title: 'Sunset Landscape',
    company: 'Diamond Art Club',
    artist: 'Nature Artist',
    status: 'progress',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    user: 'demo-user',
  },
  {
    id: '2',
    title: 'Cute Kitten Portrait',
    company: 'Dreamer Designs',
    artist: 'Pet Artist',
    status: 'progress',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    user: 'demo-user',
  },
  {
    id: '3',
    title: 'Abstract Geometric Pattern',
    company: 'Modern Art Co',
    artist: 'Geometric Designer',
    status: 'progress',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    user: 'demo-user',
  },
  {
    id: '4',
    title: 'Vintage Floral Bouquet',
    company: 'Classic Crafts',
    artist: 'Floral Artist',
    status: 'progress',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    user: 'demo-user',
  },
  {
    id: '5',
    title: 'Ocean Waves at Sunset',
    company: 'Seascape Studios',
    artist: 'Ocean Artist',
    status: 'progress',
    created: '2024-01-01T00:00:00Z',
    updated: '2024-01-01T00:00:00Z',
    user: 'demo-user',
  },
];

/**
 * Demo component for the OptimizedWheel
 */
export const OptimizedWheelDemo: React.FC = () => {
  const [selectedProjects, setSelectedProjects] = useState<Project[]>(sampleProjects.slice(0, 3));
  const [lastResult, setLastResult] = useState<Project | null>(null);
  const [wheelSize, setWheelSize] = useState<'small' | 'medium' | 'large'>('medium');

  const handleSpinComplete = (project: Project) => {
    setLastResult(project);
    console.log('Selected project:', project);
  };

  const addProject = () => {
    const availableProjects = sampleProjects.filter(
      p => !selectedProjects.some(sp => sp.id === p.id)
    );
    if (availableProjects.length > 0) {
      setSelectedProjects([...selectedProjects, availableProjects[0]]);
    }
  };

  const removeProject = () => {
    if (selectedProjects.length > 0) {
      setSelectedProjects(selectedProjects.slice(0, -1));
    }
  };

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="text-center">
        <h1 className="mb-2 text-3xl font-bold">OptimizedWheel Demo</h1>
        <p className="text-muted-foreground">
          Demonstration of the CSS-based optimized randomizer wheel component
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Demo Controls</CardTitle>
          <CardDescription>
            Adjust the wheel configuration to test different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={addProject}
              disabled={selectedProjects.length >= sampleProjects.length}
            >
              Add Project ({selectedProjects.length}/{sampleProjects.length})
            </Button>
            <Button onClick={removeProject} disabled={selectedProjects.length === 0}>
              Remove Project
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={wheelSize === 'small' ? 'default' : 'outline'}
              onClick={() => setWheelSize('small')}
            >
              Small
            </Button>
            <Button
              variant={wheelSize === 'medium' ? 'default' : 'outline'}
              onClick={() => setWheelSize('medium')}
            >
              Medium
            </Button>
            <Button
              variant={wheelSize === 'large' ? 'default' : 'outline'}
              onClick={() => setWheelSize('large')}
            >
              Large
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Wheel Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Optimized Wheel</CardTitle>
          <CardDescription>
            {selectedProjects.length === 0
              ? 'Add some projects to see the wheel in action'
              : `Ready to spin with ${selectedProjects.length} project${selectedProjects.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <OptimizedWheel
            projects={selectedProjects}
            onSpinComplete={handleSpinComplete}
            size={wheelSize}
          />
        </CardContent>
      </Card>

      {/* Result Display */}
      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle>Last Spin Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-center">
              <h3 className="text-xl font-semibold">{lastResult.title}</h3>
              {(lastResult.company || lastResult.artist) && (
                <p className="text-muted-foreground">
                  by {[lastResult.company, lastResult.artist].filter(Boolean).join(' • ')}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Selected at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Project List */}
      <Card>
        <CardHeader>
          <CardTitle>Selected Projects</CardTitle>
          <CardDescription>Projects currently included in the wheel</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedProjects.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">
              No projects selected. Add some projects to get started!
            </p>
          ) : (
            <div className="grid gap-2">
              {selectedProjects.map((project, index) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between rounded border p-2"
                >
                  <div>
                    <span className="font-medium">
                      {index + 1}. {project.title}
                    </span>
                    {(project.company || project.artist) && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        by {[project.company, project.artist].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
