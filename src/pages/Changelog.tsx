/**
 * Changelog page component displaying version history and release notes
 * @author @serabi
 * @created 2025-08-06
 */

import React from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Plus, Wrench, Bug, AlertTriangle } from 'lucide-react';
import changelogData from '@/data/changelog.json';
import type { ChangelogEntry, CategorySectionProps } from '@/types/changelog';

const CategorySection: React.FC<CategorySectionProps> = ({ title, items, icon }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center text-muted-foreground">{icon}</div>
        <h4 className="font-semibold text-foreground">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm leading-relaxed text-foreground/90">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

const ChangelogItem: React.FC<{ entry: ChangelogEntry }> = ({ entry }) => {
  return (
    <Card className="mb-8 border border-border/50 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-border/30 dark:bg-[#1a1a1a]">
      <CardHeader className="border-b border-border/30 pb-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="font-mono text-sm">
              {entry.displayDate}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <CategorySection
          title="New Features"
          items={entry.categories.newFeatures}
          icon={<Plus className="h-4 w-4" />}
        />
        <CategorySection
          title="Improvements"
          items={entry.categories.improvements}
          icon={<Wrench className="h-4 w-4" />}
        />
        <CategorySection
          title="Bug Fixes"
          items={entry.categories.bugFixes}
          icon={<Bug className="h-4 w-4" />}
        />
        <CategorySection
          title="Breaking Changes"
          items={entry.categories.breakingChanges}
          icon={<AlertTriangle className="h-4 w-4" />}
        />
      </CardContent>
    </Card>
  );
};

const Changelog: React.FC = () => {
  const sortedChangelog = changelogData.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <MainLayout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-3xl font-bold">What's New</h1>
          <p className="text-muted-foreground">
            See what's been added and improved in Organized Glitter!
          </p>
        </div>

        <div className="space-y-8">
          {sortedChangelog.map(entry => (
            <ChangelogItem key={entry.date} entry={entry} />
          ))}
        </div>

        <div className="mt-12 rounded-lg border border-border/50 bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Have feedback or feature requests? We'd love to hear from you!
          </p>
          <a
            href="mailto:contact@organizedglitter.app"
            className="mt-3 inline-block text-sm text-primary underline underline-offset-2 transition-colors hover:text-primary/80"
          >
            Contact us
          </a>
        </div>
      </div>
    </MainLayout>
  );
};

export default Changelog;
