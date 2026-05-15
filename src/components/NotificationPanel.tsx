import { AnimatePresence, motion } from "motion/react";
import { Bell, X } from "lucide-react";
import type { DashboardNotification } from "../lib/dashboardTypes";

function formatRelativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

const dot: Record<DashboardNotification["type"], string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

type Props = { open: boolean; onClose: () => void; notifications: DashboardNotification[] };

export default function NotificationPanel({ open, onClose, notifications }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90]"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            className="fixed top-0 right-0 z-[95] h-full w-full max-w-sm glass-card-primary border-l border-white/10 flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-blue-400" />
                <h3 className="font-semibold">Notifications</h3>
              </div>
              <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">You&apos;re all caught up.</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 flex gap-3">
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot[n.type]}`} />
                    <div>
                      <div className="text-sm font-medium">{n.title}</div>
                      <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                      <div className="text-[11px] text-slate-600 mt-2">{formatRelativeTime(n.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
