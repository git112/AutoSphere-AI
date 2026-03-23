/**
 * SEO Service
 * Wraps all /api/seo/* backend endpoints.
 * Types match backend models (app/models/seo.py).
 */

import api from './api';

// ── Types matching backend schemas ────────────────────────────────────────────

export interface DimensionScore {
    name: string;
    score: number;
    details: string;
}

export interface SEOMetadata {
    title: string;
    meta_description: string;
    hashtags: string[];
}

export interface SEOOptimizeRequest {
    input_type: 'text' | 'url' | 'generated';
    content?: string;
    url?: string;
    target_keywords: string[];
    content_type: 'blog' | 'social' | 'article';
}

export interface SEOOptimizeResponse {
    optimized_content: string;
    seo_score: number;
    dimension_scores: DimensionScore[];
    improvements: string[];
    suggested_keywords: string[];
    metadata: SEOMetadata;
    original_content: string;
}

export interface URLFetchRequest {
    url: string;
}

export interface URLFetchResponse {
    title: string;
    meta_description: string;
    headings: string[];
    body_text: string;
    url: string;
}

// ── SEO API calls ─────────────────────────────────────────────────────────────

/**
 * POST /api/seo/optimize
 * Full SEO optimization pipeline.
 * Accepts text, URL, or generated content.
 */
export const optimizeContent = async (
    payload: SEOOptimizeRequest
): Promise<SEOOptimizeResponse> => {
    const { data } = await api.post<SEOOptimizeResponse>(
        '/api/seo/optimize',
        payload
    );
    return data;
};

/**
 * POST /api/seo/fetch-url
 * Fetch and extract content from a URL.
 */
export const fetchUrl = async (url: string): Promise<URLFetchResponse> => {
    const { data } = await api.post<URLFetchResponse>(
        '/api/seo/fetch-url',
        { url }
    );
    return data;
};
