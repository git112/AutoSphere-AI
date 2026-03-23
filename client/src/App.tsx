import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Content from "./pages/Content";
import Scheduler from "./pages/Scheduler";
import Analytics from "./pages/Analytics";
import AgentControl from "./pages/AgentControl";
import Settings from "./pages/Settings";
import SeoOptimizer from "./pages/SeoOptimizer";
import NotFound from "./pages/NotFound";
import { useAuthStore } from "./stores/authStore";
import { useAppStore } from "./stores/appStore";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

// ── Theme sync: applies/removes `dark` class on <html> whenever theme changes ──
const ThemeSync = () => {
  const { theme } = useAppStore();
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
  return null;
};

// Bootstrap: apply saved theme immediately before first render to avoid flash
(() => {
  const saved = localStorage.getItem('autosphere-theme') ?? 'dark';
  if (saved === 'dark') document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
})();


// ── Auth initializer: restores session from localStorage on app mount ─────────
const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
  const { initializeAuth, isInitialized } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen space-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
};

// ── Protected route: redirects to /login if not authenticated ─────────────────
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { accessToken } = useAuthStore();
  const location = useLocation();

  if (!accessToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeSync />
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthInitializer>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/home" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute><Content /></ProtectedRoute>} />
            <Route path="/scheduler" element={<ProtectedRoute><Scheduler /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/agents" element={<ProtectedRoute><AgentControl /></ProtectedRoute>} />
            <Route path="/seo-optimizer" element={<ProtectedRoute><SeoOptimizer /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthInitializer>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

