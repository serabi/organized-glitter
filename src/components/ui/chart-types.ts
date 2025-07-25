/**
 * Central type definitions for chart components to avoid duplication
 * Contains all Legend-related and other chart typings used across chart modules
 * @author @serabi
 * @created 2025-07-25
 */

import type { ComponentProps } from 'react';
import type { Tooltip, LegendProps } from 'recharts';
import * as RechartsPrimitive from 'recharts';

// Core value and name types for chart data
export type ValueType = string | number;
export type NameType = string | number;

/**
 * Legend payload interface - centralized to avoid duplication
 * Used by both chart.tsx and chart-lazy.tsx
 */
export interface LegendPayload {
  value: string | number;
  type?: string;
  color?: string;
  dataKey?: string | number;
  [key: string]: unknown;
}

/**
 * Generic payload interface for chart data points
 */
export interface Payload<TValueType = ValueType, TNameType = NameType> {
  value: TValueType;
  name: TNameType;
  dataKey?: string | number;
  payload: Record<string, unknown>;
  color?: string;
  [key: string]: unknown;
}

/**
 * Chart configuration type
 * Note: Theme keys should match THEMES constant from chart.tsx
 */
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<'light' | 'dark', string> }
  );
};

// Chart component prop types
export type ChartContainerProps = React.ComponentProps<'div'> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children'];
};

export type ChartTooltipProps = ComponentProps<typeof Tooltip>;

export type ChartTooltipContentProps = React.ComponentProps<typeof Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: 'line' | 'dot' | 'dashed';
    nameKey?: string;
    labelKey?: string;
    payload?: ReadonlyArray<Payload<ValueType, NameType>>;
    label?: unknown;
    active?: boolean;
  };

export type ChartLegendProps = LegendProps;

export type ChartLegendContentProps = React.ComponentProps<'div'> & {
  payload?: ReadonlyArray<LegendPayload>;
  verticalAlign?: 'top' | 'middle' | 'bottom';
  hideIcon?: boolean;
  nameKey?: string;
};

/**
 * Chart context props type
 */
export type ChartContextProps = {
  config: ChartConfig;
};