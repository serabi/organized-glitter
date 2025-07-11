import { Project } from '@/types/project';

// Define DashboardValidSortField here as it's closely tied to the constants
export type DashboardValidSortField =
  | 'last_updated'
  | 'date_purchased'
  | 'date_finished'
  | 'date_started'
  | 'date_received'
  | 'kit_name'
  | 'company'
  | 'artist'
  | 'status'
  | 'width'
  | 'height'
  | 'kit_category'
  | 'drill_shape';

export const DATE_SORT_FIELDS: DashboardValidSortField[] = [
  'date_purchased',
  'date_finished',
  'date_started',
  'date_received',
];

export const SORT_FIELD_TO_PROJECT_KEY: Partial<Record<DashboardValidSortField, keyof Project>> = {
  date_purchased: 'datePurchased',
  date_finished: 'dateCompleted',
  date_started: 'dateStarted',
  date_received: 'dateReceived',
  // kit_name is handled directly as 'title' in the context, so not needed here for project key mapping
  // last_updated is handled directly as 'updatedAt'
};

export const SORT_FIELD_TO_FRIENDLY_NAME: Partial<Record<DashboardValidSortField, string>> = {
  date_purchased: 'Purchase Date',
  date_finished: 'Finished Date',
  date_started: 'Start Date',
  date_received: 'Received Date',
  last_updated: 'Last Updated',
  kit_name: 'Kit Name',
  company: 'Company',
  artist: 'Artist',
  status: 'Status',
  width: 'Width',
  height: 'Height',
  kit_category: 'Type',
  drill_shape: 'Shape',
};
