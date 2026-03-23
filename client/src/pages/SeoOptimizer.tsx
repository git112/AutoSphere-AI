/**
 * SeoOptimizer.tsx — SEO Optimization Module
 * Layout: [Input Panel | draggable divider | Output Panel]
 *
 * Input modes: Paste Content, Enter URL, Use Generated Content
 * Output: SEO score gauge, dimension breakdown, optimized content,
 *         improvements list, suggested keywords, metadata.
 */

import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
    Search, Loader2, AlertCircle, Copy, Check,
    FileText, GripVertical, Eye, Globe, Sparkles,
    Zap, Tag, TrendingUp, ChevronDown, RefreshCw,
    BarChart3, Target, Award, BookOpen, MessageSquare,
    Send, ExternalLink, Hash, ArrowRight, Lightbulb,
    ClipboardPaste, Link2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import {
    optimizeContent,
    fetchUrl,
} from '@/services/seoService';
import type {
    SEOOptimizeRequest,
    SEOOptimizeResponse,
    DimensionScore,
} from '@/services/seoService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type InputMode = 'text' | 'url';
type ContentType = 'blog' | 'social' | 'article';

const INPUT_MODES = [
    { value: 'text' as const, label: 'Paste Content', icon: ClipboardPaste, hint: 'Analyze any text' },
    { value: 'url' as const, label: 'Enter URL', icon: Link2, hint: 'Scrape a webpage' },
];

const CONTENT_TYPES = [
    { value: 'blog' as const, label: 'Blog', icon: BookOpen },
    { value: 'social' as const, label: 'Social', icon: MessageSquare },
    { value: 'article' as const, label: 'Article', icon: FileText },
];

const DIMENSION_ICONS: Record<string, React.ElementType> = {
    'Keyword Relevance': Tag,
    'Engagement Quality': TrendingUp,
    'Content Structure': BarChart3,
    'Readability': BookOpen,
    'Search Intent': Target,
};

const DIMENSION_COLORS: Record<string, string> = {
    'Keyword Relevance': '#818cf8',
    'Engagement Quality': '#f472b6',
    'Content Structure': '#34d399',
    'Readability': '#fbbf24',
    'Search Intent': '#60a5fa',
};

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable components
// ─────────────────────────────────────────────────────────────────────────────

const ScoreGauge = ({ score, size = 120 }: { score: number; size?: number }) => {
    const pct = Math.min(100, Math.max(0, score));
    const color = pct >= 75 ? '#10b981' : pct >= 50 ? '#3b82f6' : pct >= 25 ? '#f59e0b' : '#ef4444';
    const r = (size - 12) / 2;
    const circ = 2 * Math.PI * r;
    const label = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : pct >= 25 ? 'Needs Work' : 'Poor';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="-rotate-90" style={{ width: size, height: size }} viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2} cy={size / 2} r={r}
                        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8"
                    />
                    <motion.circle
                        cx={size / 2} cy={size / 2} r={r}
                        fill="none" stroke={color} strokeWidth="8"
                        strokeDasharray={circ}
                        strokeLinecap="round"
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                        transition={{ duration: 1.2, ease: 'easeOut' }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        className="text-3xl font-bold text-foreground"
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        {pct}
                    </motion.span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
                </div>
            </div>
            <span className="text-xs font-semibold" style={{ color }}>{label}</span>
        </div>
    );
};

