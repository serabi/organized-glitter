import { createContext } from 'react';
import { AuthContextType, initialAuthState } from '../AuthContext.types';

export const AuthContext = createContext<AuthContextType>(initialAuthState);
