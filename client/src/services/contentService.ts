/**
 * Content Service
 * Wraps all /api/content/* backend endpoints.
 * Request/response shapes match backend models (app/routes/content.py).
 */

import api from './api';

// ── Types matching backend schemas ────────────────────────────────────────────

export interface PostFormattedContent {
    instagram: string;
    linkedin: string;
}

export interface Post {
    _id?: string;
    user_id: string;
    topic: string;
    platform: 'Instagram' | 'LinkedIn';
    tone: 'Professional' | 'Friendly' | 'Promotional';
    goal: 'Engagement' | 'Sales' | 'Awareness';
    caption: string;
    hashtags: string;
    cta: string;
    formatted: PostFormattedContent;
    image_url?: string | null;
    engagement_score_estimate: number;
    status: string;
    is_draft: boolean;
    created_at?: string;
    scheduled_at?: string;
}

export interface FullPostRequest {
    user_id: string;
    topic: string;
    platform: 'Instagram' | 'LinkedIn';
    tone: 'Professional' | 'Friendly' | 'Promotional';
    goal: 'Engagement' | 'Sales' | 'Awareness';
    image_style: 'Minimal' | 'Corporate' | 'Story';
    ai_mode?: 'default' | 'custom';
}

export interface FullPostResponse {
    caption: string;
    hashtags: string;
    cta: string;
    formatted: PostFormattedContent;
    image_url?: string | null;
    engagement_score_estimate: number;
    post_id: string;
}

// ── Content API calls ─────────────────────────────────────────────────────────

/**
 * POST /api/content/generate-full-post
 * Main AI content generation endpoint.
 * Generates caption, hashtags, CTA, formatted content, and optional image.
 * Auto-saves to DB and returns post_id.
 */
export const generateFullPost = async (
    payload: FullPostRequest
): Promise<FullPostResponse> => {
    const { data } = await api.post<FullPostResponse>(
        '/api/content/generate-full-post',
        payload
    );
    return data;
};

/**
 * GET /api/content/drafts/{user_id}
 * Returns all drafts for the given user, sorted by created_at desc.
 */
export const getDrafts = async (user_id: string): Promise<Post[]> => {
    const { data } = await api.get<Post[]>(`/api/content/drafts/${user_id}`);
    return data;
};

/**
 * PATCH /api/content/posts/{post_id}
 * Updates an existing post (e.g., scheduling).
 * Body: partial post fields (e.g., { scheduled_at, status })
 */
export const updatePost = async (
    post_id: string,
    updates: Partial<Post> & { scheduled_at?: string }
): Promise<{ success: boolean }> => {
    const { data } = await api.patch<{ success: boolean }>(
        `/api/content/posts/${post_id}`,
        updates
    );
    return data;
};

/**
 * POST /api/content/save-draft
 * Saves a generated post as a draft in MongoDB.
 */
export const saveDraft = async (
    post: Omit<Post, '_id'>
): Promise<{ success: boolean; draft_id: string }> => {
    const { data } = await api.post<{ success: boolean; draft_id: string }>(
        '/api/content/save-draft',
        post
    );
    return data;
};

/**
 * GET /api/content/scheduled/{user_id}
 * Returns all scheduled posts for the given user, sorted by scheduled_at asc.
 */
export const getScheduledPosts = async (user_id: string): Promise<Post[]> => {
    const { data } = await api.get<Post[]>(`/api/content/scheduled/${user_id}`);
    return data;
};

