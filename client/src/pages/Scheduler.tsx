import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Sparkles, AlertTriangle, Clock, Plus, Lightbulb, Bot,
  CalendarClock, Instagram, Linkedin, CheckCircle2, Loader2,
  X, Trash2, Save, ExternalLink
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getScheduledPosts, updatePost } from '@/services/contentService';
import type { Post } from '@/services/contentService';
import { formatScheduledIST } from '@/lib/dateUtils';
import { toast } from 'sonner';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const now = new Date();
// Static events removed as per user request to remove dummy schedulers.

const upcomingTasks = [
  { task: 'Generate weekly report', agent: 'Analytics Agent', time: 'In 2 hours' },
  { task: 'Optimize ad spend', agent: 'Ad Manager', time: 'In 4 hours' },
  { task: 'Send follow-up emails', agent: 'Outreach Agent', time: 'Tomorrow 9 AM' },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const platformIcon = (p: string) =>
  p === 'LinkedIn' ? <Linkedin className="w-3.5 h-3.5" /> :
    p === 'Instagram' ? <Instagram className="w-3.5 h-3.5" /> : null;

const formatScheduled = (iso: string) => formatScheduledIST(iso);

/** Strip the length-prompt suffix stored in topics, e.g. " [Write a medium-length post ...]" */
const cleanTopic = (topic: string) => topic.replace(/\s*\[Write a[^\]]*\]/i, '').trim();

