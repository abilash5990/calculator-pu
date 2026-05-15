import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Menu,
  X,
  Bell,
  Search,
  Settings as SettingsIcon,
  Loader2,
  TrendingUp,
  RefreshCw,
  Cloud,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ThemeToggle from "./components/ThemeToggle";
import CommandPalette from "./components/CommandPalette";
import NotificationPanel from "./components/NotificationPanel";
import { APP_MODULES, TabId } from "./registry";
import { registerTabNavigation } from "./tabNav";
import { readLocalSettings, syncNow } from "./lib/settingsApi";
import type { CommandAction } from "./lib/commands";
import type { DashboardNotification, DashboardPayload } from "./lib/dashboardTypes";
import { AI_PROMPT_KEY } from "./lib/dashboardTypes";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function greetingForHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatRelativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "never";
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userName, setUserName] = useState("Finance Hub User");
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [dashMeta, setDashMeta] = useState<Pick<DashboardPayload, "financialYear" | "lastSheetsReadAt" | "refreshedAt"> | null>(null);

  useEffect(() => {
    registerTabNavigation(setActiveTab);
  }, []);

  useEffect(() => {
    const local = readLocalSettings();
    if (local.profile.userName) setUserName(local.profile.userName);
  }, [activeTab]);

  const loadNotifications = useCallback(async () => {
    try {
      const r = await fetch("/api/dashboard");
      const j = (await r.json()) as DashboardPayload;
      setNotifications(j.notifications ?? []);
      setDashMeta({
        financialYear: j.financialYear,
        lastSheetsReadAt: j.lastSheetsReadAt,
        refreshedAt: j.refreshedAt,
      });
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications, activeTab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleCommand = useCallback(
    async (action: CommandAction) => {
      if (action.type === "navigate") {
        setActiveTab(action.tab);
      } else if (action.type === "sync") {
        try {
          await syncNow();
          await loadNotifications();
        } catch {
          /* ignore */
        }
      } else if (action.type === "ai-prompt") {
        sessionStorage.setItem(AI_PROMPT_KEY, action.prompt);
        setActiveTab("ai-assistant");
      }
    },
    [loadNotifications],
  );

  const activeModule = APP_MODULES.find((m) => m.id === activeTab) || APP_MODULES[0];
  const firstName = userName.split(" ")[0] || userName;

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
        <motion.div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

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
                <span className="font-bold text-xl tracking-tight">
                  Finance<span className="text-blue-500">Hub</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {APP_MODULES.filter((m) => m.id !== "settings").map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabId)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative",
                activeTab === item.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "hover:bg-white/5 text-slate-400 hover:text-slate-100",
              )}
            >
              <item.icon
                size={22}
                className={cn(
                  "transition-transform duration-300 group-hover:scale-110",
                  activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-blue-400",
                )}
              />
              {isSidebarOpen && <span className="font-medium">{item.label}</span>}
              {activeTab === item.id && <motion.div layoutId="active-pill" className="absolute right-2 w-1.5 h-6 bg-white rounded-full" />}
            </button>
          ))}
        </nav>

        {isSidebarOpen && dashMeta && (
          <div className="px-4 pb-2">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 text-xs text-slate-500">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
                <Cloud size={12} /> Storage synced
              </div>
              Last sync: {dashMeta.lastSheetsReadAt ? formatRelativeTime(dashMeta.lastSheetsReadAt) : "never"}
            </div>
          </div>
        )}

        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group",
              activeTab === "settings"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                : "hover:bg-white/5 text-slate-400 hover:text-slate-100",
            )}
          >
            <SettingsIcon size={22} className={cn(activeTab === "settings" ? "text-white" : "text-slate-400")} />
            {isSidebarOpen && <span className="font-medium">Settings</span>}
          </button>
        </div>
      </motion.aside>

      <main className="flex-1 relative overflow-y-auto z-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between p-6 md:p-8 sticky top-0 z-40 glass border-b border-white/5 backdrop-blur-xl">
          <div>
            {activeTab === "dashboard" ? (
              <>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-1">
                  {greetingForHour()}, {firstName} 👋
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Here is your financial overview for today.
                  {dashMeta && (
                    <span className="ml-2 text-slate-600">
                      FY {dashMeta.financialYear} · Last sync{" "}
                      {dashMeta.lastSheetsReadAt ? formatRelativeTime(dashMeta.lastSheetsReadAt) : "never"}
                    </span>
                  )}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-4xl font-bold tracking-tight mb-1">{activeModule.label}</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">{activeModule.description}</p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 md:gap-4">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="flex flex-1 min-w-0 md:min-w-[280px] md:max-w-md items-center gap-3 px-4 py-2.5 bg-white/8 dark:bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition text-left"
            >
              <Search size={18} className="text-slate-500 shrink-0" />
              <span className="text-sm text-slate-500 flex-1">Search commands…</span>
              <kbd className="hidden sm:inline text-[10px] text-slate-500 border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <button
                type="button"
                onClick={() => void loadNotifications()}
                className="h-10 w-10 inline-flex items-center justify-center glass rounded-xl border border-white/10 hover:bg-white/5 transition-colors"
                title="Refresh"
                aria-label="Refresh"
              >
                <RefreshCw size={18} />
              </button>
              <button
                type="button"
                onClick={() => setNotifOpen(true)}
                className="h-10 w-10 inline-flex items-center justify-center glass rounded-xl border border-white/10 hover:bg-white/5 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={18} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 bg-blue-500 rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                    {notifications.length > 9 ? "9+" : notifications.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 glass rounded-xl border border-white/10 hover:bg-white/5 transition-all group"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-bold leading-none">{userName}</div>
                  <div className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-0.5">Pro Member</div>
                </div>
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-[2px]">
                  <motion.div className="w-full h-full rounded-[6px] bg-background flex items-center justify-center text-sm font-bold text-blue-500 group-hover:text-white transition-colors">
                    {userName.charAt(0)}
                  </motion.div>
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
              className={cn("grid gap-6", activeModule.isFullWidth ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-3")}
            >
              <Suspense
                fallback={
                  <div className="col-span-full h-[400px] flex flex-col items-center justify-center gap-4">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading module…</p>
                  </div>
                }
              >
                <activeModule.component />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onAction={handleCommand} />
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications} />
    </div>
  );
}
