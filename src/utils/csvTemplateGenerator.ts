// src/utils/csvTemplateGenerator.ts

// Defines the order and names of columns for the CSV template.
const headers = [
  'Title', // 0
  'Company', // 1
  'Artist', // 2
  'Width', // 3
  'Height', // 4
  'Source URL', // 5
  'Drill Shape', // 6
  'Total Diamonds', // 7
  'Type of Kit', // 8
  'Status', // 9
  'Date Purchased', // 10
  'Date Received', // 11
  'Date Started', // 12
  'Date Completed', // 13
  'General Notes', // 14
  'Tags', // 15
];

// Sample data rows to demonstrate the CSV format and expected data.
const sampleRow1 = [
  'Enchanted Forest',
  'Diamond Art Club',
  'Fancy Nancy',
  '50',
  '70',
  'https://example.com/enchanted-forest',
  'round',
  '55000',
  'full',
  'progress',
  '2023-01-15',
  '2023-01-20',
  '2023-02-01',
  '',
  'Beautiful kit with vibrant colors.',
  'fantasy; nature',
];
const sampleRow2 = [
  'Cosmic Dreams',
  'Dreamer Designs',
  'Jessica James',
  '60',
  '80',
  'https://example.com/cosmic-dreams',
  'square',
  '64000',
  'mini',
  'stash',
  '2023-03-10',
  '2023-03-15',
  '',
  '',
  'Looking forward to starting this one.',
  'space; dreams; abstract',
];
const sampleRow3 = [
  'Starry Night',
  'PaintGem',
  'Van Gogh',
  '40',
  '50',
  'https://example.com/starry-night',
  'round',
  '32000',
  'full',
  'completed',
  '2022-11-01',
  '2022-11-05',
  '2022-11-10',
  '2022-12-15',
  'Classic artwork, enjoyed the process.',
  'classic; Van Gogh',
];
const sampleRow4 = [
  'Mountain Sunset',
  'Diamond Dotz',
  'Nature Artist',
  '35',
  '45',
  'https://example.com/mountain-sunset',
  'square',
  '48000',
  'full',
  'onhold',
  '2024-01-20',
  '2024-01-25',
  '2024-02-10',
  '',
  'Paused temporarily due to moving house.',
  'landscape; mountains; sunset',
];

/**
 * Generates the CSV template string with headers and sample data.
 * @returns {string} The CSV template as a string.
 */
export const generateCSVTemplate = (): string => {
  // Ensure headers are used as the first row.
  // Subsequent rows are sample data, matching the header order.
  const rows = [headers, sampleRow1, sampleRow2, sampleRow3, sampleRow4];

  // Converts each row array into a CSV formatted string.
  // Cells are wrapped in double quotes, and internal double quotes are escaped.
  return rows
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
};

/**
 * Triggers the download of the generated CSV template file.
 */
export const downloadCSVTemplate = (): void => {
  const csvContent = generateCSVTemplate();
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  // Standard way to trigger file download.
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'diamond_painting_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
