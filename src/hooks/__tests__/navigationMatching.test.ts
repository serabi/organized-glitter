/**
 * Tests for navigation matching logic
 * These functions were extracted from useNavigationWithWarning for better maintainability
 */

// Re-implement the helper functions for testing (extracted logic)
const isValidProjectRouteTransition = (target: string, current: string): boolean => {
  const isProjectRoute = target.startsWith('/projects/') && current.startsWith('/projects/');
  if (!isProjectRoute) return false;
  
  const targetParts = target.split('/');
  const currentParts = current.split('/');
  
  // Check if it's a valid project route transition (same project ID)
  return targetParts[2] === currentParts[2] && current === target;
};

const isValidDynamicRouteMatch = (target: string, current: string): boolean => {
  // Pattern match for other dynamic routes (but not projects to avoid conflicts)
  if (target.startsWith('/projects/') || current.startsWith('/projects/')) {
    return false;
  }
  
  // Only match if current contains the parent path of target
  const targetParentPath = target.split('/').slice(0, -1).join('/');
  return targetParentPath.length > 0 && current.includes(targetParentPath);
};

const checkNavigationMatch = (target: string, current: string): boolean => {
  // Exact match is always valid
  const exactMatch = current === target;
  if (exactMatch) return true;
  
  // Check for valid project route transitions
  const projectMatch = isValidProjectRouteTransition(target, current);
  if (projectMatch) return true;
  
  // Check for valid dynamic route matches
  const dynamicMatch = isValidDynamicRouteMatch(target, current);
  return dynamicMatch;
};

describe('Navigation Matching Logic', () => {
  describe('checkNavigationMatch', () => {
    it('should match exact routes', () => {
      expect(checkNavigationMatch('/dashboard', '/dashboard')).toBe(true);
      expect(checkNavigationMatch('/projects/123', '/projects/123')).toBe(true);
      expect(checkNavigationMatch('/profile', '/profile')).toBe(true);
    });

    it('should not match different exact routes', () => {
      expect(checkNavigationMatch('/dashboard', '/profile')).toBe(false);
      expect(checkNavigationMatch('/projects/123', '/projects/456')).toBe(false);
    });
  });

  describe('isValidProjectRouteTransition', () => {
    it('should match valid project routes with same ID', () => {
      expect(isValidProjectRouteTransition('/projects/123', '/projects/123')).toBe(true);
      expect(isValidProjectRouteTransition('/projects/abc123', '/projects/abc123')).toBe(true);
    });

    it('should not match project routes with different IDs', () => {
      expect(isValidProjectRouteTransition('/projects/123', '/projects/456')).toBe(false);
      expect(isValidProjectRouteTransition('/projects/abc', '/projects/xyz')).toBe(false);
    });

    it('should not match non-project routes', () => {
      expect(isValidProjectRouteTransition('/dashboard', '/profile')).toBe(false);
      expect(isValidProjectRouteTransition('/projects/123', '/dashboard')).toBe(false);
      expect(isValidProjectRouteTransition('/dashboard', '/projects/123')).toBe(false);
    });

    it('should handle project sub-routes correctly', () => {
      // The current logic requires exact match, so these should not match
      expect(isValidProjectRouteTransition('/projects/123/edit', '/projects/123')).toBe(false);
      expect(isValidProjectRouteTransition('/projects/123', '/projects/123/edit')).toBe(false);
    });
  });

  describe('isValidDynamicRouteMatch', () => {
    it('should not match project routes', () => {
      expect(isValidDynamicRouteMatch('/projects/123', '/projects/123/edit')).toBe(false);
      expect(isValidDynamicRouteMatch('/projects/123/edit', '/projects/123')).toBe(false);
    });

    it('should match dynamic non-project routes', () => {
      // This tests the pattern matching for other dynamic routes
      expect(isValidDynamicRouteMatch('/users/123/profile', '/users/123')).toBe(true);
      expect(isValidDynamicRouteMatch('/admin/settings', '/admin')).toBe(true);
    });

    it('should not match unrelated routes', () => {
      expect(isValidDynamicRouteMatch('/users/123', '/dashboard')).toBe(false);
      expect(isValidDynamicRouteMatch('/admin/settings', '/profile')).toBe(false);
    });
  });

  describe('Integration tests', () => {
    it('should handle complex navigation scenarios', () => {
      // Exact matches
      expect(checkNavigationMatch('/dashboard', '/dashboard')).toBe(true);
      
      // Project routes - should only match exact same routes
      expect(checkNavigationMatch('/projects/123', '/projects/123')).toBe(true);
      expect(checkNavigationMatch('/projects/123', '/projects/456')).toBe(false);
      
      // Dynamic routes (non-project)
      expect(checkNavigationMatch('/users/123/profile', '/users/123')).toBe(true);
      expect(checkNavigationMatch('/admin/settings', '/admin')).toBe(true);
      
      // Mixed scenarios
      expect(checkNavigationMatch('/projects/123', '/dashboard')).toBe(false);
      expect(checkNavigationMatch('/dashboard', '/projects/123')).toBe(false);
    });
  });
});