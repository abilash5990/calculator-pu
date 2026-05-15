import { useEffect, useMemo, useRef, useState } from "react";
import { Command, Search, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { filterCommands, type CommandAction } from "../lib/commands";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Props = {
  open: boolean;
  onClose: () => void;
  onAction: (action: CommandAction) => void;
};

export default function CommandPalette({ open, onClose, onAction }: Props) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const items = useMemo(() => filterCommands(query), [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && items[activeIndex]) {
        e.preventDefault();
        onAction(items[activeIndex].action);
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, activeIndex, onAction, onClose]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    }
    return [...map.entries()];
  }, [items]);

  let flatIndex = -1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full max-w-xl glass-card-primary rounded-2xl border border-white/15 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search size={18} className="text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands… show loans, sync sheets"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-slate-500"
              />
              <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-white/10" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-6">No commands found.</p>
              ) : (
                grouped.map(([group, groupItems]) => (
                  <div key={group} className="mb-2">
                    <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{group}</div>
                    {groupItems.map((item) => {
                      flatIndex += 1;
                      const idx = flatIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onAction(item.action);
                            onClose();
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left",
                            idx === activeIndex ? "bg-blue-600/20 border border-blue-500/30" : "hover:bg-white/5",
                          )}
                        >
                          <Command size={14} className="text-blue-400" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 border-t border-white/10 text-[11px] text-slate-500">
              ⌘K to open · ↑↓ navigate · ↵ select
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
