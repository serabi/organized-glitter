import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { PlusCircle, Building, Users, Tags, Home } from 'lucide-react';

interface AdvancedEditHeaderProps {
  onNavigateToNewProject: () => void;
  onNavigateToCompanies: () => void;
  onNavigateToArtists: () => void;
  onNavigateToTags: () => void;
}

/**
 * Header component for the Advanced Edit page
 * Contains breadcrumb navigation and action buttons
 */
export const AdvancedEditHeader: React.FC<AdvancedEditHeaderProps> = ({
  onNavigateToNewProject,
  onNavigateToCompanies,
  onNavigateToArtists,
  onNavigateToTags,
}) => {
  return (
    <>
      {/* Breadcrumb Navigation */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center">
                <Home className="mr-1 h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Advanced Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-col space-y-2 md:flex-row md:space-x-2 md:space-y-0">
          <Button variant="outline" size="sm" onClick={onNavigateToNewProject}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateToCompanies}>
            <Building className="mr-2 h-4 w-4" />
            Companies
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateToArtists}>
            <Users className="mr-2 h-4 w-4" />
            Artists
          </Button>
          <Button variant="outline" size="sm" onClick={onNavigateToTags}>
            <Tags className="mr-2 h-4 w-4" />
            Tags
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Advanced Project Editor</h1>
        <p className="text-muted-foreground">
          Edit multiple projects at once with advanced filtering and bulk operations
        </p>
      </div>
    </>
  );
};
