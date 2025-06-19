/**
 * Tag Color Configuration for Organized Glitter
 *
 * This file contains the 12-color palette for consistent tag colors
 * throughout the application, as specified in the project requirements.
 */

export interface TagColor {
  name: string;
  hex: string;
  classes: {
    light: string;
    dark: string;
  };
  textClasses: {
    light: string;
    dark: string;
  };
}

/**
 * 12 distinct, accessible colors for automatic assignment
 */
export const TAG_COLOR_PALETTE: TagColor[] = [
  {
    name: 'Blue',
    hex: '#3B82F6',
    classes: {
      light: 'bg-blue-100 text-blue-800',
      dark: 'dark:bg-blue-900/30 dark:text-blue-300',
    },
    textClasses: {
      light: 'text-blue-600',
      dark: 'dark:text-blue-400',
    },
  },
  {
    name: 'Red',
    hex: '#EF4444',
    classes: {
      light: 'bg-red-100 text-red-800',
      dark: 'dark:bg-red-900/30 dark:text-red-300',
    },
    textClasses: {
      light: 'text-red-600',
      dark: 'dark:text-red-400',
    },
  },
  {
    name: 'Green',
    hex: '#10B981',
    classes: {
      light: 'bg-emerald-100 text-emerald-800',
      dark: 'dark:bg-emerald-900/30 dark:text-emerald-300',
    },
    textClasses: {
      light: 'text-emerald-600',
      dark: 'dark:text-emerald-400',
    },
  },
  {
    name: 'Amber',
    hex: '#F59E0B',
    classes: {
      light: 'bg-amber-100 text-amber-800',
      dark: 'dark:bg-amber-900/30 dark:text-amber-300',
    },
    textClasses: {
      light: 'text-amber-600',
      dark: 'dark:text-amber-400',
    },
  },
  {
    name: 'Purple',
    hex: '#8B5CF6',
    classes: {
      light: 'bg-purple-100 text-purple-800',
      dark: 'dark:bg-purple-900/30 dark:text-purple-300',
    },
    textClasses: {
      light: 'text-purple-600',
      dark: 'dark:text-purple-400',
    },
  },
  {
    name: 'Pink',
    hex: '#EC4899',
    classes: {
      light: 'bg-pink-100 text-pink-800',
      dark: 'dark:bg-pink-900/30 dark:text-pink-300',
    },
    textClasses: {
      light: 'text-pink-600',
      dark: 'dark:text-pink-400',
    },
  },
  {
    name: 'Gray',
    hex: '#6B7280',
    classes: {
      light: 'bg-gray-500 text-white',
      dark: 'dark:bg-gray-700 dark:text-gray-200',
    },
    textClasses: {
      light: 'text-gray-600',
      dark: 'dark:text-gray-400',
    },
  },
  {
    name: 'Teal',
    hex: '#14B8A6',
    classes: {
      light: 'bg-teal-100 text-teal-800',
      dark: 'dark:bg-teal-900/30 dark:text-teal-300',
    },
    textClasses: {
      light: 'text-teal-600',
      dark: 'dark:text-teal-400',
    },
  },
  {
    name: 'Orange',
    hex: '#F97316',
    classes: {
      light: 'bg-orange-100 text-orange-800',
      dark: 'dark:bg-orange-900/30 dark:text-orange-300',
    },
    textClasses: {
      light: 'text-orange-600',
      dark: 'dark:text-orange-400',
    },
  },
  {
    name: 'Lime',
    hex: '#84CC16',
    classes: {
      light: 'bg-lime-100 text-lime-800',
      dark: 'dark:bg-lime-900/30 dark:text-lime-300',
    },
    textClasses: {
      light: 'text-lime-600',
      dark: 'dark:text-lime-400',
    },
  },
  {
    name: 'Indigo',
    hex: '#6366F1',
    classes: {
      light: 'bg-indigo-100 text-indigo-800',
      dark: 'dark:bg-indigo-900/30 dark:text-indigo-300',
    },
    textClasses: {
      light: 'text-indigo-600',
      dark: 'dark:text-indigo-400',
    },
  },
  {
    name: 'Rose',
    hex: '#F43F5E',
    classes: {
      light: 'bg-rose-100 text-rose-800',
      dark: 'dark:bg-rose-900/30 dark:text-rose-300',
    },
    textClasses: {
      light: 'text-rose-600',
      dark: 'dark:text-rose-400',
    },
  },
];

/**
 * Get tag color by index (for automatic assignment)
 */
export const getTagColorByIndex = (index: number): TagColor => {
  return TAG_COLOR_PALETTE[index % TAG_COLOR_PALETTE.length];
};

/**
 * Get tag color by name
 */
export const getTagColorByName = (name: string): TagColor | undefined => {
  return TAG_COLOR_PALETTE.find(color => color.name.toLowerCase() === name.toLowerCase());
};

/**
 * Get combined CSS classes for a tag color
 */
export const getTagColorClasses = (color: TagColor): string => {
  return `${color.classes.light} ${color.classes.dark}`;
};

/**
 * Get combined text CSS classes for a tag color
 */
export const getTagTextColorClasses = (color: TagColor): string => {
  return `${color.textClasses.light} ${color.textClasses.dark}`;
};

/**
 * Project status to color mapping (using the palette)
 */
export const PROJECT_STATUS_COLORS = {
  wishlist: TAG_COLOR_PALETTE[0], // Blue
  purchased: TAG_COLOR_PALETTE[4], // Purple
  stash: TAG_COLOR_PALETTE[3], // Amber
  progress: TAG_COLOR_PALETTE[2], // Green
  completed: TAG_COLOR_PALETTE[10], // Indigo
  destashed: TAG_COLOR_PALETTE[11], // Rose
  archived: TAG_COLOR_PALETTE[6], // Gray
};
