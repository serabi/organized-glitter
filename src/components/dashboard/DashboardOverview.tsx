/**
 * Dashboard Overview Component - Key Metrics Display
 *
 * Displays prominent metric cards showing key project statistics at the top of the dashboard.
 * Replaces the tab-based filtering approach with a cleaner overview design while maintaining
 * the same functionality and data sources.
 *
 * Key Features:
 * - Responsive grid layout (2x2 on mobile, horizontal on desktop)
 * - Color-coded status indicators matching existing design system
 * - Loading states with spinner integration from StatsContext
 * - Clickable cards for filtering (when enabled)
 * - Glassmorphism design consistent with existing components
 *
 * Data Flow:
 * - Uses focused StatsContext for consistent loading states and counts
 * - Integrates with FilterProvider for potential filtering functionality
 * - Maintains existing mobile-optimized loading patterns
 *
 * @author @serabi
 * @created 2025-08-01
 */

import React from 'react';
import StatusCarousel from './StatusCarousel';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DashboardOverview');

/**
 * Dashboard Overview Component - added Status Carousel on 2025-08-01
 *
 * Displays all project statuses in a responsive carousel format,
 * replacing the previous tabs
 */
const DashboardOverview: React.FC = () => {
  React.useEffect(() => {
    logger.debug('Dashboard overview loaded with StatusCarousel');
  }, []);

  return (
    <div className="mb-8">
      <StatusCarousel />
    </div>
  );
};

export default React.memo(DashboardOverview);
