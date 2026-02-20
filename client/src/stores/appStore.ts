import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface AppState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  systemOperational: boolean;
  toggleSystem: () => void;
  theme: Theme;
  toggleTheme: () => void;
}

const savedTheme = (localStorage.getItem('autosphere-theme') as Theme) ?? 'dark';

export const useAppStore = create<AppState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  systemOperational: true,
  toggleSystem: () => set((s) => ({ systemOperational: !s.systemOperational })),
  theme: savedTheme,
  toggleTheme: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('autosphere-theme', next);
      return { theme: next };
    }),
}));
