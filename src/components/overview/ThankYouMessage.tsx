import { ExternalLink } from 'lucide-react';

/**
 * Created 2025-05-26
 * Thank you message component for the Overview page
 */
export function ThankYouMessage() {
  return (
    <section className="rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 p-6 dark:border-pink-800 dark:from-pink-950/20 dark:to-purple-950/20">
      <div className="text-center">
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Thank You for Testing! ✨
        </h3>
        <p className="mb-4 text-gray-700 dark:text-gray-300">
          Thank you so much for testing out Organized Glitter! Please{' '}
          <a
            href="https://organizedglitter.featurebase.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-pink-600 underline decoration-2 underline-offset-2 transition-colors hover:text-pink-700 hover:decoration-pink-600 dark:text-pink-400 dark:hover:text-pink-300 dark:hover:decoration-pink-300"
          >
            visit our feedback page
            <ExternalLink className="h-3 w-3" />
          </a>{' '}
          to leave feedback and see my future plans for the site!
        </p>
      </div>
    </section>
  );
}
