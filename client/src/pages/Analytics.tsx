import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Eye, DollarSign, Download, Brain, Globe, ArrowUpRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const lineData = [
  { name: 'Week 1', leads: 120, conversions: 45, revenue: 3200 },
  { name: 'Week 2', leads: 180, conversions: 67, revenue: 4800 },
  { name: 'Week 3', leads: 210, conversions: 82, revenue: 5600 },
  { name: 'Week 4', leads: 290, conversions: 110, revenue: 7200 },
  { name: 'Week 5', leads: 340, conversions: 138, revenue: 8900 },
  { name: 'Week 6', leads: 420, conversions: 165, revenue: 11200 },
];

const regionData = [
  { region: 'North America', leads: 420 },
  { region: 'Europe', leads: 310 },
  { region: 'Asia Pacific', leads: 280 },
  { region: 'Latin America', leads: 140 },
];

const kpis = [
  { label: 'Total Leads', value: '1,847', change: '+24%', icon: Users, glow: 'metric-card-blue' },
  { label: 'Impressions', value: '284K', change: '+18%', icon: Eye, glow: 'metric-card-cyan' },
  { label: 'Revenue Impact', value: '$42.3K', change: '+31%', icon: DollarSign, glow: 'metric-card-indigo' },
  { label: 'Conversion Rate', value: '12.4%', change: '+3.2%', icon: TrendingUp, glow: 'metric-card-purple' },
];

const agentEfficiency = [
  { name: 'Content Writer', efficiency: 92 },
  { name: 'Social Manager', efficiency: 87 },
  { name: 'SEO Optimizer', efficiency: 95 },
  { name: 'Lead Hunter', efficiency: 78 },
  { name: 'Ad Manager', efficiency: 84 },
];

const insights = [
  'LinkedIn posts with questions get 2.4x more engagement',
  'Email open rates peak on Tuesday mornings',
  'Video content drives 3x conversion vs static posts',
  'Retargeting campaigns show 40% lower CPA this month',
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const Analytics = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Analytics & Insights</h1>
            <p className="text-muted-foreground text-sm mt-1">AI-powered performance intelligence</p>
          </div>
          <div className="flex gap-2">
            <button className="h-9 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="h-9 px-4 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <motion.div key={kpi.label} {...fadeUp} transition={{ duration: 0.4, delay: 0.1 * (i + 1) }} className={`glass-card p-5 ${kpi.glow}`}>
              <div className="flex items-start justify-between">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <kpi.icon className="w-4 h-4 text-primary" />
              </div>
              <p className="text-2xl font-display font-bold text-foreground mt-2">{kpi.value}</p>
              <div className="flex items-center gap-1 mt-2 text-xs">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">{kpi.change}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main chart */}
          <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.5 }} className="lg:col-span-2 glass-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4">Performance Overview</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="leads" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="conversions" stroke="#22D3EE" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="revenue" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* AI Strategy Insights */}
          <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.6 }} className="glass-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-neon-purple" />
              AI Strategy Insights
            </h2>
            <div className="space-y-3">
              {insights.map((insight, i) => (
                <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/50 text-sm text-muted-foreground">
                  {insight}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Agent efficiency */}
          <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.7 }} className="glass-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4">Agent Efficiency</h2>
            <div className="space-y-4">
              {agentEfficiency.map((agent) => (
                <div key={agent.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{agent.name}</span>
                    <span className="text-muted-foreground">{agent.efficiency}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full gradient-primary transition-all duration-500" style={{ width: `${agent.efficiency}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Global lead distribution */}
          <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.8 }} className="glass-card p-5">
            <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              Global Lead Distribution
            </h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="region" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="leads" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
