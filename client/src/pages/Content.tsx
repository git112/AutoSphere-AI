/**
 * Content.tsx — AI Content Composer
 * Layout: [Input Panel | draggable divider | Output Panel]
 *         [          History Section (full-width)         ]
 *
 * Rules:
 *  - Only Input ↔ Output is resizable (drag the divider)
 *  - History is fixed-height at the bottom, no separator
 *  - Max 3 regenerations per generation session
 *  - History persists in component state (session-scoped)
 */

import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles, Zap, Loader2, AlertCircle, Copy, Check,
  RefreshCw, Instagram, Linkedin, Twitter, Hash, TrendingUp,
  FileText, ChevronDown, Trash2, Clock, ImageIcon,
  Target, MessageSquare, Layers, GripVertical, Eye,
  RotateCcw, ChevronRight, CalendarClock, X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { generateFullPost, getDrafts, updatePost, getPostingTimes } from '@/services/contentService';
import type { FullPostRequest, FullPostResponse, Post } from '@/services/contentService';
import { toast } from 'sonner';
import { todayIST, nowTimeIST, nextHourIST, formatTimeIST } from '@/lib/dateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Constants & Types
// ─────────────────────────────────────────────────────────────────────────────

const MAX_REGEN = 3;

const LENGTH_OPTIONS = [
  { value: 'short', label: 'Short', hint: '~50–80 words' },
  { value: 'medium', label: 'Medium', hint: '~150–200 words' },
  { value: 'long', label: 'Long', hint: '~300–400 words' },
] as const;
type LengthValue = typeof LENGTH_OPTIONS[number]['value'];

const LENGTH_PROMPTS: Record<LengthValue, string> = {
  short: 'Write a short post (50-80 words)',
  medium: 'Write a medium-length post (150-200 words)',
  long: 'Write a long, detailed post (300-400 words)',
};

const PLATFORMS = ['LinkedIn', 'Instagram', 'Twitter'] as const;
const TONES = ['Professional', 'Friendly', 'Promotional'] as const;
const GOALS = ['Engagement', 'Sales', 'Awareness'] as const;
const IMG_STYLES = ['Minimal', 'Corporate', 'Story'] as const;

