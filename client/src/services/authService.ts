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

// ── OTP API calls (new) ───────────────────────────────────────────────────────

export interface CheckEmailResponse {
    exists: boolean;
}

/**
 * POST /api/auth/check-email
 * Returns { exists } — used to redirect unregistered users to signup
 */
export const checkEmail = async (email: string): Promise<CheckEmailResponse> => {
    const { data } = await api.post<CheckEmailResponse>('/api/auth/check-email', { email });
    return data;
};

/**
 * POST /api/auth/send-otp
 * purpose: 'signup' | 'password_reset'
 */
export const sendOtp = async (
    email: string,
    purpose: 'signup' | 'password_reset',
    name?: string
): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/send-otp', {
        email,
        purpose,
        name: name ?? 'User',
    });
    return data;
};

/**
 * POST /api/auth/verify-signup-otp
 * Verify OTP to activate a newly created account
 */
export const verifySignupOtp = async (
    email: string,
    otp: string
): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/verify-signup-otp', { email, otp });
    return data;
};

/**
 * POST /api/auth/verify-password-reset-otp
 * Verify OTP and set new password
 */
export const verifyPasswordResetOtp = async (
    email: string,
    otp: string,
    new_password: string
): Promise<AuthResponse> => {
    const { data } = await api.post<AuthResponse>('/api/auth/verify-password-reset-otp', {
        email,
        otp,
        new_password,
    });
    return data;
};

