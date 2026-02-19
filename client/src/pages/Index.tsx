import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { CalendarCheck, TrendingUp, Bot, Activity, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuthStore } from '@/stores/authStore';

const chartData = [
  { name: 'Mon', growth: 2400, engagement: 1800 },
  { name: 'Tue', growth: 3200, engagement: 2400 },
  { name: 'Wed', growth: 2800, engagement: 2200 },
  { name: 'Thu', growth: 4100, engagement: 3100 },
  { name: 'Fri', growth: 3800, engagement: 2900 },
  { name: 'Sat', growth: 4600, engagement: 3600 },
  { name: 'Sun', growth: 5200, engagement: 4100 },
];

const agentActivity = [
  { agent: 'Content Writer', action: 'Generated blog draft', time: '2m ago', status: 'active' },
  { agent: 'Social Manager', action: 'Scheduled 3 posts', time: '8m ago', status: 'active' },
  { agent: 'SEO Optimizer', action: 'Analyzed 12 pages', time: '15m ago', status: 'idle' },
  { agent: 'Lead Hunter', action: 'Found 7 prospects', time: '22m ago', status: 'active' },
  { agent: 'Ad Manager', action: 'Optimized budget', time: '1h ago', status: 'idle' },
];

const metricCards = [
  { label: 'Scheduled Posts', value: '24', change: '+12%', icon: CalendarCheck, glow: 'metric-card-blue' },
  { label: 'Engagement Rate', value: '8.4%', change: '+2.1%', icon: TrendingUp, glow: 'metric-card-cyan' },
  { label: 'Active Agents', value: '6/8', change: 'Online', icon: Bot, glow: 'metric-card-indigo' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const displayName = user?.name?.split(' ')[0] || 'Commander';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-foreground">
            Welcome back, <span className="gradient-text">{displayName}</span>
          </h1>
          <p className="text-muted-foreground mt-1">All systems operational • Last sync 30s ago</p>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {metricCards.map((card, i) => (
            <motion.div
              key={card.label}
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.1 * (i + 1) }}
              className={`glass-card p-5 ${card.glow}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-display font-bold text-foreground mt-1">{card.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <card.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3 text-sm">
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{card.change}</span>
                <span className="text-muted-foreground">vs last week</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="lg:col-span-2 glass-card p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-semibold text-foreground">Growth Trajectory</h2>
              <span className="text-xs text-muted-foreground px-2 py-1 rounded-lg bg-muted/50">Last 7 days</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22D3EE" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(59,130,246,0.3)',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="growth" stroke="#3B82F6" fill="url(#growthGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="engagement" stroke="#22D3EE" fill="url(#engGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Agent Activity */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.5 }}
            className="glass-card p-5"
          >
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Agent Activity
            </h2>
            <div className="space-y-3">
              {agentActivity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${item.status === 'active' ? 'bg-emerald-400 animate-pulse-glow' : 'bg-muted-foreground'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.agent}</p>
                    <p className="text-xs text-muted-foreground">{item.action}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
