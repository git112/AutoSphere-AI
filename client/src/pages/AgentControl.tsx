import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/appStore';
import { Bot, Power, Plus, Terminal, Activity, Zap, Hash } from 'lucide-react';
import { useState } from 'react';

const agents = [
  { id: 'ag-001', name: 'Content Writer', uuid: 'CW-7F3A', active: true, tasksCompleted: 142, successRate: '94%', lastAction: 'Generated blog draft' },
  { id: 'ag-002', name: 'Social Manager', uuid: 'SM-2B1C', active: true, tasksCompleted: 89, successRate: '91%', lastAction: 'Scheduled 3 posts' },
  { id: 'ag-003', name: 'SEO Optimizer', uuid: 'SO-9D4E', active: true, tasksCompleted: 67, successRate: '97%', lastAction: 'Analyzed 12 pages' },
  { id: 'ag-004', name: 'Lead Hunter', uuid: 'LH-5K8F', active: true, tasksCompleted: 213, successRate: '82%', lastAction: 'Found 7 prospects' },
  { id: 'ag-005', name: 'Ad Manager', uuid: 'AM-1G6H', active: false, tasksCompleted: 54, successRate: '88%', lastAction: 'Paused campaign' },
  { id: 'ag-006', name: 'Email Outreach', uuid: 'EO-3J2K', active: true, tasksCompleted: 178, successRate: '86%', lastAction: 'Sent follow-ups' },
];

const logs = [
  { time: '14:32:01', msg: '[CW-7F3A] Task completed: blog_draft_gen → 200 OK', type: 'success' },
  { time: '14:31:45', msg: '[SM-2B1C] Scheduling 3 posts to LinkedIn queue...', type: 'info' },
  { time: '14:31:12', msg: '[LH-5K8F] Prospect scan complete: 7 new leads added', type: 'success' },
  { time: '14:30:58', msg: '[AM-1G6H] Campaign paused: budget threshold reached', type: 'warning' },
  { time: '14:30:22', msg: '[SO-9D4E] SEO audit started for domain pages', type: 'info' },
  { time: '14:29:55', msg: '[EO-3J2K] Email sequence triggered: batch_47', type: 'info' },
];

const logColors: Record<string, string> = {
  success: 'text-emerald-400',
  info: 'text-primary',
  warning: 'text-amber-400',
};

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const AgentControl = () => {
  const { systemOperational, toggleSystem } = useAppStore();
  const [agentStates, setAgentStates] = useState<Record<string, boolean>>(
    Object.fromEntries(agents.map(a => [a.id, a.active]))
  );

  const toggleAgent = (id: string) => {
    setAgentStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div {...fadeUp} transition={{ duration: 0.4 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Agent Control Panel</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage autonomous agents & deployments</p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Global toggle */}
            <button
              onClick={toggleSystem}
              className={`h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-2 transition-all duration-300 ${systemOperational ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-destructive/15 text-destructive border border-destructive/30'}`}
            >
              <Power className="w-4 h-4" />
              {systemOperational ? 'System ON' : 'System OFF'}
            </button>
            <button className="h-10 px-5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all duration-300 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Deploy Agent
            </button>
          </div>
        </motion.div>

        {/* Agent Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              {...fadeUp}
              transition={{ duration: 0.4, delay: 0.05 * (i + 1) }}
              className="glass-card p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{agent.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{agent.uuid}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleAgent(agent.id)}
                  className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${agentStates[agent.id] ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground transition-transform duration-300 ${agentStates[agent.id] ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Tasks</span>
                  <p className="font-semibold text-foreground">{agent.tasksCompleted}</p>
                </div>
                <div className="p-2 rounded-lg bg-muted/30">
                  <span className="text-muted-foreground">Success</span>
                  <p className="font-semibold text-foreground">{agent.successRate}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3 truncate">Last: {agent.lastAction}</p>
            </motion.div>
          ))}

          {/* Add custom agent */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.4, delay: 0.4 }}
            className="border-2 border-dashed border-border/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/30 transition-colors cursor-pointer min-h-[180px]"
          >
            <div className="w-12 h-12 rounded-xl border border-border flex items-center justify-center">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Add Custom Agent</p>
          </motion.div>
        </div>

        {/* Activity Log */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.5 }} className="glass-card p-5">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary" />
            Activity Log
          </h2>
          <div className="bg-background/60 rounded-xl p-4 font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3">
                <span className="text-muted-foreground flex-shrink-0">{log.time}</span>
                <span className={logColors[log.type]}>{log.msg}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default AgentControl;
