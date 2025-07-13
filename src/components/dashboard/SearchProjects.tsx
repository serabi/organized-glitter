/**
 * Simplified search component using context debouncing
 * @author @serabi
 * @created 2025-07-09
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface SearchProjectsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
  isPending?: boolean; // Show loading state during deferred search
}

const SearchProjects = ({
  searchTerm,
  onSearchChange,
  inputRef,
  isPending,
}: SearchProjectsProps) => {
  return (
    <div className="relative">
      <label htmlFor="project-search" className="sr-only">
        Search projects
      </label>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <Input
        id="project-search"
        type="text"
        placeholder="Search projects..."
        value={searchTerm}
        onChange={e => onSearchChange(e.target.value)}
        className="w-full pl-10 pr-10"
        aria-describedby="search-help"
        ref={inputRef}
      />
      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        </div>
      )}
      <div id="search-help" className="sr-only">
        Search by project title, company, or artist name
      </div>
    </div>
  );
};

export default React.memo(SearchProjects);
