/**
 * Auth Store - Zustand
 * Manages authentication state
 */
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
}

interface AuthActions {
  // Auth actions
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setUser: (user: any) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setError: (error: string | null) => void;

  // Async actions
  checkExistingAuth: () => Promise<void>;
  login: (phoneNumber: string, otp: string) => Promise<void>;
  logout: () => Promise<void>;

  // Reset
  reset: () => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  user: null,
  accessToken: null,
  refreshToken: null,
  error: null,
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  ...initialState,

  // Synchronous actions
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),

  setLoading: (isLoading) => set({ isLoading }),

  setUser: (user) => set({ user }),

  setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

  setError: (error) => set({ error }),

  // Async actions
  checkExistingAuth: async () => {
    console.log('checkExistingAuth: Starting...');
    set({ isLoading: true, error: null });

    try {
      const accessToken = await StoredPrefs.getAccessToken();
      const refreshToken = await StoredPrefs.getRefreshToken();

      console.log('checkExistingAuth: Retrieved tokens', {
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        hasRefreshToken: !!refreshToken,
      });

      // Check for access token only (refresh token might be empty for now)
      if (accessToken) {
        console.log('Found existing access token - Setting authenticated to TRUE');
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken: refreshToken || null,
          isLoading: false,
        });
      } else {
        console.log('No existing access token found - User NOT authenticated');
        set({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Failed to check existing auth:', error);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check auth',
      });
    }
  },

  login: async (phoneNumber: string, otp: string) => {
    set({ isLoading: true, error: null });

    try {
      // TODO: Implement actual login API call
      // For now, this is a placeholder
      console.log('Login attempt:', { phoneNumber, otp });

      // Simulated login success
      const mockAccessToken = 'mock-access-token';
      const mockRefreshToken = 'mock-refresh-token';
      const mockUser = { id: '1', phoneNumber };

      // Store tokens
      await StoredPrefs.setAccessToken(mockAccessToken);
      await StoredPrefs.setRefreshToken(mockRefreshToken);

      set({
        isAuthenticated: true,
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
        isLoading: false,
      });
    } catch (error) {
      console.error('Login failed:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      });
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });

    try {
      await StoredPrefs.setAccessToken(null);
      await StoredPrefs.setRefreshToken(null);
      await StoredPrefs.clearAll();

      console.log('Logged out successfully');
      set({ ...initialState });
    } catch (error) {
      console.error('Logout failed:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  },

  reset: () => set(initialState),
}));

// Selectors
export const authSelectors = {
  selectIsAuthenticated: (state: AuthStore) => state.isAuthenticated,
  selectIsLoading: (state: AuthStore) => state.isLoading,
  selectUser: (state: AuthStore) => state.user,
  selectError: (state: AuthStore) => state.error,
  selectTokens: (state: AuthStore) => ({
    accessToken: state.accessToken,
    refreshToken: state.refreshToken,
  }),
};
