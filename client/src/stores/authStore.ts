/**
 * Auth Store (Zustand)
 * Manages authentication state: user, tokens, loading, error.
 * Persists tokens to localStorage for session restoration.
 */

import { create } from 'zustand';
import * as authService from '@/services/authService';
import type { UserPublic } from '@/services/authService';
import { AxiosError } from 'axios';

interface AuthState {
    user: UserPublic | null;
    accessToken: string | null;
    refreshToken: string | null;
    isLoading: boolean;
    isInitialized: boolean;
    error: string | null;

    // Actions
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
    clearError: () => void;
    initializeAuth: () => Promise<void>;
}

const getStoredToken = (key: string) => localStorage.getItem(key);

const extractErrorMessage = (error: unknown): string => {
    if (error instanceof AxiosError) {
        const detail = error.response?.data?.detail;
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ');
    }
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred';
};

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    accessToken: getStoredToken('access_token'),
    refreshToken: getStoredToken('refresh_token'),
    isLoading: false,
    isInitialized: false,
    error: null,

    login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
            const response = await authService.login(email, password);

            if (response.access_token) {
                localStorage.setItem('access_token', response.access_token);
            }
            if (response.refresh_token) {
                localStorage.setItem('refresh_token', response.refresh_token);
            }
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
            }

            set({
                user: response.user ?? null,
                accessToken: response.access_token ?? null,
                refreshToken: response.refresh_token ?? null,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            set({ isLoading: false, error: extractErrorMessage(error) });
            throw error;
        }
    },

    signup: async (email: string, password: string, name: string) => {
        set({ isLoading: true, error: null });
        try {
            await authService.signup(email, password, name);
            set({ isLoading: false, error: null });
        } catch (error) {
            set({ isLoading: false, error: extractErrorMessage(error) });
            throw error;
        }
    },

    logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        set({
            user: null,
            accessToken: null,
            refreshToken: null,
            error: null,
        });
    },

    clearError: () => set({ error: null }),

    initializeAuth: async () => {
        const token = getStoredToken('access_token');
        if (!token) {
            set({ isInitialized: true });
            return;
        }

        // Try to restore user from localStorage first (instant)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                set({ user: JSON.parse(storedUser) });
            } catch {
                // ignore parse error
            }
        }

        // Then validate token with backend
        try {
            const response = await authService.getMe();
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user));
                set({ user: response.user, accessToken: token });
            }
        } catch {
            // Token invalid — clear auth
            get().logout();
        } finally {
            set({ isInitialized: true });
        }
    },
}));
