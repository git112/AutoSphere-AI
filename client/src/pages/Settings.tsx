import DashboardLayout from '@/components/layout/DashboardLayout';
import { motion } from 'framer-motion';
import { Linkedin, Chrome, Facebook, Key, Brain, Thermometer, Zap, AlertTriangle, RotateCcw } from 'lucide-react';
import { useState } from 'react';

const integrations = [
  { name: 'LinkedIn', icon: Linkedin, connected: true, color: 'text-blue-400' },
  { name: 'Google Ads', icon: Chrome, connected: true, color: 'text-emerald-400' },
  { name: 'Meta Ads', icon: Facebook, connected: false, color: 'text-muted-foreground' },
];

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

const SettingsPage = () => {
  const [temperature, setTemperature] = useState(0.7);
  const [turbo, setTurbo] = useState(true);
  const [model, setModel] = useState('gpt-4o');

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <motion.div {...fadeUp} transition={{ duration: 0.4 }}>
          <h1 className="text-2xl font-display font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure integrations, APIs, and system behavior</p>
        </motion.div>

        {/* Integrations */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.1 }}>
          <h2 className="font-display font-semibold text-foreground mb-3">Integrations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {integrations.map((int) => (
              <div key={int.name} className="glass-card p-5 flex flex-col items-center gap-3">
                <int.icon className={`w-8 h-8 ${int.color}`} />
                <span className="text-sm font-medium text-foreground">{int.name}</span>
                <button className={`h-8 px-4 rounded-lg text-xs font-medium transition-colors ${int.connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-primary/15 text-primary hover:bg-primary/25'}`}>
                  {int.connected ? 'Connected' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* API Configuration */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }} className="glass-card p-5">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            API Configuration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">API Key</label>
              <input
                type="password"
                defaultValue="sk-xxxxxxxxxxxxxxxxxxxx"
                className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Webhook URL</label>
              <input
                type="text"
                placeholder="https://your-domain.com/webhook"
                className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
              />
            </div>
          </div>
        </motion.div>

        {/* LLM Configuration */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }} className="glass-card p-5">
          <h2 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-neon-purple" />
            LLM Configuration
          </h2>
          <div className="space-y-5">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full h-10 px-4 rounded-xl bg-muted/50 border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 appearance-none cursor-pointer"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                <option value="claude-3.5">Claude 3.5 Sonnet</option>
                <option value="llama-3.1">Llama 3.1 70B</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <label className="text-muted-foreground flex items-center gap-1.5">
                  <Thermometer className="w-3.5 h-3.5" />
                  Temperature
                </label>
                <span className="text-foreground font-mono">{temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-muted accent-primary cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Turbo Mode
              </label>
              <button
                onClick={() => setTurbo(!turbo)}
                className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${turbo ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-primary-foreground transition-transform duration-300 ${turbo ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Danger zone */}
        <motion.div {...fadeUp} transition={{ duration: 0.4, delay: 0.4 }} className="glass-card p-5 border-destructive/30">
          <h2 className="font-display font-semibold text-destructive mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </h2>
          <p className="text-sm text-muted-foreground mb-4">This will reset all agents, configurations, and cached data. This action cannot be undone.</p>
          <button className="h-9 px-5 rounded-xl bg-destructive/15 text-destructive text-sm font-medium border border-destructive/30 hover:bg-destructive/25 transition-colors flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Factory Reset
          </button>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
