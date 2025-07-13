import React from 'react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

/**
 * Header component for the Advanced Edit page
 * Contains breadcrumb navigation
 */
export const AdvancedEditHeader: React.FC = () => {
  return (
    <>
      {/* Breadcrumb Navigation */}
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

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Advanced Project Editor</h1>
        <p className="text-muted-foreground">
          Browse and view your projects with advanced filtering and sorting
        </p>
      </div>
    </>
  );
};
