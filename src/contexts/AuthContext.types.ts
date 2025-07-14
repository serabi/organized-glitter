// PocketBase user record type
export interface PocketBaseUser {
  id: string;
  email?: string;
  username?: string;
  name?: string;
  avatar?: string;
  beta_tester?: boolean;
  timezone?: string;
  created: string;
  updated: string;
  verified?: boolean;
}

export interface AuthContextType {
  user: PocketBaseUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialCheckComplete: boolean;
  signOut: () => Promise<{ success: boolean; error: Error | null }>;
}

export const initialAuthState: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  initialCheckComplete: false,
  signOut: async () => ({
    success: false,
    error: new Error('Initial auth state, signOut not implemented'),
  }),
};

export interface AuthProviderProps {
  children: React.ReactNode;
}
