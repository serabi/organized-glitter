import { ExternalLink, Calendar, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { showUserReportDialog } from '@/components/FeedbackDialogStore';

/**
 * Created 2025-05-26
 * Thank you message component for the Overview page with collapsible updates section
 * @author @serabi
 */
export function ThankYouMessage() {
  const [isUpdatesOpen, setIsUpdatesOpen] = useState(false);
  return (
    <section className="rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 p-6 dark:border-pink-800 dark:from-pink-950/20 dark:to-purple-950/20">
      <div className="text-center">
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Thank you for using Organized Glitter! ✨
        </h3>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          This web app is in active development. As always, please don't hesitate to{' '}
          <button
            onClick={() =>
              showUserReportDialog({
                title: 'Share Your Feedback',
                subtitle:
                  "We'd love to hear your thoughts about these updates and Organized Glitter!",
                currentPage: 'Overview - Updates Section',
              })
            }
            className="font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
          >
            share feedback
          </button>{' '}
          about the site and its features. Your feedback helps me continue to improve this app! 
        </p>
      </div>

      {/* Updates Section - Collapsible */}
      <div className="mt-6 border-t border-pink-200/50 pt-6 dark:border-pink-700/30">
        <Collapsible open={isUpdatesOpen} onOpenChange={setIsUpdatesOpen}>
          <CollapsibleTrigger
            className="flex w-full items-center justify-between gap-2 rounded-md p-2 transition-colors hover:bg-white/40 dark:hover:bg-gray-800/20"
            aria-expanded={isUpdatesOpen}
            aria-controls="updates-content"
            aria-label={`${isUpdatesOpen ? 'Collapse' : 'Expand'} updates section`}
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" aria-hidden="true" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Latest Updates</h4>
              <span className="text-sm italic text-gray-500 dark:text-gray-400" aria-hidden="true">
                (expand to read)
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 transition-transform dark:text-gray-400 ${
                isUpdatesOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </CollapsibleTrigger>

          <CollapsibleContent
            className="mt-4"
            id="updates-content"
            role="region"
            aria-label="Recent updates and changes"
          >
            <div className="space-y-4">
              {/* Latest Update */}
              <div className="rounded-lg border border-pink-100 bg-white/80 p-5 shadow-sm dark:border-pink-800/50 dark:bg-gray-800/50">
                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                    2025-08-01
                  </div>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p>Dashboard and project management improvements:</p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>
                        <strong> New dashboard navigation</strong> - The dashboard now features a new carousel navigation system that allows you to easily switch between different views while also providing "at a glance" statistics.
                      </li>
                      <li>
                        <strong>New "On Hold" project status</strong> - You can now mark projects as
                        "On Hold" for better organization of temporarily paused projects
                      </li>
                      <li>
                        <strong>Enhanced project filtering</strong> - The{' '}
                        <Link
                          to="/dashboard"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Dashboard
                          <ExternalLink className="h-3 w-3" />
                        </Link>{' '}
                        now includes a dedicated filter for "On Hold" projects, making it easier to
                        manage and track paused work
                      </li>
                      <li>
                        <strong>Fixed dashboard stats counts</strong> - Corrected a bug where
                        project counts in the dashboard overview cards were showing incorrect
                        totals. The "Total Projects" count now properly includes only active
                        projects (purchased, in stash, in progress, and on hold).
                      </li>
                      <li>
                        <strong>Fixed CSV import</strong> - Fixed a bug where tags were duplicated
                        when imported via CSV.
                      </li>
                      <li>
                        <strong>Redesigned project cards</strong> - Both Dashboard and{' '}
                        <Link
                          to="/overview"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Overview
                          <ExternalLink className="h-3 w-3" />
                        </Link>{' '}
                        project cards have been updated with a more compact, grid-friendly layout
                        that lets you see more projects at a glance
                      </li>
                    </ul>
                    <p>
                      These updates focus on improving project organization and visual clarity.
                      Please{' '}
                      <button
                        onClick={() =>
                          showUserReportDialog({
                            title: 'Share Your Feedback',
                            subtitle:
                              "How are the new 'On Hold' status and redesigned project cards working for you?",
                            currentPage: 'Overview - Updates Section',
                          })
                        }
                        className="font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                      >
                        let us know
                      </button>{' '}
                      how these improvements work for your workflow!
                    </p>
                  </div>
                </div>
              </div>

              {/* Previous Update */}
              <div className="rounded-lg border border-pink-100 bg-white/80 p-5 shadow-sm dark:border-pink-800/50 dark:bg-gray-800/50">
                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                    2025-07-29
                  </div>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p>Mobile experience improvements:</p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>
                        Added a bottom navigation bar for tablet and phone screens to make it easier
                        to navigate between{' '}
                        <Link
                          to="/overview"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Overview
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        ,{' '}
                        <Link
                          to="/dashboard"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Dashboard
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        ,{' '}
                        <Link
                          to="/randomizer"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Randomizer
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        , and{' '}
                        <Link
                          to="/profile"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Profile
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </li>
                      <li>
                        The bottom navigation automatically appears on mobile and tablet devices for
                        easier thumb navigation
                      </li>
                      <li>Desktop users will continue to use the top navigation menu as before</li>
                    </ul>
                    <p>
                      This update makes the app more mobile-friendly! Please{' '}
                      <button
                        onClick={() =>
                          showUserReportDialog({
                            title: 'Share Your Feedback',
                            subtitle:
                              "We'd love to hear your thoughts about the new bottom navigation and mobile experience!",
                            currentPage: 'Overview - Updates Section',
                          })
                        }
                        className="font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                      >
                        let us know
                      </button>{' '}
                      how the new mobile navigation works for you.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </section>
  );
}
