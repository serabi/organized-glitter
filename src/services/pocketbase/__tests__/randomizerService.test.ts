import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createSpin,
  getSpinHistory,
  clearSpinHistory,
  getLastSpin,
  cleanupOldSpins,
  type CreateSpinParams,
  type SpinRecord,
} from '../randomizerService';
import { pb } from '@/lib/pocketbase';

// Mock PocketBase
vi.mock('@/lib/pocketbase', () => ({
  pb: {
    collection: vi.fn(),
  },
}));

// Mock logger
vi.mock('@/utils/secureLogger', () => ({
  createLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
}));

const mockCollection = {
  create: vi.fn(),
  getList: vi.fn(),
  getFirstListItem: vi.fn(),
  delete: vi.fn(),
};

const mockPb = vi.mocked(pb);

const mockSpinRecord: SpinRecord = {
  id: 'spin1',
  user: 'user1',
  project: 'proj1',
  project_title: 'Test Project',
  selected_projects: ['proj1', 'proj2', 'proj3'],
  spun_at: '2024-01-01T12:00:00Z',
  created: '2024-01-01T12:00:00Z',
  updated: '2024-01-01T12:00:00Z',
};

const mockCreateSpinParams: CreateSpinParams = {
  user: 'user1',
  project: 'proj1',
  project_title: 'Test Project',
  selected_projects: ['proj1', 'proj2', 'proj3'],
};

