import { useAppStore } from '@/stores/appStore';
import { useAuthStore } from '@/stores/authStore';
import { Menu, Bell, Search, Zap, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Topbar = () => {
  const { toggleSidebar, systemOperational } = useAppStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <header className="h-16 border-b border-border bg-card/40 backdrop-blur-xl flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search modules, agents, content..."
            className="w-64 lg:w-80 h-9 pl-9 pr-4 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${systemOperational ? 'bg-emerald-500/10 text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
          <Zap className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{systemOperational ? 'System Online' : 'System Offline'}</span>
        </div>

        <button className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
        </button>

        <button
          onClick={handleLogout}
          title="Sign out"
          className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>

        <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground">
          {initials}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
