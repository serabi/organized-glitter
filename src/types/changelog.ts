/**
 * TypeScript interfaces for changelog data structures
 * @author @serabi
 * @created 2025-08-06
 */

import type { ReactNode } from 'react';

export interface ChangelogCategories {
  newFeatures?: string[];
  improvements?: string[];
  bugFixes?: string[];
  breakingChanges?: string[];
}

export interface ChangelogEntry {
  date: string;
  displayDate: string;
  categories: ChangelogCategories;
}

export type ChangelogData = ChangelogEntry[];

export interface ChangelogItemProps {
  entry: ChangelogEntry;
}

export interface CategorySectionProps {
  title: string;
  items: string[];
  icon: ReactNode;
}
