import React, { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { Legend } from 'recharts';
import type {
  ChartContainerProps,
  ChartTooltipProps,
  ChartTooltipContentProps,
  ChartLegendProps,
  ChartLegendContentProps,
} from './chart-types';

// Lazy load the heavy chart components
const LazyChartContainer = lazy(() =>
  import('./chart').then(module => ({
    default: module.ChartContainer,
  }))
);

const LazyChartTooltip = lazy(() =>
  import('./chart').then(module => ({
    default: module.ChartTooltip,
  }))
);

const LazyChartTooltipContent = lazy(() =>
  import('./chart').then(module => ({
    default: module.ChartTooltipContent,
  }))
);

const LazyChartLegend = lazy(() =>
  import('./chart').then(module => ({
    default: module.ChartLegend,
  }))
);

const LazyChartLegendContent = lazy(() =>
  import('./chart').then(module => ({
    default: module.ChartLegendContent,
  }))
);

// Chart loading fallback
const ChartLoading = () => (
  <div className="flex h-[200px] w-full items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
  </div>
);

// Lazy loaded chart components with loading fallbacks and proper typing
export const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  (props, ref) => (
    <Suspense fallback={<ChartLoading />}>
      <LazyChartContainer {...props} ref={ref} />
    </Suspense>
  )
);
ChartContainer.displayName = 'ChartContainer';

export const ChartTooltip = (props: ChartTooltipProps) => (
  <Suspense fallback={null}>
    <LazyChartTooltip {...props} />
  </Suspense>
);

export const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
  (props, ref) => (
    <Suspense fallback={null}>
      <LazyChartTooltipContent {...props} ref={ref} />
    </Suspense>
  )
);
ChartTooltipContent.displayName = 'ChartTooltipContent';

export const ChartLegend = React.forwardRef<Legend, ChartLegendProps>((props, ref) => (
  <Suspense fallback={null}>
    <LazyChartLegend {...props} ref={ref} />
  </Suspense>
));
ChartLegend.displayName = 'ChartLegend';

export const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
  (props, ref) => (
    <Suspense fallback={null}>
      <LazyChartLegendContent {...props} ref={ref} />
    </Suspense>
  )
);
ChartLegendContent.displayName = 'ChartLegendContent';

// Re-export the ChartStyle since it's lightweight
export { ChartStyle } from './chart';
export type { ChartConfig } from './chart-types';
