import { Link } from 'react-router-dom';
import { showUserReportDialog } from '@/components/FeedbackDialogStore';

/**
 * Created 2025-05-26
 * Thank you message component for the Overview page
 * @author @serabi
 */
export function ThankYouMessage() {
  return (
    <section className="rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-purple-50 p-6 dark:border-pink-800 dark:from-pink-950/20 dark:to-purple-950/20">
      <div className="text-center">
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
          Thank you for using Organized Glitter! ✨
        </h3>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          This web app is in active development. Check out the{' '}
          <Link
            to="/changelog"
            className="font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
          >
            Changelog
          </Link>{' '}
          for our most recent updates, and please don't hesitate to{' '}
          <button
            onClick={() =>
              showUserReportDialog({
                title: 'Share Your Feedback',
                subtitle: "We'd love to hear your thoughts about Organized Glitter!",
                currentPage: 'Overview - Thank You Section',
              })
            }
            className="font-medium text-pink-600 underline decoration-pink-300 transition-colors hover:text-pink-700 hover:decoration-pink-500 dark:text-pink-400 dark:hover:text-pink-300"
          >
            leave any feedback
          </button>{' '}
          you have!
        </p>
      </div>
    </section>
  );
}
