// Update theme color meta tag based on current theme
function updateThemeColor() {
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) return;

  // Check if dark mode is active - default to dark unless light is explicitly set
  const isLight =
    document.documentElement.classList.contains('light') ||
    document.documentElement.getAttribute('data-theme') === 'light';

  // Set theme color based on current theme
  themeColorMeta.setAttribute('content', isLight ? '#faf7fe' : '#1a1a1a');
}

// Run on initial load
document.addEventListener('DOMContentLoaded', () => {
  // Force dark mode as default if no theme is set
  if (
    !document.documentElement.classList.contains('light') &&
    !document.documentElement.classList.contains('dark') &&
    !document.documentElement.getAttribute('data-theme')
  ) {
    document.documentElement.classList.add('dark');
  }

  // Initial update
  updateThemeColor();

  // Watch for theme changes from next-themes
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.attributeName === 'class' || mutation.attributeName === 'data-theme') {
        updateThemeColor();
      }
    });
  });

  // Start observing the document with the configured parameters
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });

  // Also observe the body in case the theme class is applied there
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'data-theme'],
  });
});

// Watch for system theme changes
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', updateThemeColor);
}
