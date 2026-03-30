import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password, mfaCode = null) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login({ email, password, mfaCode });
          const { accessToken, refreshToken, user, requiresMfa } = response.data.data;

          if (requiresMfa) {
            set({ isLoading: false });
            return { requiresMfa: true };
          }

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });

          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'Login failed';
          set({ error: message, isLoading: false });
          return { error: message };
        }
      },

      logout: async () => {
        try {
          await authAPI.logout();
        } catch (error) {
          // Ignore logout errors
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      fetchUser: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          set({ isAuthenticated: false });
          return;
        }

        try {
          const response = await authAPI.me();
          set({
            user: response.data.data,
            isAuthenticated: true,
          });
        } catch (error) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },

      setUser: (user) => set({ user }),

      clearError: () => set({ error: null }),

      hasRole: (...roles) => {
        const { user } = get();
        return user && roles.includes(user.role);
      },

      canAccessAdmin: () => {
        const { user } = get();
        return user?.role === 'ADMIN';
      },

      canManageModels: () => {
        const { user } = get();
        return ['ADMIN', 'MODEL_DEVELOPER', 'RISK_MANAGER'].includes(user?.role);
      },

      canValidate: () => {
        const { user } = get();
        return ['ADMIN', 'MODEL_VALIDATOR', 'RISK_MANAGER'].includes(user?.role);
      },

      canAssessRisk: () => {
        const { user } = get();
        return ['ADMIN', 'RISK_MANAGER'].includes(user?.role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
