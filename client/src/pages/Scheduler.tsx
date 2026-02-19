import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import {
  Sparkles, AlertTriangle, Clock, Plus, Lightbulb, Bot,
  CalendarClock, Instagram, Linkedin, CheckCircle2, Loader2,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { getScheduledPosts } from '@/services/contentService';
import type { Post } from '@/services/contentService';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const now = new Date();
const staticEvents = [
  { title: 'LinkedIn Post: AI Trends', start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 30) },
  { title: 'Twitter Thread', start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 14, 30) },
  { title: 'Blog Draft Review', start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 9, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 10, 0) },
  { title: 'Instagram Carousel', start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 16, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 16, 30) },
  { title: 'Newsletter Send', start: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 11, 0), end: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 11, 30) },
];

const upcomingTasks = [
  { task: 'Generate weekly report', agent: 'Analytics Agent', time: 'In 2 hours' },
  { task: 'Optimize ad spend', agent: 'Ad Manager', time: 'In 4 hours' },
  { task: 'Send follow-up emails', agent: 'Outreach Agent', time: 'Tomorrow 9 AM' },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const platformIcon = (p: string) =>
  p === 'LinkedIn' ? <Linkedin className="w-3.5 h-3.5" /> :
    p === 'Instagram' ? <Instagram className="w-3.5 h-3.5" /> : null;

const formatScheduled = (iso: string) => {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
};

const Scheduler = () => {
  const { user } = useAuthStore();
  const [scheduledPosts, setScheduledPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) { setLoading(false); return; }
    getScheduledPosts(user.user_id)
      .then(setScheduledPosts)
      .catch(() => {/* silently fail */ })
      .finally(() => setLoading(false));
  }, [user?.user_id]);

  // Build calendar events from real scheduled posts (add on top of static ones)
  const scheduledEvents = scheduledPosts
    .filter((p) => p.scheduled_at)
    .map((p) => {
      const start = new Date(p.scheduled_at!);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      return { title: `${p.platform}: ${p.topic.slice(0, 40)}`, start, end };
    });

  const allEvents = [...staticEvents, ...scheduledEvents];

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
                    className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3 hover:border-primary/30 transition-colors"
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
      </div>
    </DashboardLayout>
  );
};

export default Scheduler;