const DimensionBar = ({ dim }: { dim: DimensionScore }) => {
    const Icon = DIMENSION_ICONS[dim.name] || Target;
    const color = DIMENSION_COLORS[dim.name] || '#60a5fa';

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    {dim.name}
                </div>
                <span className="text-xs font-bold" style={{ color }}>{dim.score}</span>
            </div>
            <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${dim.score}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                />
            </div>
            {dim.details && (
                <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{dim.details}</p>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const SeoOptimizer = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    // ── Input state ──────────────────────────────────────────────────────────
    const [inputMode, setInputMode] = useState<InputMode>('text');
    const [content, setContent] = useState('');
    const [url, setUrl] = useState('');
    const [keywordsInput, setKeywordsInput] = useState('');
    const [contentType, setContentType] = useState<ContentType>('blog');
    const [inputErr, setInputErr] = useState('');

    // ── Output state ─────────────────────────────────────────────────────────
    const [result, setResult] = useState<SEOOptimizeResponse | null>(null);
    const [editedContent, setEditedContent] = useState('');
    const [apiError, setApiError] = useState('');
    const [copied, setCopied] = useState(false);

    // ── URL fetch state ──────────────────────────────────────────────────────
    const [urlFetching, setUrlFetching] = useState(false);
    const [urlFetched, setUrlFetched] = useState(false);

    // ── Resizable split ───────────────────────────────────────────────────────
    const [splitPct, setSplitPct] = useState(42);
    const splitRef = useRef<HTMLDivElement>(null);
    const dragging = useRef(false);

    const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current || !splitRef.current) return;
            const rect = splitRef.current.getBoundingClientRect();
            const pct = ((e.clientX - rect.left) / rect.width) * 100;
            setSplitPct(Math.min(70, Math.max(25, pct)));
        };
        const onUp = () => {
            dragging.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    // ── Mutation (optimize) ──────────────────────────────────────────────────
    const mutation = useMutation({
        mutationFn: (payload: SEOOptimizeRequest) => optimizeContent(payload),
        onSuccess: (data) => {
            setResult(data);
            setEditedContent(data.optimized_content);
            setApiError('');
            toast.success('SEO optimization complete!');
        },
        onError: (err: unknown) => {
            const msg =
                (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
                (err as Error).message ||
                'SEO optimization failed';
            setApiError(msg);
        },
    });

    // ── Handlers ──────────────────────────────────────────────────────────────

    const parseKeywords = (): string[] => {
        if (!keywordsInput.trim()) return [];
        return keywordsInput
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k.length > 0);
    };

    const validate = (): boolean => {
        if (inputMode === 'text') {
            if (!content.trim()) { setInputErr('Content is required.'); return false; }
            if (content.trim().length < 20) { setInputErr('Content must be at least 20 characters.'); return false; }
        } else if (inputMode === 'url') {
            if (!url.trim()) { setInputErr('URL is required.'); return false; }
            try { new URL(url); } catch { setInputErr('Please enter a valid URL.'); return false; }
        }
        setInputErr('');
        return true;
    };

    const handleOptimize = () => {
        if (!validate()) return;

        const payload: SEOOptimizeRequest = {
            input_type: inputMode,
            content: inputMode !== 'url' ? content : undefined,
            url: inputMode === 'url' ? url : undefined,
            target_keywords: parseKeywords(),
            content_type: contentType,
        };

        setResult(null);
        setApiError('');
        mutation.mutate(payload);
    };

    const handleFetchUrl = async () => {
        if (!url.trim()) { setInputErr('URL is required.'); return; }
        try { new URL(url); } catch { setInputErr('Please enter a valid URL.'); return; }
        setInputErr('');
        setUrlFetching(true);
        try {
            const data = await fetchUrl(url);
            // Populate content field with fetched text for preview
            const preview = [
                data.title && `Title: ${data.title}`,
                data.meta_description && `Meta: ${data.meta_description}`,
                ...data.headings.slice(0, 5),
                data.body_text.slice(0, 500) + (data.body_text.length > 500 ? '...' : ''),
            ].filter(Boolean).join('\n\n');
            setContent(preview);
            setUrlFetched(true);
            toast.success('URL content fetched successfully!');
        } catch {
            toast.error('Failed to fetch URL content.');
        } finally {
            setUrlFetching(false);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(editedContent || result?.optimized_content || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success('Copied to clipboard!');
    };

    const handleSendToScheduler = () => {
        navigate('/content');
        toast.success('Navigate to Content Composer to schedule your optimized content.');
    };

    const handleReset = () => {
        setContent('');
        setUrl('');
        setKeywordsInput('');
        setInputErr('');
        setResult(null);
        setEditedContent('');
        setApiError('');
        setUrlFetched(false);
    };

    const isOptimizing = mutation.isPending;
    const hasResult = !!result;

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <>
            <DashboardLayout>
                <div className="flex flex-col gap-6 h-full">

                    {/* ── Page Header ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-center gap-3 flex-shrink-0"
                    >
                        <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center neon-glow">
                            <Search className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-xl font-display font-bold text-foreground leading-tight">SEO Optimizer</h1>
                            <p className="text-xs text-muted-foreground">Analyze, optimize, and boost your content's search ranking</p>
                        </div>
                    </motion.div>

                    {/* ════════════════════════════════════════════════════════════════════
            RESIZABLE SPLIT: Input | Output
          ════════════════════════════════════════════════════════════════════ */}
                    <motion.div
                        ref={splitRef}
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, delay: 0.05 }}
                        className="flex flex-1 min-h-0 gap-0 rounded-2xl overflow-hidden"
                        style={{ minHeight: '520px' }}
                    >
                        {/* ════ LEFT: Input Panel ════ */}
                        <div
                            className="flex flex-col overflow-y-auto glass-card rounded-r-none border-r-0"
                            style={{ width: `${splitPct}%`, minWidth: '260px' }}
                        >
                            <div className="p-5 space-y-4 flex-1">
                                {/* Panel header */}
                                <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                                    <FileText className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-semibold text-foreground font-display">Input & Settings</span>
                                </div>

                                {/* ── Input Mode Selector ── */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Zap className="w-3.5 h-3.5" />Input Source
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {INPUT_MODES.map((mode) => (
                                            <button
                                                key={mode.value}
                                                type="button"
                                                disabled={isOptimizing}
                                                onClick={() => { setInputMode(mode.value); setInputErr(''); setUrlFetched(false); }}
                                                className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-xs font-medium transition-all duration-200 disabled:opacity-50 ${inputMode === mode.value
                                                    ? 'border-primary/60 bg-primary/10 text-primary'
                                                    : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                                                    }`}
                                            >
                                                <mode.icon className="w-4 h-4 mb-1" />
                                                <span className="font-semibold leading-tight text-center">{mode.label}</span>
                                                <span className="text-[10px] opacity-70 mt-0.5 leading-tight text-center">{mode.hint}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* ── Content Input (text/generated) ── */}
                                {inputMode === 'text' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Content
                                            <span className="text-destructive">*</span>
                                        </label>
                                        <textarea
                                            value={content}
                                            onChange={(e) => { setContent(e.target.value); if (inputErr) setInputErr(''); }}
                                            placeholder="Paste your blog post, article, or social media content here..."
                                            rows={8}
                                            disabled={isOptimizing}
                                            className={`w-full px-3 py-2.5 rounded-xl bg-muted/40 border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none leading-relaxed disabled:opacity-50 ${inputErr ? 'border-destructive/60' : 'border-border'}`}
                                        />
                                    </div>
                                )}

                                {/* ── URL Input ── */}
                                {inputMode === 'url' && (
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                <Globe className="w-3.5 h-3.5" />Website URL <span className="text-destructive">*</span>
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    value={url}
                                                    onChange={(e) => { setUrl(e.target.value); if (inputErr) setInputErr(''); setUrlFetched(false); }}
                                                    placeholder="https://example.com/your-page"
                                                    disabled={isOptimizing || urlFetching}
                                                    className={`flex-1 h-10 px-3 rounded-xl bg-muted/40 border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50 ${inputErr ? 'border-destructive/60' : 'border-border'}`}
                                                />
                                                <button
                                                    onClick={handleFetchUrl}
                                                    disabled={isOptimizing || urlFetching || !url.trim()}
                                                    className="h-10 px-3 rounded-xl border border-primary/40 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                                >
                                                    {urlFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                                                    {urlFetching ? 'Fetching…' : 'Fetch'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Preview of fetched content */}
                                        {urlFetched && content && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                                    <Eye className="w-3.5 h-3.5" />Extracted Content Preview
                                                </label>
                                                <div className="max-h-36 overflow-y-auto rounded-xl bg-muted/20 border border-border/50 p-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                                    {content}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Error */}
                                {inputErr && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />{inputErr}
                                    </p>
                                )}

                                {/* ── Target Keywords ── */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <Tag className="w-3.5 h-3.5" />Target Keywords
                                        <span className="opacity-60">(optional, comma-separated)</span>
                                    </label>
                                    <input
                                        value={keywordsInput}
                                        onChange={(e) => setKeywordsInput(e.target.value)}
                                        placeholder="e.g. AI marketing, content strategy, SEO tips"
                                        disabled={isOptimizing}
                                        className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all disabled:opacity-50"
                                    />
                                </div>

                                {/* ── Content Type ── */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5" />Content Type
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={contentType}
                                            onChange={(e) => setContentType(e.target.value as ContentType)}
                                            disabled={isOptimizing}
                                            className="w-full h-10 pl-3 pr-8 rounded-xl bg-muted/40 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {CONTENT_TYPES.map((ct) => (
                                                <option key={ct.value} value={ct.value}>{ct.label}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                    </div>
                                </div>

                                {/* ── Action Buttons ── */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleOptimize}
                                        disabled={isOptimizing}
                                        className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_28px_rgba(59,130,246,0.45)] transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {isOptimizing ? (
                                            <><Loader2 className="w-4 h-4 animate-spin" />Optimizing…</>
                                        ) : (
                                            <><Search className="w-4 h-4" />Optimize</>
                                        )}
                                    </button>
                                    {(content || url || result) && (
                                        <button
                                            onClick={handleReset}
                                            disabled={isOptimizing}
                                            className="h-12 px-4 rounded-xl border border-border bg-muted/30 text-muted-foreground text-sm font-medium hover:bg-muted/60 hover:text-foreground transition-all disabled:opacity-50"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground text-center">
                                    <span className="text-primary font-medium capitalize">{inputMode}</span> · {contentType}
                                    {keywordsInput && ` · ${parseKeywords().length} keyword(s)`}
                                </p>
                            </div>
                        </div>

                        {/* ════ DIVIDER (draggable) ════ */}
                        <div
                            onMouseDown={onDividerMouseDown}
                            className="flex-shrink-0 w-3 flex items-center justify-center cursor-col-resize bg-background/60 hover:bg-primary/10 transition-colors group z-10 border-x border-border/40"
                            title="Drag to resize"
                        >
                            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
                        </div>

                        {/* ════ RIGHT: Output Panel ════ */}
                        <div
                            className="flex flex-col overflow-y-auto glass-card rounded-l-none border-l-0"
                            style={{ flex: 1, minWidth: '280px' }}
                        >
                            <div className="p-5 space-y-5 flex-1">
                                {/* Panel header */}
                                <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                                    <Eye className="w-4 h-4 text-neon-cyan" />
                                    <span className="text-sm font-semibold text-foreground font-display">SEO Results</span>
                                    {hasResult && (
                                        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                                            Analyzed
                                        </span>
                                    )}
                                </div>

                                {/* Generating skeleton */}
                                <AnimatePresence>
                                    {isOptimizing && (
                                        <motion.div
                                            key="skel"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="space-y-3"
                                        >
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium text-foreground">Analyzing & optimizing content…</p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">Running 5-dimension SEO analysis</p>
                                                </div>
                                            </div>
                                            {[90, 75, 85, 60, 70, 50, 65].map((w, i) => (
                                                <div key={i} className="h-3 rounded-full bg-muted/60 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* API Error */}
                                <AnimatePresence>
                                    {apiError && !isOptimizing && (
                                        <motion.div
                                            key="err"
                                            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
                                        >
                                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <p className="text-sm font-medium">Optimization failed</p>
                                                <p className="text-xs mt-0.5 opacity-80">{apiError}</p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Empty state */}
                                <AnimatePresence>
                                    {!hasResult && !isOptimizing && !apiError && (
                                        <motion.div
                                            key="empty"
                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="flex flex-col items-center justify-center py-16 gap-4 text-center"
                                        >
                                            <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                                                <Search className="w-7 h-7 text-primary/40" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-foreground">SEO results appear here</p>
                                                <p className="text-xs text-muted-foreground mt-1">Choose input, add content, and click <strong>Optimize</strong></p>
                                            </div>
                                            <div className="flex flex-wrap gap-1.5 justify-center">
                                                {['SEO Score', 'Keywords', 'Structure', 'Readability', 'Improvements'].map((t) => (
                                                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground border border-border/50">{t}</span>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* ── Result ── */}
                                <AnimatePresence>
                                    {hasResult && !isOptimizing && (
                                        <motion.div
                                            key="result"
                                            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                            className="space-y-5"
                                        >
                                            {/* ── Score + Dimensions ── */}
                                            <div className="flex gap-5">
                                                <ScoreGauge score={result!.seo_score} />
                                                <div className="flex-1 space-y-3">
                                                    <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                                                        <Award className="w-3.5 h-3.5" />Dimension Breakdown
                                                    </h3>
                                                    {result!.dimension_scores.map((dim) => (
                                                        <DimensionBar key={dim.name} dim={dim} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ── Improvements ── */}
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" />Improvement Suggestions
                                                </h3>
                                                <div className="space-y-1.5">
                                                    {result!.improvements.map((item, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, x: -8 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/20 border border-border/30"
                                                        >
                                                            <ArrowRight className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                                            <span className="text-xs text-foreground leading-relaxed">{item}</span>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ── Suggested Keywords ── */}
                                            <div className="space-y-2">
                                                <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                    <Hash className="w-3.5 h-3.5 text-indigo-400" />Suggested Keywords
                                                </h3>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {result!.suggested_keywords.map((kw) => (
                                                        <span
                                                            key={kw}
                                                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                                        >
                                                            {kw}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* ── Metadata ── */}
                                            {(result!.metadata.title || result!.metadata.meta_description || result!.metadata.hashtags.length > 0) && (
                                                <div className="space-y-2">
                                                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <Globe className="w-3.5 h-3.5 text-emerald-400" />Optimized Metadata
                                                    </h3>
                                                    <div className="space-y-2 p-3 rounded-xl bg-muted/15 border border-border/30">
                                                        {result!.metadata.title && (
                                                            <div>
                                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Title</span>
                                                                <p className="text-xs text-foreground mt-0.5">{result!.metadata.title}</p>
                                                            </div>
                                                        )}
                                                        {result!.metadata.meta_description && (
                                                            <div>
                                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Meta Description</span>
                                                                <p className="text-xs text-foreground mt-0.5">{result!.metadata.meta_description}</p>
                                                            </div>
                                                        )}
                                                        {result!.metadata.hashtags.length > 0 && (
                                                            <div>
                                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Hashtags</span>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {result!.metadata.hashtags.map((h) => (
                                                                        <span key={h} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                                                            {h}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* ── Optimized Content (editable) ── */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h3 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <FileText className="w-3.5 h-3.5 text-cyan-400" />Optimized Content
                                                    </h3>
                                                    <button
                                                        onClick={handleCopy}
                                                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                                                    >
                                                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                        {copied ? 'Copied' : 'Copy'}
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={editedContent}
                                                    onChange={(e) => setEditedContent(e.target.value)}
                                                    rows={8}
                                                    className="w-full px-3 py-2.5 rounded-xl bg-muted/20 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none leading-relaxed"
                                                />
                                            </div>

                                            {/* ── Action Buttons ── */}
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={handleSendToScheduler}
                                                    className="flex-1 h-11 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Send className="w-4 h-4" />Send to Scheduler
                                                </button>
                                                <button
                                                    onClick={handleCopy}
                                                    className="h-11 px-4 rounded-xl border border-border bg-muted/30 text-foreground text-sm font-medium hover:bg-muted/60 transition-all flex items-center gap-2"
                                                >
                                                    <Copy className="w-4 h-4" />Copy
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default SeoOptimizer;
