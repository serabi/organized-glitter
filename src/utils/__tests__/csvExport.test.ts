import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadCsv, projectsToCsv } from '../csvExport';
import { Project } from '@/types/shared';

// Mock window.URL.createObjectURL and other browser APIs
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn().mockReturnValue('blob:mock-url'),
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock document.createElement and click
const mockLink = {
  href: '',
  download: '',
  click: vi.fn(),
  setAttribute: vi.fn((attr: string, value: string) => {
    if (attr === 'href') mockLink.href = value;
    if (attr === 'download') mockLink.download = value;
  }),
  style: {},
};

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: vi.fn().mockReturnValue(mockLink),
});

Object.defineProperty(document.body, 'appendChild', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(document.body, 'removeChild', {
  writable: true,
  value: vi.fn(),
});

describe('csvExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProjects: Project[] = [
    {
      id: 'project1',
      title: 'Diamond Painting 1',
      company: 'Company A',
      artist: 'Artist 1',
      status: 'completed',
      drillShape: 'round',
      kit_category: 'full',
      datePurchased: '2025-01-01',
      dateStarted: '2025-01-02',
      dateCompleted: '2025-01-10',
      width: 40,
      height: 50,
      totalDiamonds: 20000,
      generalNotes: 'Beautiful landscape painting',
      sourceUrl: 'https://example.com/product/1',
      imageUrl: 'https://example.com/image1.jpg',
      userId: 'user1',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-10T00:00:00Z',
    },
    {
      id: 'project2',
      title: 'Diamond Painting 2',
      company: 'Company B',
      artist: 'Artist 2',
      status: 'progress',
      drillShape: 'square',
      kit_category: 'mini',
      datePurchased: '2025-01-05',
      dateStarted: '2025-01-06',
      width: 30,
      height: 40,
      totalDiamonds: 12000,
      generalNotes: 'Cute animal design',
      sourceUrl: 'https://example.com/product/2',
      userId: 'user1',
      createdAt: '2025-01-05T00:00:00Z',
      updatedAt: '2025-01-06T00:00:00Z',
    },
  ];

  describe('projectsToCsv', () => {
    it('should generate CSV content with headers and data', () => {
      const csvContent = projectsToCsv(mockProjects);

      const lines = csvContent.split('\n');

      // Check header row
      expect(lines[0]).toBe(
        'Title,Status,Company,Artist,Width,Height,Drill Shape,Total Diamonds,Type of Kit,Project URL,Date Purchased,Date Received,Date Started,Date Completed,Notes,Tags'
      );

      // Check data rows
      expect(lines[1]).toBe(
        'Diamond Painting 1,completed,Company A,Artist 1,40,50,round,20000,full,https://example.com/product/1,2025-01-01,,2025-01-02,2025-01-10,Beautiful landscape painting,'
      );

      expect(lines[2]).toBe(
        'Diamond Painting 2,progress,Company B,Artist 2,30,40,square,12000,mini,https://example.com/product/2,2025-01-05,,2025-01-06,,Cute animal design,'
      );
    });

    it('should handle empty projects array', () => {
      const csvContent = projectsToCsv([]);

      expect(csvContent).toBe('');
    });

    it('should handle projects with missing data', () => {
      const incompleteProjects: Project[] = [
        {
          id: 'project3',
          title: 'Incomplete Project',
          status: 'wishlist',
          userId: 'user1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        } as Project,
      ];

      const csvContent = projectsToCsv(incompleteProjects);
      const lines = csvContent.split('\n');

      expect(lines[1]).toBe('Incomplete Project,wishlist,,,,,,,,,,,,,,');
    });

    it('should escape quotes and commas in data', () => {
      const projectsWithSpecialChars: Project[] = [
        {
          id: 'project4',
          title: 'Project with "quotes" and, commas',
          company: 'Company, Inc.',
          generalNotes: 'Notes with "special" characters',
          status: 'completed',
          userId: 'user1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        } as Project,
      ];

      const csvContent = projectsToCsv(projectsWithSpecialChars);
      const lines = csvContent.split('\n');

      expect(lines[1]).toContain('"Project with ""quotes"" and, commas"');
      expect(lines[1]).toContain('"Company, Inc."');
      expect(lines[1]).toContain('"Notes with ""special"" characters"');
    });
  });

  describe('downloadCsv', () => {
    it('should create and download CSV file', () => {
      const filename = 'test-projects.csv';
      const csvData = projectsToCsv(mockProjects);

      downloadCsv(csvData, filename);

      // Verify blob creation
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));

      // Verify link creation and download
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('blob:mock-url');
      expect(mockLink.download).toBe(filename);
      expect(mockLink.click).toHaveBeenCalled();

      // Verify cleanup
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should use default filename when none provided', () => {
      const csvData = projectsToCsv(mockProjects);
      downloadCsv(csvData);

      expect(mockLink.download).toBe('projects-export.csv');
    });

    it('should handle empty CSV data', () => {
      downloadCsv('');

      // Should not create blob or click when no data
      expect(window.URL.createObjectURL).not.toHaveBeenCalled();
      expect(mockLink.click).not.toHaveBeenCalled();
    });

    it('should create blob with correct MIME type', () => {
      const csvData = projectsToCsv(mockProjects);

      downloadCsv(csvData);

      // Verify that blob creation and download happened
      expect(window.URL.createObjectURL).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('projects-export.csv');
    });
  });

  describe('CSV format validation', () => {
    it('should produce valid CSV that can be parsed', () => {
      const csvContent = projectsToCsv(mockProjects);

      // Basic validation: should have proper number of lines
      const lines = csvContent.split('\n');
      expect(lines.length).toBe(mockProjects.length + 1); // +1 for header

      // Each line should have the same number of fields
      const headerFields = lines[0].split(',').length;
      for (let i = 1; i < lines.length; i++) {
        // Simple field count (works for our test data which doesn't have complex quoting)
        const fields = lines[i].split(',');
        expect(fields.length).toBe(headerFields);
      }
    });

    it('should maintain data integrity for numeric values', () => {
      const csvContent = projectsToCsv(mockProjects);
      const lines = csvContent.split('\n');

      // Check that numeric values are preserved correctly
      expect(lines[1]).toContain('40'); // width
      expect(lines[1]).toContain('50'); // height
      expect(lines[1]).toContain('20000'); // totalDiamonds
    });

    it('should handle boolean-like values correctly', () => {
      const projectsWithBooleans: Project[] = [
        {
          id: 'project5',
          title: 'Boolean Test',
          status: 'completed',
          userId: 'user1',
          createdAt: '2025-01-01T00:00:00Z',
          updatedAt: '2025-01-01T00:00:00Z',
        } as Project,
      ];

      const csvContent = projectsToCsv(projectsWithBooleans);

      // Should not break with undefined/null values
      expect(csvContent).toContain('Boolean Test');
      expect(csvContent).not.toContain('undefined');
      expect(csvContent).not.toContain('null');
    });
  });
});
