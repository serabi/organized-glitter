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
          Thank You for Testing! ✨
        </h3>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          Thank you so much for testing out Organized Glitter! This web app is in active
          development. As always, please don't hesitate to{' '}
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
          about these changes!
        </p>
      </div>

      {/* Updates Section - Collapsible */}
      <div className="mt-6 border-t border-pink-200/50 pt-6 dark:border-pink-700/30">
        <Collapsible open={isUpdatesOpen} onOpenChange={setIsUpdatesOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 rounded-md p-2 transition-colors hover:bg-white/40 dark:hover:bg-gray-800/20">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Updates</h4>
              <span className="text-sm italic text-gray-500 dark:text-gray-400">
                (expand to read latest updates)
              </span>
            </div>
            <ChevronDown
              className={`h-4 w-4 text-gray-600 transition-transform dark:text-gray-400 ${
                isUpdatesOpen ? 'rotate-180' : ''
              }`}
            />
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4">
            <div className="space-y-4">
              {/* Latest Update */}
              <div className="rounded-lg border border-pink-100 bg-white/80 p-5 shadow-sm dark:border-pink-800/50 dark:bg-gray-800/50">
                <div className="space-y-4">
                  <div className="inline-flex items-center rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-800 dark:bg-pink-900/30 dark:text-pink-300">
                    2025-07-21
                  </div>
                  <div className="space-y-3 text-gray-700 dark:text-gray-300">
                    <p>
                      Major update to help make the code base cleaner. Visible changes:
                    </p>
                    <ul className="ml-4 list-disc space-y-1">
                      <li>Removed the Advanced Edit page for now</li>
                      <li>
                        Updated the{' '}
                        <Link
                          to="/dashboard"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Dashboard page
                          <ExternalLink className="h-3 w-3" />
                        </Link>{' '}
                        to be better formatted for various sized screens
                      </li>
                      <li>
                        Updated the{' '}
                        <Link
                          to="/randomizer"
                          className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
                        >
                          Randomizer page
                          <ExternalLink className="h-3 w-3" />
                        </Link>{' '}
                        to work better
                      </li>
                      <li>Updated a bug with the time zone settings - the dates should now work correctly!</li>
                    </ul>
                    <p>
                      As always, please reach out if you have any{' '}
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
                        feedback
                      </button>{' '}
                      or discover any bugs.
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
