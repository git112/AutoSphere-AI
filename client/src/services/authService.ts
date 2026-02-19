/**
 * Auth Service
 * Wraps all /api/auth/* backend endpoints.
 * Request/response shapes match backend models exactly (app/models/auth.py).
 */

import api from './api';

// ── Types matching backend schemas ────────────────────────────────────────────

export interface UserPublic {
    user_id: string;
    email: string;
    name: string;
    is_email_verified: boolean;
    is_active: boolean;
    ai_mode: string;
    ai_provider: string;
    created_at: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    access_token?: string;
    refresh_token?: string;
    user?: UserPublic;
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

// ── Auth API calls ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Body: { email, password, name }
 * Password must have: 8+ chars, uppercase, lowercase, digit, special char
 */
export const signup = async (
    email: string,
    password: string,
    name: string
): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/signup', {
        email,
        password,
        name,
    });
    return data;
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Returns: access_token, refresh_token, user
 */
export const login = async (
    email: string,
    password: string
): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/login', {
        email,
        password,
    });
    return data;
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 * Always returns success (backend prevents email enumeration)
 */
export const forgotPassword = async (email: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/forgot-password', {
        email,
    });
    return data;
};

/**
 * POST /api/auth/reset-password
 * Body: { token, new_password }
 */
export const resetPassword = async (
    token: string,
    new_password: string
): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/reset-password', {
        token,
        new_password,
    });
    return data;
};

/**
 * POST /api/auth/verify-email
 * Body: { token }
 */
export const verifyEmail = async (token: string): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/verify-email', {
        token,
    });
    return data;
};

/**
 * POST /api/auth/refresh-token
 * Body: { refresh_token }
 */
export const refreshToken = async (refresh_token: string): Promise<TokenResponse> => {
    const { data } = await api.post<TokenResponse>('/api/auth/refresh-token', {
        refresh_token,
    });
    return data;
};

/**
 * GET /api/auth/me
 * Requires: Authorization: Bearer <access_token> (injected by api.ts interceptor)
 */
export const getMe = async (): Promise<AuthResponse> => {
    const { data } = await api.get<AuthResponse>('/api/auth/me');
    return data;
};
