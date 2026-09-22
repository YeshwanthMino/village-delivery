/**
 * Auth Store - Zustand
 * Manages authentication state
 */
import { StoredPrefs, type UserObject } from '@/src/base/services/remote/storage/StoredPrefs';
import { apiClient } from '@/src/base/services/remote/apiClient';
import { useLocationStore } from '@/src/core/store/useLocationStore';
import { getStoreIdSync } from '@/src/core/utils/getStoreId';
import * as appAuth from '@/src/features/auth/data/appAuthApi';
import { AuthTokens } from '@/src/base/services/remote/apiTypes';
import { create } from 'zustand';
import { logger } from '@/src/base/services/logger';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserObject | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  deviceId: string | null;
  mobileNumber: string | null;
}

interface AuthActions {
  // Auth actions
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setUser: (user: UserObject | null) => void;
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
  deviceId: null,
  mobileNumber: null,
};

function requireStoreId(): string {
  const storeId = getStoreIdSync();
  if (!storeId) throw new Error('EXPO_PUBLIC_DEFAULT_STORE_ID not set in .env');
  return storeId;
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export const useAuthStore = create<AuthStore>((set, get) => {
  const finalizeAuth = async (tokens: AuthTokens) => {
    await apiClient.saveTokens(tokens);
    let profile: UserObject | null = null;
    try {
      profile = await appAuth.getMe(requireStoreId());
      await StoredPrefs.setUserProfile(profile);
    } catch (e) {
      logger.warn('getMe failed after auth:', e);
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
      logger.warn('Background profile refresh failed:', e);
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
    set({ isLoading: true, error: null });

    try {
      const accessToken = await StoredPrefs.getAccessToken();
      const refreshToken = await StoredPrefs.getRefreshToken();
      const mobileNumber = await StoredPrefs.getUsername();

      // Check for access token only (refresh token might be empty for now)
      if (accessToken) {
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
        set({
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      logger.error('Failed to check existing auth:', error);
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
      const deviceId = await appAuth.requestOtp(requireStoreId(), phoneNumber);
      await StoredPrefs.setUsername(phoneNumber);
      set({ isLoading: false, deviceId, mobileNumber: phoneNumber });
    } catch (error) {
      set({ isLoading: false, error: errMessage(error) });
      throw error;
    }
  },

  verifyOtp: async (phoneNumber: string, otp: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appAuth.verifyLogin(requireStoreId(), phoneNumber, otp, get().deviceId);
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
      const tokens = await appAuth.signup(
        requireStoreId(),
        { mobileNumber: phoneNumber, otp, firstName, lastName },
        get().deviceId,
      );
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

      set({ ...initialState });
    } catch (error) {
      logger.error('Logout failed:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      });
    }
  },

  reset: () => set(initialState),
  };
});

// When a token refresh fails (refresh token expired/invalid), the base-layer
// apiClient cannot import this store without a circular dependency, so it calls
// back through this registered handler to perform a real logout (resets state to
// signed-out; screens reading isAuthenticated re-render accordingly).
apiClient.setOnSessionExpired(() => {
  void useAuthStore.getState().logout();
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