interface HistoryItem {
  id: string;
  topic: string;
  platform: string;
  tone: string;
  goal: string;
  length: LengthValue;
  result: FullPostResponse;
  editedCaption: string;
  editedHashtags: string;
  editedCta: string;
  timestamp: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable components
// ─────────────────────────────────────────────────────────────────────────────

const SelectField = ({
  label, icon: Icon, value, onChange, options, disabled,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  disabled?: boolean;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" />{label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full h-10 pl-3 pr-8 rounded-xl bg-muted/40 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 appearance-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
    </div>
  </div>
);

const ScoreRing = ({ score }: { score: number }) => {
  const pct = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? '#10b981' : pct >= 40 ? '#3b82f6' : '#f59e0b';
  const circ = 2 * Math.PI * 22;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 h-14">
        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="22" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
          <circle
            cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">{pct}</span>
      </div>
      <span className="text-[10px] text-muted-foreground">Engagement</span>
    </div>
  );
};

const platformIcon = (p: string) =>
  p === 'LinkedIn' ? <Linkedin className="w-3.5 h-3.5" /> :
    p === 'Instagram' ? <Instagram className="w-3.5 h-3.5" /> :
      p === 'Twitter' ? <Twitter className="w-3.5 h-3.5" /> : null;

// ─────────────────────────────────────────────────────────────────────────────
// ScheduleModal
// ─────────────────────────────────────────────────────────────────────────────

interface ScheduleModalProps {
  open: boolean;
  platform: string;
  onClose: () => void;
  onConfirm: (date: string, time: string) => Promise<void>;
  isSubmitting: boolean;
}

const ScheduleModal = ({ open, platform, onClose, onConfirm, isSubmitting }: ScheduleModalProps) => {
  const todayStr = todayIST();
  const nowTimeStr = nowTimeIST();

  const [date, setDate] = useState(todayStr);
  const [time, setTime] = useState(() => nextHourIST());
  const [err, setErr] = useState('');
  
  const [suggestedTimes, setSuggestedTimes] = useState<string[]>([]);
  const [isLoadingTimes, setIsLoadingTimes] = useState(false);

  useEffect(() => {
    if (open && platform) {
      setIsLoadingTimes(true);
      getPostingTimes(platform)
        .then(setSuggestedTimes)
        .catch(() => setSuggestedTimes([]))
        .finally(() => setIsLoadingTimes(false));
    }
  }, [open, platform]);

  if (!open) return null;

  const minTime = date === todayStr ? nowTimeStr : '00:00';

  const handleConfirm = async () => {
    if (!date || !time) { setErr('Please select both a date and time.'); return; }
    const selected = new Date(`${date}T${time}`);
    if (selected <= new Date()) { setErr('Please choose a future date and time.'); return; }
    setErr('');
    await onConfirm(date, time);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="schedule-overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="schedule-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="w-full max-w-sm glass-card p-6 space-y-5 relative"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-sm font-display font-bold text-foreground">Schedule Post</h2>
                  <p className="text-xs text-muted-foreground">Pick when to publish</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                min={todayStr}
                onChange={(e) => { setDate(e.target.value); setErr(''); }}
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>

            {/* Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Time</label>
              <input
                type="time"
                value={time}
                min={minTime}
                onChange={(e) => { setTime(e.target.value); setErr(''); }}
                className="w-full h-10 px-3 rounded-xl bg-muted/40 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            
            {/* Suggested Times */}
            {suggestedTimes.length > 0 && (
               <div className="space-y-1.5 pt-1">
                 <div className="flex items-center gap-2">
                   <label className="text-xs font-medium text-muted-foreground">Suggested {platform} Times</label>
                   {isLoadingTimes && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                 </div>
                 <div className="flex flex-wrap gap-2">
                   {suggestedTimes.map((t) => (
                     <button
                       key={t}
                       onClick={() => { setDate(todayStr); setTime(t); setErr(''); }}
                       className="px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                     >
                       {t}
                     </button>
                   ))}
                 </div>
               </div>
            )}

            {/* Validation error */}
            {err && (
              <p className="text-xs text-destructive flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{err}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-xl border border-border bg-muted/30 text-foreground text-sm font-medium hover:bg-muted/60 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSubmitting ? 'Scheduling…' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const Content = () => {
  const { user } = useAuthStore();

  // ── Form ──────────────────────────────────────────────────────────────────
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState<typeof PLATFORMS[number]>('LinkedIn');
  const [tone, setTone] = useState<typeof TONES[number]>('Professional');
  const [goal, setGoal] = useState<typeof GOALS[number]>('Engagement');
  const [imgStyle, setImgStyle] = useState<typeof IMG_STYLES[number]>('Minimal');
  const [length, setLength] = useState<LengthValue>('medium');
  const [topicErr, setTopicErr] = useState('');

  // ── Output ────────────────────────────────────────────────────────────────
  const [result, setResult] = useState<FullPostResponse | null>(null);
  const [editCap, setEditCap] = useState('');
  const [editHash, setEditHash] = useState('');
  const [editCta, setEditCta] = useState('');
  const [regenCount, setRegenCount] = useState(0);
  const [copied, setCopied] = useState<'caption' | 'full' | 'formatted' | null>(null);
  const [apiError, setApiError] = useState('');
  const lastReq = useRef<FullPostRequest | null>(null);

  // ── Formatted preview tab ─────────────────────────────────────────────────
  const [formattedTab, setFormattedTab] = useState<'linkedin' | 'instagram' | 'twitter'>('linkedin');

  // ── Schedule ──────────────────────────────────────────────────────────────
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleScheduleConfirm = async (date: string, time: string) => {
    if (!result?.post_id) return;
    setIsScheduling(true);
    try {
      // Send naive ISO string to backend so it treats it as IST
      const scheduledAt = `${date}T${time}:00`;
      await updatePost(result.post_id, { scheduled_at: scheduledAt, status: 'scheduled', is_draft: false });
      toast.success('✅ Post successfully scheduled!');
      setScheduleOpen(false);
    } catch {
      toast.error('Failed to schedule post. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!result?.post_id) return;
    try {
      await updatePost(result.post_id, { 
        caption: editCap, hashtags: editHash, cta: editCta, 
        status: 'draft', is_draft: true 
      });
      toast.success('Draft saved successfully!');
    } catch {
      toast.error('Failed to save draft.');
    }
  };

  const handlePublishNow = async () => {
    if (!result?.post_id) return;
    try {
      await updatePost(result.post_id, { 
        caption: editCap, hashtags: editHash, cta: editCta, 
        status: 'published', is_draft: false 
      });
      toast.success('Post published successfully!');
    } catch {
      toast.error('Failed to publish post.');
    }
  };

  // ── History ───────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Load history from backend on mount
  useEffect(() => {
    if (!user?.user_id) { setHistoryLoading(false); return; }
    getDrafts(user.user_id)
      .then((drafts: Post[]) => {
        const mapped: HistoryItem[] = drafts.map((d) => ({
          id: d._id ?? (d.user_id + '-' + d.created_at),
          topic: d.topic,
          platform: d.platform,
          tone: d.tone,
          goal: d.goal,
          length: 'medium' as LengthValue, // backend doesn't store length; default to medium
          result: {
            caption: d.caption,
            hashtags: d.hashtags,
            cta: d.cta,
            formatted: d.formatted,
            image_url: d.image_url,
            engagement_score_estimate: d.engagement_score_estimate,
            post_id: d._id ?? '',
          },
          editedCaption: d.caption,
          editedHashtags: d.hashtags,
          editedCta: d.cta,
          timestamp: d.created_at ? new Date(d.created_at) : new Date(),
        }));
        setHistory(mapped);
      })
      .catch(() => {
        // Silently fail — history just stays empty
      })
      .finally(() => setHistoryLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.user_id]);

  // ── Resizable split ───────────────────────────────────────────────────────
  const [splitPct, setSplitPct] = useState(42); // left panel %
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

  // ── Mutation ──────────────────────────────────────────────────────────────
  const mutation = useMutation({
    mutationFn: (payload: FullPostRequest) => generateFullPost(payload),
    onSuccess: (data) => {
      setResult(data);
      setEditCap(data.caption);
      setEditHash(data.hashtags);
      setEditCta(data.cta);
      setApiError('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        (err as Error).message ||
        'Failed to generate post';
      setApiError(msg);
    },
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!topic.trim()) { setTopicErr('Topic is required.'); return false; }
    if (topic.trim().length < 5) { setTopicErr('Topic must be at least 5 characters.'); return false; }
    setTopicErr('');
    return true;
  };

  const buildReq = (): FullPostRequest => ({
    user_id: user!.user_id,
    topic: `${topic.trim()} [${LENGTH_PROMPTS[length]}]`,
    platform,
    tone,
    goal,
    image_style: imgStyle,
    ai_mode: 'default',
  });

  const handleGenerate = () => {
    if (!validate()) return;
    const req = buildReq();
    lastReq.current = req;
    setRegenCount(0);
    setResult(null);
    setApiError('');
    mutation.mutate(req);
  };

  const handleRegen = () => {
    if (!lastReq.current || regenCount >= MAX_REGEN) return;
    // Save current result to history before regenerating
    if (result) saveToHistory(result);
    setRegenCount((c) => c + 1);
    setResult(null);
    setApiError('');
    mutation.mutate(lastReq.current);
  };

  const saveToHistory = (res: FullPostResponse) => {
    const item: HistoryItem = {
      id: res.post_id + '-' + Date.now(),
      topic: topic,
      platform,
      tone,
      goal,
      length,
      result: res,
      editedCaption: editCap,
      editedHashtags: editHash,
      editedCta: editCta,
      timestamp: new Date(),
    };
    setHistory((h) => [item, ...h]);
  };

  // Save to history when a new result arrives (not on first generate, only on regen)
  // Actually: save every completed result to history automatically
  const prevResultId = useRef<string | null>(null);
  useEffect(() => {
    if (result && result.post_id !== prevResultId.current) {
      prevResultId.current = result.post_id;
      // Auto-save to history
      const item: HistoryItem = {
        id: result.post_id + '-' + Date.now(),
        topic,
        platform,
        tone,
        goal,
        length,
        result,
        editedCaption: result.caption,
        editedHashtags: result.hashtags,
        editedCta: result.cta,
        timestamp: new Date(),
      };
      setHistory((h) => [item, ...h.filter((x) => x.result.post_id !== result.post_id)]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const handleCopy = async (type: 'caption' | 'full' | 'formatted') => {
    let text: string;
    if (type === 'caption') {
      text = editCap;
    } else if (type === 'formatted') {
      text = result?.formatted[formattedTab] ?? `${editCap}\n\n${editHash}\n\n${editCta}`;
    } else {
      // 'full' — use the platform-formatted output that matches the selected platform
      const key = platform.toLowerCase() as 'linkedin' | 'instagram' | 'twitter';
      text = result?.formatted[key] ?? `${editCap}\n\n${editHash}\n\n${editCta}`;
    }
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copied to clipboard!');
  };

  const restoreFromHistory = (item: HistoryItem) => {
    setTopic(item.topic);
    setPlatform(item.platform as typeof PLATFORMS[number]);
    setTone(item.tone as typeof TONES[number]);
    setGoal(item.goal as typeof GOALS[number]);
    setLength(item.length);
    setResult(item.result);
    setEditCap(item.editedCaption);
    setEditHash(item.editedHashtags);
    setEditCta(item.editedCta);
    setRegenCount(0);
    setApiError('');
    lastReq.current = {
      user_id: user!.user_id,
      topic: `${item.topic.trim()} [${LENGTH_PROMPTS[item.length]}]`,
      platform: item.platform as typeof PLATFORMS[number],
      tone: item.tone as typeof TONES[number],
      goal: item.goal as typeof GOALS[number],
      image_style: imgStyle,
      ai_mode: 'default',
    };
    toast.success('Content restored from history');
  };

  const deleteHistory = (id: string) => {
    setHistory((h) => h.filter((x) => x.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const isGenerating = mutation.isPending;
  const hasResult = !!result;
  const regenLeft = MAX_REGEN - regenCount;

  const formatTime = (d: Date) => formatTimeIST(d);

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
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground leading-tight">AI Content Composer</h1>
              <p className="text-xs text-muted-foreground">Generate, edit, and publish AI-powered social content</p>
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
                  <span className="text-sm font-semibold text-foreground font-display">Content Settings</span>
                </div>

                {/* Topic */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Topic <span className="text-destructive">*</span>
                  </label>
                  <textarea
                    value={topic}
                    onChange={(e) => { setTopic(e.target.value); if (topicErr) setTopicErr(''); }}
                    placeholder="e.g. How AI is transforming B2B marketing in 2025"
                    rows={3}
                    disabled={isGenerating}
                    className={`w-full px-3 py-2.5 rounded-xl bg-muted/40 border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none leading-relaxed disabled:opacity-50 ${topicErr ? 'border-destructive/60' : 'border-border'}`}
                  />
                  {topicErr && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{topicErr}
                    </p>
                  )}
                </div>

                {/* Length */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />Content Length
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {LENGTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isGenerating}
                        onClick={() => setLength(opt.value)}
                        className={`flex flex-col items-center py-2.5 px-1 rounded-xl border text-xs font-medium transition-all duration-200 disabled:opacity-50 ${length === opt.value
                          ? 'border-primary/60 bg-primary/10 text-primary'
                          : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:text-foreground'
                          }`}
                      >
                        <span className="font-semibold">{opt.label}</span>
                        <span className="text-[10px] opacity-70 mt-0.5 leading-tight text-center">{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Platform & Tone */}
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Platform" icon={Linkedin} value={platform} onChange={(v) => setPlatform(v as typeof PLATFORMS[number])} options={PLATFORMS} disabled={isGenerating} />
                  <SelectField label="Tone" icon={MessageSquare} value={tone} onChange={(v) => setTone(v as typeof TONES[number])} options={TONES} disabled={isGenerating} />
                </div>

                {/* Goal & Image Style */}
                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Goal" icon={Target} value={goal} onChange={(v) => setGoal(v as typeof GOALS[number])} options={GOALS} disabled={isGenerating} />
                  <SelectField label="Image Style" icon={ImageIcon} value={imgStyle} onChange={(v) => setImgStyle(v as typeof IMG_STYLES[number])} options={IMG_STYLES} disabled={isGenerating} />
                </div>

                {/* Generate button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_28px_rgba(59,130,246,0.45)] transition-all duration-300 flex items-center justify-center gap-2.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                  ) : (
                    <><Zap className="w-4 h-4" />Generate Post</>
                  )}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  <span className="text-primary font-medium">{platform}</span> · {tone} · {goal} · {LENGTH_OPTIONS.find(l => l.value === length)?.hint}
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
              <div className="p-5 space-y-4 flex-1">
                {/* Panel header */}
                <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                  <Eye className="w-4 h-4 text-neon-cyan" />
                  <span className="text-sm font-semibold text-foreground font-display">Generated Output</span>
                  {hasResult && (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                      Ready
                    </span>
                  )}
                </div>

                {/* Generating skeleton */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div
                      key="skel"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                        <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-foreground">AI is writing your post…</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Usually takes 5–15 seconds</p>
                        </div>
                      </div>
                      {[90, 75, 85, 60, 70, 50].map((w, i) => (
                        <div key={i} className="h-3 rounded-full bg-muted/60 animate-pulse" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* API Error */}
                <AnimatePresence>
                  {apiError && !isGenerating && (
                    <motion.div
                      key="err"
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive"
                    >
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Generation failed</p>
                        <p className="text-xs mt-0.5 opacity-80">{apiError}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Empty state */}
                <AnimatePresence>
                  {!hasResult && !isGenerating && !apiError && (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center py-16 gap-4 text-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-primary/40" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Output appears here</p>
                        <p className="text-xs text-muted-foreground mt-1">Fill in settings and click <strong>Generate Post</strong></p>
                      </div>
                      <div className="flex flex-wrap gap-1.5 justify-center">
                        {['Caption', 'Hashtags', 'CTA', 'Image', 'Score'].map((t) => (
                          <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted/40 text-muted-foreground border border-border/50">{t}</span>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Result Card ── */}
                <AnimatePresence>
                  {hasResult && !isGenerating && (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {/* Result meta */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">Content Ready</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-muted-foreground">
                              {platformIcon(platform)}
                              <span className="text-xs">{platform} · {tone} · {goal}</span>
                            </div>
                          </div>
                        </div>
                        <ScoreRing score={result!.engagement_score_estimate} />
                      </div>

                      {/* Caption */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Caption</label>
                          <button
                            onClick={() => handleCopy('caption')}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                          >
                            {copied === 'caption' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copied === 'caption' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <textarea
                          value={editCap}
                          onChange={(e) => setEditCap(e.target.value)}
                          rows={6}
                          className="w-full px-3.5 py-3 rounded-xl bg-muted/30 border border-border/60 text-foreground text-sm leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all resize-y"
                        />
                      </div>

                      {/* Hashtags */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-neon-cyan" />Hashtags
                        </label>
                        <input
                          type="text" value={editHash} onChange={(e) => setEditHash(e.target.value)}
                          className="w-full h-10 px-3.5 rounded-xl bg-muted/30 border border-border/60 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-mono"
                        />
                      </div>

                      {/* CTA */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-neon-indigo" />Call to Action
                        </label>
                        <input
                          type="text" value={editCta} onChange={(e) => setEditCta(e.target.value)}
                          className="w-full h-10 px-3.5 rounded-xl bg-muted/30 border border-border/60 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
                        />
                      </div>

                      {/* Image */}
                      {result!.image_url && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5" />Generated Image
                          </label>
                          <img src={result!.image_url} alt="Generated" className="w-full rounded-xl object-cover max-h-44 border border-border/50" />
                        </div>
                      )}

                      {/* Platform Formatted Preview — tabbed */}
                      <div className="rounded-xl bg-muted/20 border border-border/50 overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-border/40">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setFormattedTab('linkedin')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${formattedTab === 'linkedin'
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                              <Linkedin className="w-3 h-3" />LinkedIn
                            </button>
                            <button
                              onClick={() => setFormattedTab('instagram')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${formattedTab === 'instagram'
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                              <Instagram className="w-3 h-3" />Instagram
                            </button>
                            <button
                              onClick={() => setFormattedTab('twitter')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${formattedTab === 'twitter'
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                                }`}
                            >
                              <Twitter className="w-3 h-3" />Twitter
                            </button>
                          </div>
                          <button
                            onClick={() => handleCopy('formatted')}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                          >
                            {copied === 'formatted' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            {copied === 'formatted' ? 'Copied!' : 'Copy Formatted'}
                          </button>
                        </div>
                        {/* Content */}
                        <div className="p-4 max-h-48 overflow-y-auto">
                          <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap font-mono">
                            {result!.formatted[formattedTab]}
                          </p>
                        </div>
                      </div>

                      {/* Action row */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        {/* Copy full */}
                        <button
                          onClick={() => handleCopy('full')}
                          className="flex-1 h-10 rounded-xl border border-border bg-muted/30 text-foreground text-sm font-medium hover:bg-muted/60 transition-colors flex items-center justify-center gap-2"
                        >
                          {copied === 'full' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                          {copied === 'full' ? 'Copied!' : 'Copy Full Post'}
                        </button>

                        {/* Schedule Post */}
                        <button
                          onClick={() => setScheduleOpen(true)}
                          className="flex-1 h-10 rounded-xl border border-emerald-500/40 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2"
                        >
                          <CalendarClock className="w-4 h-4" />Schedule Post
                        </button>

                        {/* Regenerate */}
                        <div className="flex-1 flex flex-col gap-1">
                          <button
                            onClick={handleRegen}
                            disabled={regenCount >= MAX_REGEN || isGenerating}
                            className="w-full h-10 rounded-xl border border-primary/40 text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <RefreshCw className="w-4 h-4" />Regenerate
                          </button>
                          {regenCount >= MAX_REGEN ? (
                            <p className="text-xs text-destructive text-center flex items-center justify-center gap-1">
                              <AlertCircle className="w-3 h-3" />Maximum regeneration attempts reached.
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground text-center">
                              {regenLeft} regeneration{regenLeft !== 1 ? 's' : ''} left
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        {/* Save Draft */}
                        <button
                          onClick={handleSaveDraft}
                          className="flex-1 h-10 rounded-xl border border-border bg-muted/30 text-foreground text-sm font-medium hover:bg-muted/60 transition-colors flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />Save Draft
                        </button>
                        
                        {/* Publish Now */}
                        <button
                          onClick={handlePublishNow}
                          className="flex-1 h-10 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4" />Publish Now
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>

          {/* ════════════════════════════════════════════════════════════════════
            HISTORY SECTION (fixed at bottom, full-width, no separator drag)
        ════════════════════════════════════════════════════════════════════ */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="glass-card p-5 flex-shrink-0"
          >
            {/* History header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-primary" />
                Generation History
                {history.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{history.length}</span>
                )}
              </h2>
              {history.length > 0 && (
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />Clear all
                </button>
              )}
            </div>

            {/* Loading / Empty history */}
            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 opacity-40 animate-spin" />
                <p className="text-xs">Loading history…</p>
              </div>
            ) : history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <RotateCcw className="w-6 h-6 opacity-25" />
                <p className="text-sm">No history yet — generate your first post above</p>
              </div>
            )}

            {/* History list */}
            {history.length > 0 && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/50 bg-muted/20 overflow-hidden transition-all"
                  >
                    {/* History item header (always visible) */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                        {platformIcon(item.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.topic}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{item.tone} · {item.goal} · {item.length}</span>
                          <span className="text-xs text-muted-foreground/50">·</span>
                          <span className="text-xs text-muted-foreground">{formatTime(item.timestamp)}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Score: {item.result.engagement_score_estimate}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Restore */}
                        <button
                          onClick={() => restoreFromHistory(item)}
                          title="Restore this content"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        {/* Expand/collapse */}
                        <button
                          onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                          title="View full content"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expandedId === item.id ? 'rotate-90' : ''}`} />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => deleteHistory(item.id)}
                          title="Delete"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded full content */}
                    <AnimatePresence>
                      {expandedId === item.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                            {/* Caption */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Caption</p>
                              <p className="text-sm text-foreground/90 leading-relaxed bg-background/40 rounded-lg p-3 whitespace-pre-wrap">
                                {item.editedCaption}
                              </p>
                            </div>
                            {/* Hashtags */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <Hash className="w-3 h-3 text-neon-cyan" />Hashtags
                              </p>
                              <p className="text-xs text-primary font-mono bg-background/40 rounded-lg p-2.5">{item.editedHashtags}</p>
                            </div>
                            {/* CTA */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3 text-neon-indigo" />Call to Action
                              </p>
                              <p className="text-sm text-foreground/80 bg-background/40 rounded-lg p-2.5">{item.editedCta}</p>
                            </div>
                            {/* Formatted output */}
                            {item.result.formatted && (
                              <div className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                  {platformIcon(item.platform)}
                                  Formatted ({item.platform})
                                </p>
                                <p className="text-xs text-foreground/80 bg-background/40 rounded-lg p-2.5 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto leading-relaxed">
                                  {item.result.formatted?.[item.platform.toLowerCase() as 'linkedin' | 'instagram' | 'twitter']}
                                </p>
                              </div>
                            )}
                            {/* Copy from history */}
                            <button
                              onClick={async () => {
                                const key = item.platform.toLowerCase() as 'linkedin' | 'instagram' | 'twitter';
                                const text = item.result.formatted?.[key]
                                  ?? `${item.editedCaption}\n\n${item.editedHashtags}\n\n${item.editedCta}`;
                                await navigator.clipboard.writeText(text);
                                toast.success('Copied from history!');
                              }}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded-lg hover:bg-primary/10"
                            >
                              <Copy className="w-3 h-3" />Copy formatted post
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

        </div>
      </DashboardLayout>

      {/* Schedule Modal — rendered outside DashboardLayout to escape stacking context */}
      <ScheduleModal
        open={scheduleOpen}
        platform={platform}
        onClose={() => setScheduleOpen(false)}
        onConfirm={handleScheduleConfirm}
        isSubmitting={isScheduling}
      />
    </>
  );
};

export default Content;
