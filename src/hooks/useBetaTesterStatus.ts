import { useState, useEffect } from 'react';
import { pb } from '@/lib/pocketbase';
import { logger } from '@/utils/logger';

/**
 * Created 2025-05-26 while refactoring Profile.tsx
 * Custom hook to manage beta tester status
 * Extracts beta tester logic from complex useEffect in Profile component
 */
export function useBetaTesterStatus(userId: string | undefined) {
  const [isBetaTester, setIsBetaTester] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchBetaTesterStatus = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const userRecord = await pb.collection('users').getOne(userId, {
          fields: 'beta_tester',
        });

        const betaTesterValue = Boolean(userRecord.beta_tester);
        setIsBetaTester(betaTesterValue);
      } catch (error) {
        logger.error('Error fetching beta tester status:', error);
        // If user not found or other error, assume not a beta tester
        setIsBetaTester(false);
      } finally {
        setLoading(false);
      }
    };

    // Always fetch on component mount to ensure we have the latest data
    fetchBetaTesterStatus();
  }, [userId]);

  return {
    isBetaTester,
    setIsBetaTester,
    loading,
  };
}
