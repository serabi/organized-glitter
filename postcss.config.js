/**
 * PostCSS configuration for Organized Glitter
 * 
 * @description Configures PostCSS processing for the application.
 * Uses TailwindCSS for utility-first styling and Autoprefixer for vendor prefixes.
 * 
 * Note: May show benign "from option" warning with current TailwindCSS v3.4.14/Vite combination.
 * This warning is safe to ignore and doesn't affect functionality.
 * 
 * @see {@link https://tailwindcss.com/docs/installation/using-postcss} TailwindCSS PostCSS docs
 */
export default {
  plugins: {
    /** TailwindCSS utility-first CSS framework */
    tailwindcss: {},
    /** Autoprefixer for vendor prefix support */
    autoprefixer: {},
  },
};
