import React, { useState, useEffect, Suspense } from "react";
import { 
  Menu, 
  X, 
  Bell, 
  Search, 
  Settings as SettingsIcon,
  ChevronRight,
  Loader2,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ThemeToggle from "./components/ThemeToggle";
import { APP_MODULES, TabId } from "./registry";
import { registerTabNavigation } from "./tabNav";

/**
 * Utility function to merge Tailwind classes safely.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState("Finance Hub User");

  useEffect(() => {
    registerTabNavigation(setActiveTab);
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem("finance_hub_settings");
    if (savedSettings) {
      try {
        const { name } = JSON.parse(savedSettings);
        if (name) setUserName(name);
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    }
  }, [activeTab]);

  const activeModule = APP_MODULES.find(m => m.id === activeTab) || APP_MODULES[0];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans relative">
      {/* Futuristic Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="relative z-50 glass border-r border-white/10 flex flex-col transition-all duration-300"
      >
        <div className="p-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            {isSidebarOpen && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <TrendingUp size={24} className="text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight">Finance<span className="text-blue-500">Hub</span></span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {APP_MODULES.filter(m => m.id !== 'settings').map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabId)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative",
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "hover:bg-white/5 text-slate-400 hover:text-slate-100"
              )}
            >
              <item.icon size={22} className={cn(
                "transition-transform duration-300 group-hover:scale-110",
                activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-blue-400"
              )} />
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-medium"
                >
                  {item.label}
                </motion.span>
              )}
              {activeTab === item.id && (
                <motion.div
                  layoutId="active-pill"
                  className="absolute right-2 w-1.5 h-6 bg-white rounded-full"
                />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group",
              activeTab === "settings"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "hover:bg-white/5 text-slate-400 hover:text-slate-100"
            )}
          >
            <SettingsIcon size={22} className={cn(
              "transition-transform duration-300 group-hover:rotate-90",
              activeTab === "settings" ? "text-white" : "text-slate-400"
            )} />
            {isSidebarOpen && <span className="font-medium">Settings</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 relative overflow-y-auto z-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-6 md:p-8 sticky top-0 z-40 glass border-b border-white/5 backdrop-blur-xl">
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-1">{activeModule.label}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{activeModule.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <div className="flex flex-1 min-w-0 md:min-w-[280px] md:max-w-md items-center gap-3 px-4 py-2.5 bg-white/8 dark:bg-white/5 rounded-xl border border-white/10">
              <Search size={18} className="text-slate-500 shrink-0" />
              <input
                type="text"
                placeholder="Search analytics..."
                className="bg-transparent border-none focus:ring-0 text-sm w-full min-w-0 placeholder:text-slate-500"
              />
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="h-10 w-10 inline-flex items-center justify-center glass rounded-xl border border-white/10 hover:bg-white/5 transition-colors active:scale-[0.98]"
                title="Refresh App"
                aria-label="Refresh App"
              >
                <RefreshCw size={18} />
              </button>
              <button
                type="button"
                className="h-10 w-10 inline-flex items-center justify-center glass rounded-xl border border-white/10 hover:bg-white/5 transition-colors relative active:scale-[0.98]"
                aria-label="Notifications"
              >
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full ring-2 ring-[var(--glass-bg)]" />
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab("settings")}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 glass rounded-xl border border-white/10 hover:bg-white/5 transition-all group active:scale-[0.98]"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold leading-none">{userName}</div>
                  <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Pro Member</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                  <div className="w-full h-full rounded-[6px] bg-background flex items-center justify-center text-sm font-bold text-blue-500 group-hover:bg-transparent group-hover:text-white transition-all">
                    {userName.charAt(0)}
                  </div>
                </div>
              </button>
            </div>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
              className={cn(
                "grid gap-6",
                activeModule.isFullWidth ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3"
              )}
            >
              <Suspense fallback={
                <div className="col-span-full h-[400px] flex flex-col items-center justify-center gap-4">
                  <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                  <p className="text-gray-500 font-medium">Loading futuristic module...</p>
                </div>
              }>
                <activeModule.component />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
