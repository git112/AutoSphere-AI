import { useAppStore } from '@/stores/appStore';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { motion } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { sidebarOpen } = useAppStore();

  return (
    <div className="min-h-screen space-bg">
      <Sidebar />
      <motion.div
        initial={false}
        animate={{ marginLeft: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="min-h-screen flex flex-col max-lg:!ml-0"
      >
        <Topbar />
        <main className="flex-1 p-4 lg:p-6 nebula-glow relative">
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </motion.div>
    </div>
  );
};

export default DashboardLayout;
