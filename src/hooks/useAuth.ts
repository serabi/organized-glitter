import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext/context';

export const useAuth = () => useContext(AuthContext);
