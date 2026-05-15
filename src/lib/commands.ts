import type { TabId } from "../registry";

export type CommandAction =
  | { type: "navigate"; tab: TabId }
  | { type: "sync" }
  | { type: "ai-prompt"; prompt: string };

export type CommandItem = {
  id: string;
  label: string;
  keywords: string;
  group: string;
  action: CommandAction;
};

export const COMMAND_ITEMS: CommandItem[] = [
  { id: "dash", label: "Open Dashboard", keywords: "home overview", group: "Navigation", action: { type: "navigate", tab: "dashboard" } },
  { id: "loans", label: "Show my loan records", keywords: "loan emi", group: "Navigation", action: { type: "navigate", tab: "loans" } },
  { id: "tax", label: "Calculate tax", keywords: "it filing tax", group: "Navigation", action: { type: "navigate", tab: "it-filing" } },
  { id: "plot", label: "Open plot valuation", keywords: "plot land", group: "Navigation", action: { type: "navigate", tab: "plot-calc" } },
  { id: "jewel", label: "Open jewel loan", keywords: "gold jewel", group: "Navigation", action: { type: "navigate", tab: "jewel-loan" } },
  { id: "reports", label: "Generate report", keywords: "pdf export report", group: "Navigation", action: { type: "navigate", tab: "reports" } },
  { id: "ai", label: "Ask AI assistant", keywords: "ai insight", group: "Navigation", action: { type: "navigate", tab: "ai-assistant" } },
  { id: "settings", label: "Open settings", keywords: "preferences configure", group: "Navigation", action: { type: "navigate", tab: "settings" } },
  { id: "sync", label: "Sync Google Sheets", keywords: "sync refresh sheets", group: "Actions", action: { type: "sync" } },
  { id: "ai-sum", label: "Summarize financial status", keywords: "summary status", group: "AI", action: { type: "ai-prompt", prompt: "Summarize my financial status in 2-3 sentences." } },
  { id: "ai-tax", label: "Suggest tax-saving ideas", keywords: "tax saving", group: "AI", action: { type: "ai-prompt", prompt: "Suggest 3 practical tax-saving ideas for an Indian user." } },
  { id: "ai-loan", label: "Explain loan risk", keywords: "loan risk emi", group: "AI", action: { type: "ai-prompt", prompt: "Explain my loan risk exposure briefly." } },
];

export function filterCommands(query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return COMMAND_ITEMS;
  return COMMAND_ITEMS.filter(
    (c) => c.label.toLowerCase().includes(q) || c.keywords.toLowerCase().includes(q),
  );
}