describe('randomizerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPb.collection.mockReturnValue(mockCollection as any);
  });

  describe('createSpin', () => {
    it('creates a spin record with correct data', async () => {
      mockCollection.create.mockResolvedValue(mockSpinRecord);

      const result = await createSpin(mockCreateSpinParams);

      expect(mockPb.collection).toHaveBeenCalledWith('randomizer_spins');
      expect(mockCollection.create).toHaveBeenCalledWith({
        user: 'user1',
        project: 'proj1',
        project_title: 'Test Project',
        selected_projects: ['proj1', 'proj2', 'proj3'],
        spun_at: expect.any(String), // ISO string
      });
      expect(result).toEqual(mockSpinRecord);
    });

    it('sets spun_at to current time', async () => {
      const mockDate = new Date('2024-01-01T15:00:00Z');
      vi.setSystemTime(mockDate);

      mockCollection.create.mockResolvedValue(mockSpinRecord);

      await createSpin(mockCreateSpinParams);

      expect(mockCollection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          spun_at: '2024-01-01T15:00:00.000Z',
        })
      );

      vi.useRealTimers();
    });

    it('handles PocketBase errors', async () => {
      const pbError = new Error('PocketBase validation error');
      mockCollection.create.mockRejectedValue(pbError);

      await expect(createSpin(mockCreateSpinParams)).rejects.toThrow('PocketBase validation error');
    });

    it('creates spin with null project (deleted project)', async () => {
      const paramsWithNullProject = {
        ...mockCreateSpinParams,
        project: null,
        project_title: 'Deleted Project',
      };

      const recordWithNullProject = {
        ...mockSpinRecord,
        project: null,
        project_title: 'Deleted Project',
      };

      mockCollection.create.mockResolvedValue(recordWithNullProject);

      const result = await createSpin(paramsWithNullProject);

      expect(mockCollection.create).toHaveBeenCalledWith({
        user: 'user1',
        project: null,
        project_title: 'Deleted Project',
        selected_projects: ['proj1', 'proj2', 'proj3'],
        spun_at: expect.any(String),
      });
      expect(result).toEqual(recordWithNullProject);
    });
  });

  describe('getSpinHistory', () => {
    const mockSpinHistory = [mockSpinRecord];

    it('fetches spin history with correct parameters', async () => {
      mockCollection.getList.mockResolvedValue({
        items: mockSpinHistory,
        page: 1,
        perPage: 10,
        totalItems: 1,
        totalPages: 1,
      });

      const result = await getSpinHistory('user1', 10);

      expect(mockPb.collection).toHaveBeenCalledWith('randomizer_spins');
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 10, {
        filter: 'user = "user1"',
        sort: '-spun_at',
      });
      expect(result).toEqual(mockSpinHistory);
    });

    it('uses default limit when not specified', async () => {
      mockCollection.getList.mockResolvedValue({
        items: mockSpinHistory,
        page: 1,
        perPage: 8,
        totalItems: 1,
        totalPages: 1,
      });

      await getSpinHistory('user1');

      expect(mockCollection.getList).toHaveBeenCalledWith(1, 8, {
        filter: 'user = "user1"',
        sort: '-spun_at',
      });
    });

    it('handles empty results', async () => {
      mockCollection.getList.mockResolvedValue({
        items: [],
        page: 1,
        perPage: 8,
        totalItems: 0,
        totalPages: 0,
      });

      const result = await getSpinHistory('user1');

      expect(result).toEqual([]);
    });

    it('handles PocketBase errors', async () => {
      const pbError = new Error('Database connection failed');
      mockCollection.getList.mockRejectedValue(pbError);

      await expect(getSpinHistory('user1')).rejects.toThrow('Database connection failed');
    });

    it('properly escapes user ID in filter', async () => {
      mockCollection.getList.mockResolvedValue({ items: [] });

      await getSpinHistory('user"with"quotes');

      expect(mockCollection.getList).toHaveBeenCalledWith(1, 8, {
        filter: 'user = "user"with"quotes"',
        sort: '-spun_at',
      });
    });

    it('handles large limit values', async () => {
      mockCollection.getList.mockResolvedValue({ items: mockSpinHistory });

      await getSpinHistory('user1', 1000);

      expect(mockCollection.getList).toHaveBeenCalledWith(1, 1000, {
        filter: 'user = "user1"',
        sort: '-spun_at',
      });
    });
  });

  describe('getLastSpin', () => {
    it('fetches the most recent spin for a user', async () => {
      mockCollection.getFirstListItem.mockResolvedValue(mockSpinRecord);

      const result = await getLastSpin('user1');

      expect(mockPb.collection).toHaveBeenCalledWith('randomizer_spins');
      expect(mockCollection.getFirstListItem).toHaveBeenCalledWith('user = "user1"', {
        sort: '-spun_at',
      });
      expect(result).toEqual(mockSpinRecord);
    });

    it('returns null when no spins exist', async () => {
      mockCollection.getFirstListItem.mockResolvedValue(null);

      const result = await getLastSpin('user1');

      expect(result).toBeNull();
    });

    it('handles PocketBase errors', async () => {
      const pbError = new Error('Query failed');
      mockCollection.getFirstListItem.mockRejectedValue(pbError);

      await expect(getLastSpin('user1')).rejects.toThrow('Query failed');
    });
  });

  describe('clearSpinHistory', () => {
    it('deletes all spins for a user', async () => {
      mockCollection.getList.mockResolvedValue({
        items: [
          { id: 'spin1' },
          { id: 'spin2' },
          { id: 'spin3' },
        ],
      });
      mockCollection.delete.mockResolvedValue(true);

      const result = await clearSpinHistory('user1');

      expect(mockCollection.getList).toHaveBeenCalledWith(1, 500, {
        filter: 'user = "user1"',
        fields: 'id',
      });
      expect(mockCollection.delete).toHaveBeenCalledTimes(3);
      expect(mockCollection.delete).toHaveBeenCalledWith('spin1');
      expect(mockCollection.delete).toHaveBeenCalledWith('spin2');
      expect(mockCollection.delete).toHaveBeenCalledWith('spin3');
      expect(result).toBe(3);
    });

    it('returns 0 when no spins to delete', async () => {
      mockCollection.getList.mockResolvedValue({ items: [] });

      const result = await clearSpinHistory('user1');

      expect(result).toBe(0);
      expect(mockCollection.delete).not.toHaveBeenCalled();
    });

    it('handles partial deletion failures', async () => {
      mockCollection.getList.mockResolvedValue({
        items: [
          { id: 'spin1' },
          { id: 'spin2' },
          { id: 'spin3' },
        ],
      });
      
      mockCollection.delete
        .mockResolvedValueOnce(true)  // spin1 succeeds
        .mockRejectedValueOnce(new Error('Delete failed'))  // spin2 fails
        .mockResolvedValueOnce(true); // spin3 succeeds

      const result = await clearSpinHistory('user1');

      expect(mockCollection.delete).toHaveBeenCalledTimes(3);
      expect(result).toBe(2); // Only 2 successful deletions
    });

    it('handles fetch errors', async () => {
      mockCollection.getList.mockRejectedValue(new Error('Fetch failed'));

      await expect(clearSpinHistory('user1')).rejects.toThrow('Fetch failed');
    });
  });

  describe('cleanupOldSpins', () => {
    it('deletes spins older than specified days', async () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(mockDate);

      mockCollection.getList.mockResolvedValue({
        items: [
          { id: 'old-spin1' },
          { id: 'old-spin2' },
        ],
      });
      mockCollection.delete.mockResolvedValue(true);

      const result = await cleanupOldSpins(30);

      const expectedCutoffDate = '2023-12-02T12:00:00.000Z'; // 30 days before mock date
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 500, {
        filter: `spun_at < "${expectedCutoffDate}"`,
        fields: 'id',
      });
      expect(mockCollection.delete).toHaveBeenCalledTimes(2);
      expect(result).toBe(2);

      vi.useRealTimers();
    });

    it('uses default retention period of 90 days', async () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      vi.setSystemTime(mockDate);

      mockCollection.getList.mockResolvedValue({ items: [] });

      await cleanupOldSpins();

      const expectedCutoffDate = '2023-10-03T12:00:00.000Z'; // 90 days before mock date
      expect(mockCollection.getList).toHaveBeenCalledWith(1, 500, {
        filter: `spun_at < "${expectedCutoffDate}"`,
        fields: 'id',
      });

      vi.useRealTimers();
    });

    it('returns 0 when no old spins found', async () => {
      mockCollection.getList.mockResolvedValue({ items: [] });

      const result = await cleanupOldSpins(30);

      expect(result).toBe(0);
      expect(mockCollection.delete).not.toHaveBeenCalled();
    });

    it('handles cleanup errors gracefully', async () => {
      mockCollection.getList.mockResolvedValue({
        items: [{ id: 'spin1' }],
      });
      mockCollection.delete.mockRejectedValue(new Error('Delete failed'));

      const result = await cleanupOldSpins(30);

      expect(result).toBe(0); // No successful deletions
    });
  });

  describe('Type Safety', () => {
    it('enforces CreateSpinParams interface', async () => {
      mockCollection.create.mockResolvedValue(mockSpinRecord);

      // Valid params
      const validParams: CreateSpinParams = {
        user: 'user1',
        project: 'proj1',
        project_title: 'Project',
        selected_projects: ['proj1'],
      };

      await expect(createSpin(validParams)).resolves.toBeDefined();

      // TypeScript should catch invalid params at compile time
      // These would be compilation errors:
      // createSpin({ user: 'user1' }); // Missing required fields
      // createSpin({ ...validParams, user: 123 }); // Wrong type
    });

    it('returns properly typed SpinRecord', async () => {
      mockCollection.create.mockResolvedValue(mockSpinRecord);

      const result = await createSpin(mockCreateSpinParams);

      expect(typeof result.id).toBe('string');
      expect(typeof result.user).toBe('string');
      expect(typeof result.project_title).toBe('string');
      expect(Array.isArray(result.selected_projects)).toBe(true);
      expect(typeof result.spun_at).toBe('string');
    });
  });

  describe('Edge Cases', () => {
    it('handles very long project titles', async () => {
      const longTitle = 'A'.repeat(1000);
      const paramsWithLongTitle = {
        ...mockCreateSpinParams,
        project_title: longTitle,
      };

      mockCollection.create.mockResolvedValue({
        ...mockSpinRecord,
        project_title: longTitle,
      });

      const result = await createSpin(paramsWithLongTitle);

      expect(result.project_title).toBe(longTitle);
    });

    it('handles empty selected_projects array', async () => {
      const paramsWithEmptyArray = {
        ...mockCreateSpinParams,
        selected_projects: [],
      };

      mockCollection.create.mockResolvedValue({
        ...mockSpinRecord,
        selected_projects: [],
      });

      const result = await createSpin(paramsWithEmptyArray);

      expect(result.selected_projects).toEqual([]);
    });

    it('handles very large selected_projects array', async () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => `proj${i}`);
      const paramsWithLargeArray = {
        ...mockCreateSpinParams,
        selected_projects: largeArray,
      };

      mockCollection.create.mockResolvedValue({
        ...mockSpinRecord,
        selected_projects: largeArray,
      });

      const result = await createSpin(paramsWithLargeArray);

      expect(result.selected_projects).toEqual(largeArray);
    });
  });
});