const Scheduler = () => {
  const { user } = useAuthStore();
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, [user?.user_id]);

  const fetchPosts = () => {
    if (!user?.user_id) { setLoading(false); return; }
    setLoading(true);
    getScheduledPosts(user.user_id)
      .then(setScheduledPosts)
      .catch(() => { toast.error("Failed to load scheduled posts"); })
      .finally(() => setLoading(false));
  };

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editedCaption, setEditedCaption] = useState('');

  const handleOpenModal = (post: Post) => {
    setSelectedPost(post);
    setEditedCaption(post.caption);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPost(null);
  };

  const handleSaveEdit = async () => {
    if (!selectedPost?._id) return;
    setIsSaving(true);
    try {
      await updatePost(selectedPost._id, { caption: editedCaption });
      toast.success("Post updated successfully");
      fetchPosts();
      handleCloseModal();
    } catch (err) {
      toast.error("Failed to update post");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPost?._id) return;
    if (!confirm("Are you sure you want to cancel this scheduled post?")) return;
    setIsSaving(true);
    try {
      // Deleting a scheduled post in this context means cancelling it (changing status)
      await updatePost(selectedPost._id, { status: 'cancelled', is_draft: true });
      toast.success("Scheduled post cancelled");
      fetchPosts();
      handleCloseModal();
    } catch (err) {
      toast.error("Failed to cancel post");
    } finally {
      setIsSaving(false);
    }
  };

  // Build calendar events from real scheduled posts
  const allEvents = scheduledPosts
    .filter((p) => p.scheduled_at)
    .map((p) => {
      const start = new Date(p.scheduled_at!);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const label = cleanTopic(p.topic);
      return {
        title: `${p.platform}: ${label.slice(0, 45)}`,
        start,
        end,
        resource: p // Store full post for selection
      };
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Scheduler</h1>
            <p className="text-muted-foreground text-sm mt-1">AI-optimized content &amp; task scheduling</p>
          </div>
          <div className="flex gap-3">
            <button className="h-10 px-5 rounded-xl border border-primary/30 text-primary text-sm font-medium hover:bg-primary/10 transition-colors flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Suggest Best Time
            </button>
            <button className="h-10 w-10 rounded-xl gradient-primary text-primary-foreground hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }} className="lg:col-span-2 glass-card p-5">
            <div className="h-[500px]">
              <Calendar
                localizer={localizer}
                events={allEvents}
                startAccessor="start"
                endAccessor="end"
                defaultView="week"
                views={['week', 'month', 'day']}
                onSelectEvent={(event: any) => handleOpenModal(event.resource)}
                style={{ height: '100%' }}
              />
            </div>
          </motion.div>

          {/* Side panels */}
          <div className="space-y-4">
            {/* Conflict alerts */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }} className="glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Conflict Alerts
              </h3>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-300">2 posts overlap on Tuesday 10 AM</p>
                <p className="text-xs text-muted-foreground mt-1">Recommend rescheduling one to 2 PM</p>
              </div>
            </motion.div>

            {/* Upcoming AI tasks */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }} className="glass-card p-5">
              <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                Upcoming AI Tasks
              </h3>
              <div className="space-y-3">
                {upcomingTasks.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-border/30 last:border-0">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.task}</p>
                      <p className="text-xs text-muted-foreground">{item.agent} • {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Optimization tip */}
            <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.4 }} className="glass-card p-5 metric-card-cyan">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-neon-cyan" />
                <h3 className="font-display font-semibold text-foreground text-sm">Optimization Tip</h3>
              </div>
              <p className="text-xs text-muted-foreground">Posting between 9–11 AM on weekdays generates 40% more engagement for your audience.</p>
            </motion.div>
          </div>
        </div>

        {/* ── Scheduled Posts (real data) ── */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="glass-card p-5"
        >
          <h2 className="font-display font-semibold text-foreground flex items-center gap-2 text-sm mb-4">
            <CalendarClock className="w-4 h-4 text-primary" />
            Scheduled Posts
            {scheduledPosts.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {scheduledPosts.length}
              </span>
            )}
          </h2>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin opacity-40" />
              <p className="text-xs">Loading scheduled posts…</p>
            </div>
          )}

          {/* Empty */}
          {!loading && scheduledPosts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <CalendarClock className="w-8 h-8 opacity-20" />
              <p className="text-sm">No scheduled posts yet</p>
              <p className="text-xs opacity-60">Generate content and click "Schedule Post" to get started</p>
            </div>
          )}

          {/* Cards grid */}
          {!loading && scheduledPosts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {scheduledPosts.map((post) => {
                const { date, time } = formatScheduled(post.scheduled_at ?? '');
                return (
                  <motion.div
                    key={post._id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => handleOpenModal(post)}
                    className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3 hover:border-primary/30 transition-colors cursor-pointer group"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {platformIcon(post.platform)}
                        <span className="text-xs font-medium text-foreground">{post.platform}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Scheduled
                      </span>
                    </div>

                    {/* Caption preview */}
                    <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3 bg-background/30 rounded-lg p-2.5">
                      {post.caption}
                    </p>

                    {/* Hashtags preview */}
                    {post.hashtags && (
                      <p className="text-xs text-primary/70 font-mono truncate">
                        {post.hashtags.slice(0, 60)}{post.hashtags.length > 60 ? '…' : ''}
                      </p>
                    )}

                    {/* Scheduled time */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/30">
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{date} · {time}</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Post Detail Modal ── */}
        <AnimatePresence>
          {isModalOpen && selectedPost && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleCloseModal}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl glass-card-glow p-0 overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-4 border-b border-border/50 flex items-center justify-between bg-muted/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center neon-glow">
                      {platformIcon(selectedPost.platform)}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-foreground">Post Details</h3>
                      <p className="text-xs text-muted-foreground">{selectedPost.platform} • {cleanTopic(selectedPost.topic)}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCloseModal}
                    className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Status & Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</label>
                      <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-2 rounded-xl border border-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Scheduled</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Scheduled For</label>
                      <div className="flex items-center gap-2 text-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/50">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">
                          {(() => {
                            const { date, time } = formatScheduledIST(selectedPost.scheduled_at!);
                            return `${date} · ${time}`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Caption Editor */}
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Post Caption</label>
                    <textarea
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      className="w-full h-48 bg-background/50 border border-border rounded-xl p-4 text-sm text-foreground focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                      placeholder="Edit your post caption..."
                    />
                  </div>

                  {/* Hashtags & CTA (Read-only for now) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Hashtags</label>
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-xs font-mono text-primary/80 line-clamp-2">
                        {selectedPost.hashtags}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Target CTA</label>
                      <div className="bg-muted/30 p-3 rounded-xl border border-border/50 text-sm text-foreground/80">
                        {selectedPost.cta}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-muted/10 border-t border-border/50 flex items-center justify-between gap-3">
                  <button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="h-11 px-5 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancel Schedule
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCloseModal}
                      className="h-11 px-5 rounded-xl border border-border text-foreground text-sm font-medium hover:bg-muted/50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isSaving || editedCaption === selectedPost.caption}
                      className="h-11 px-8 rounded-xl gradient-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export default Scheduler;
