/**
 * Auth Store - Zustand
 * Manages authentication state
 */
import { StoredPrefs } from '@/src/base/services/remote/storage/StoredPrefs';
import { apiClient } from '@/src/base/services/remote/apiClient';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import * as appAuth from '@/src/features/auth/data/appAuthApi';
import { AuthTokens } from '@/src/base/services/remote/apiTypes';
import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: any | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  requestId: string | null;
  mobileNumber: string | null;
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
  requestOtp: (phoneNumber: string) => Promise<void>;
  verifyOtp: (phoneNumber: string, otp: string) => Promise<'ok' | 'new_user'>;
  signupUser: (
    phoneNumber: string,
    otp: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
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
  requestId: null,
  mobileNumber: null,
};

function requireStoreId(): string {
  const storeId = useLocationStore.getState().serviceableVillage?.storeId;
  if (!storeId) throw new Error('Select your location first');
  return storeId;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export const useAuthStore = create<AuthStore>((set, get) => {
  const finalizeAuth = async (tokens: AuthTokens) => {
    await apiClient.saveTokens(tokens);
    let profile: any = null;
    try {
      profile = await appAuth.getMe(requireStoreId());
      await StoredPrefs.setUserProfile(profile);
    } catch (e) {
      console.warn('getMe failed after auth:', e);
    }
    set({
      isAuthenticated: true,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: profile,
      isLoading: false,
      error: null,
    });
  };

  // Background refresh of the cached profile. Needs a store id (from the
  // hydrated location); if none yet, or the call fails, the cached value is
  // kept silently — never throws.
  const refreshProfile = async () => {
    let storeId: string;
    try {
      storeId = requireStoreId();
    } catch {
      return; // location not hydrated yet — keep cached profile
    }
    try {
      const profile = await appAuth.getMe(storeId);
      await StoredPrefs.setUserProfile(profile);
      set({ user: profile });
    } catch (e) {
      console.warn('Background profile refresh failed:', e);
    }
  };

  return {
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
      const mobileNumber = await StoredPrefs.getUsername();

      console.log('checkExistingAuth: Retrieved tokens', {
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        hasRefreshToken: !!refreshToken,
      });

      // Check for access token only (refresh token might be empty for now)
      if (accessToken) {
        console.log('Found existing access token - Setting authenticated to TRUE');
        // Restore the cached profile immediately so the name shows on launch
        // (even offline); then refresh it from the server in the background.
        const cachedProfile = await StoredPrefs.getUserProfile();
        set({
          isAuthenticated: true,
          accessToken,
          refreshToken: refreshToken || null,
          mobileNumber: mobileNumber || null,
          user: cachedProfile ?? null,
          isLoading: false,
        });
        void refreshProfile();
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

  requestOtp: async (phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      const requestId = await appAuth.requestOtp(requireStoreId(), phoneNumber);
      await StoredPrefs.setUsername(phoneNumber);
      set({ isLoading: false, requestId, mobileNumber: phoneNumber });
    } catch (error) {
      set({ isLoading: false, error: errMessage(error) });
      throw error;
    }
  },

  verifyOtp: async (phoneNumber: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appAuth.verifyLogin(requireStoreId(), phoneNumber, otp, get().requestId);
      if (result.status === 'ok') {
        await finalizeAuth(result.tokens);
        return 'ok';
      }
      set({ isLoading: false });
      return 'new_user';
    } catch (error) {
      set({ isLoading: false, error: errMessage(error) });
      throw error;
    }
  },

  signupUser: async (phoneNumber, otp, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      const tokens = await appAuth.signup(requireStoreId(), {
        mobileNumber: phoneNumber,
        otp,
        firstName,
        lastName,
        requestId: get().requestId,
      });
      await finalizeAuth(tokens);
    } catch (error) {
      set({ isLoading: false, error: errMessage(error) });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null });

    try {
      // Clear only auth data (tokens + cached profile). Locale and the selected
      // location must survive sign-out, so do NOT clearAll().
      await StoredPrefs.clearCredentials();
      await StoredPrefs.setUsername(null);

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
  };
});

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
