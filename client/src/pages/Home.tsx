import { motion, AnimatePresence } from 'framer-motion';
import { Orbit, Zap, Bot, BarChart3, Calendar, Shield, ArrowRight, Sparkles, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';

const features = [
  {
    icon: Bot,
    title: 'Autonomous Agents',
    description: 'Deploy AI agents that handle content creation, social posting, and lead generation 24/7.',
  },
  {
    icon: BarChart3,
    title: 'Deep Analytics',
    description: 'Real-time insights into engagement, growth trajectory, and campaign performance.',
  },
  {
    icon: Calendar,
    title: 'Smart Scheduling',
    description: 'AI-powered scheduling that finds the optimal time for maximum audience reach.',
  },
  {
    icon: Shield,
    title: 'Full Control',
    description: 'Override, pause, or fine-tune any agent action from a single command center.',
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
};

const Home = () => {
  const { theme, toggleTheme } = useAppStore();

  return (
    <div className="min-h-screen space-bg nebula-glow relative overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-20 left-1/3 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-40 right-1/4 w-96 h-96 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-20 flex items-center justify-between px-6 lg:px-16 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center neon-glow">
            <Orbit className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-display font-bold gradient-text">AutoSphere</span>
        </Link>
        <div className="flex items-center gap-3">
          {/* Theme toggle */}
          <motion.button
            onClick={toggleTheme}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            aria-label="Toggle theme"
            className="w-9 h-9 rounded-xl border border-border bg-card/70 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-card transition-all duration-200"
          >
            <AnimatePresence mode="wait" initial={false}>
              {theme === 'dark' ? (
                <motion.span key="sun" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }} transition={{ duration: 0.2 }}>
                  <Sun className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} transition={{ duration: 0.2 }}>
                  <Moon className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          <Link
            to="/login"
            className="h-9 px-5 rounded-xl border border-border text-sm text-foreground hover:bg-muted/40 transition-colors flex items-center"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="h-9 px-5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all flex items-center"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-24 lg:pt-28 lg:pb-32">
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary mb-6"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Autonomous Business Growth Agent
        </motion.div>

        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl lg:text-6xl font-display font-bold leading-tight max-w-3xl"
        >
          Grow Your Business on{' '}
          <span className="gradient-text">Autopilot</span>
        </motion.h1>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
        >
          AutoSphere deploys intelligent AI agents that create content, manage socials, optimize ads, and generate leads — while you focus on strategy.
        </motion.p>

        <motion.div
          {...fadeUp}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-col sm:flex-row gap-3"
        >
          <Link
            to="/signup"
            className="h-12 px-8 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="h-12 px-8 rounded-xl border border-border text-foreground text-sm hover:bg-muted/40 transition-colors flex items-center justify-center gap-2"
          >
            Sign In
          </Link>
        </motion.div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-6 lg:px-16 pb-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
            Everything You Need to <span className="gradient-text">Scale</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto text-sm">
            A unified command center for your autonomous business growth stack.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="glass-card p-6 hover:border-primary/30 transition-colors group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:neon-glow transition-shadow">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-6 lg:px-16 pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card-glow p-10 sm:p-14 text-center max-w-3xl mx-auto"
        >
          <Zap className="w-8 h-8 text-primary mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-3">
            Ready to Automate Growth?
          </h2>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Join forward-thinking businesses using AutoSphere to run autonomous marketing, content, and lead-gen at scale.
          </p>
          <Link
            to="/signup"
            className="inline-flex h-12 px-8 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-all items-center gap-2"
          >
            Get Started Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 px-6 lg:px-16 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>© 2026 AutoSphere. All rights reserved.</span>
        <div className="flex gap-5">
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <a href="#" className="hover:text-foreground transition-colors">Contact</a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
