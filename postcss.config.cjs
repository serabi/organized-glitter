/**
 * PostCSS configuration for Organized Glitter
 *
 * @description Configures PostCSS processing for the application.
 * Uses TailwindCSS for utility-first styling and Autoprefixer for vendor prefixes.
 *
 * @see {@link https://tailwindcss.com/docs/installation/using-postcss} TailwindCSS PostCSS docs
 */
module.exports = {
  plugins: [require('tailwindcss'), require('autoprefixer')],
};
