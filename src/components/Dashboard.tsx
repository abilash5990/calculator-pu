import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  Calculator,
  LandPlot,
  RefreshCw,
  Gem,
  FileSpreadsheet,
  AlertCircle,
  Send,
  PlusCircle,
  SlidersHorizontal,
  Sparkles,
  Bot,
  Activity,
  Wallet,
  PiggyBank,
  Cloud,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr } from "../lib/formatCurrency";
import { goToTab } from "../tabNav";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  type AppSettings,
  type SettingsStatus,
  defaultAppSettings,
  fetchSettings,
  syncNow,
} from "../lib/settingsApi";
import type { ActivityKind, ChartRange, DashboardPayload } from "../lib/dashboardTypes";
import { AI_PROMPT_KEY } from "../lib/dashboardTypes";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function formatRelativeTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) {
    const d = new Date(t);
    return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  }
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

function StatusChip({
  label,
  variant,
}: {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral" | "info";
}) {
  const styles: Record<typeof variant, string> = {
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    danger: "bg-red-500/15 text-red-300 border-red-500/30",
    neutral: "bg-white/5 text-slate-400 border-white/10",
    info: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", styles[variant])}>
      {label}
    </span>
  );
}

function activityIcon(kind: ActivityKind) {
  if (kind === "loan") return { Icon: TrendingUp, className: "text-blue-400" };
  if (kind === "it") return { Icon: FileSpreadsheet, className: "text-emerald-400" };
  if (kind === "jewel") return { Icon: Gem, className: "text-amber-400" };
  if (kind === "plot") return { Icon: LandPlot, className: "text-purple-400" };
  return { Icon: Cloud, className: "text-sky-400" };
}

const PIE_COLORS = ["#8b5cf6", "#f59e0b", "#3b82f6"];

export default function Dashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>("7d");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [controlSettings, setControlSettings] = useState<AppSettings>(defaultAppSettings());
  const [settingsStatus, setSettingsStatus] = useState<SettingsStatus>({
    googleSheetsStatus: "not_connected",
    telegramStatus: "not_connected",
    lastSheetsReadAt: null,
    sheetsError: null,
  });
  const [controlError, setControlError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/dashboard");
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to load dashboard");
      setData(j as DashboardPayload);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadControlCenter = useCallback(async () => {
    const res = await fetchSettings();
    setControlSettings(res.settings);
    setSettingsStatus(res.status);
    setControlError(res.ok ? null : res.error ?? res.message);
  }, []);

  useEffect(() => {
    void loadControlCenter();
  }, [loadControlCenter]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const series = chartRange === "7d" ? data.chartSeries : data.chartSeries30d;
    return series.map((c) => ({
      name: new Date(c.day + "T12:00:00").toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      count: c.count,
    }));
  }, [data, chartRange]);

  const chartHasActivity = chartData.some((d) => d.count > 0);

  const sheetsChip = useMemo(() => {
    if (!data) return { label: "…", variant: "neutral" as const };
    if (data.googleSheetsStatus === "not_configured") return { label: "Sheets not connected", variant: "warning" as const };
    if (data.googleSheetsStatus === "error") return { label: "Sheets error", variant: "danger" as const };
    return { label: "Synced", variant: "success" as const };
  }, [data]);

  const telegramChip = useMemo(() => {
    if (!data) return { label: "…", variant: "neutral" as const };
    return data.telegramStatus === "connected"
      ? { label: "Bot connected", variant: "success" as const }
      : { label: "Not connected", variant: "warning" as const };
  }, [data]);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    setControlError(null);
    try {
      await syncNow();
      await Promise.all([load(), loadControlCenter()]);
    } catch (e: unknown) {
      setControlError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [load, loadControlCenter]);

  const runAi = useCallback(
    async (prompt: string) => {
      if (!data) return;
      setAiLoading(true);
      const fallback = data.insights.join(" ") || data.health.suggestion;
      try {
        const res = await fetch("/api/ai/insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            context: { kpis: data.kpis, health: data.health, insights: data.insights },
            fallback,
          }),
        });
        const j = await res.json();
        setAiText(String(j.text ?? fallback));
      } catch {
        setAiText(fallback);
      } finally {
        setAiLoading(false);
      }
    },
    [data],
  );

  if (loading && !data) {
    return (
      <div className="contents">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card-primary rounded-3xl p-8 min-h-[320px] animate-pulse">
            <div className="h-8 bg-white/10 rounded w-1/3 mb-8" />
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="col-span-full glass-card-primary rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-300">{error}</p>
        <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold">
          <RefreshCw size={18} /> Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const k = data.kpis;

  const quickActions: (
    | { label: string; kind: "navigate"; tab: Parameters<typeof goToTab>[0] }
    | { label: string; kind: "sync" }
  )[] = [
    { label: "Add Loan", kind: "navigate", tab: "loans" },
    { label: "Add IT Filing", kind: "navigate", tab: "it-filing" },
    { label: "Add Plot", kind: "navigate", tab: "plot-calc" },
    { label: "Generate Report", kind: "navigate", tab: "reports" },
    { label: "Sync Sheets", kind: "sync" },
    { label: "Ask AI", kind: "navigate", tab: "ai-assistant" },
  ];

  return (
    <>
      <div className="lg:col-span-2 space-y-6">
        {/* Health + KPI row */}
        <section className="glass-card-primary rounded-3xl p-5 md:p-6 border border-white/[0.12]">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-semibold">Financial Overview</h3>
              <p className="text-sm text-slate-400 mt-1">
                FY {data.financialYear} · Refreshed {formatRelativeTime(data.refreshedAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void load()} className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10" aria-label="Refresh">
                <RefreshCw size={18} className={cn(loading && "animate-spin")} />
              </button>
              <StatusChip label={sheetsChip.label} variant={sheetsChip.variant} />
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full border-4 border-blue-500/40 flex items-center justify-center text-xl font-bold text-blue-300">
                {data.health.score}
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Financial Health</div>
                <div className="font-semibold">{data.health.status} · Risk {data.health.risk}</div>
              </div>
            </div>
            <p className="text-sm text-slate-400 flex-1 min-w-[180px]">{data.health.suggestion}</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Total Assets", value: formatInr(k.totalAssets, { compactLakh: true }), icon: Wallet },
              { label: "Total Loans", value: formatInr(k.totalLoanPrincipal, { compactLakh: true }), icon: TrendingUp },
              { label: "Tax Estimate/mo", value: k.monthlyTaxEstimate != null ? formatInr(k.monthlyTaxEstimate) : "—", icon: PiggyBank },
              { label: "Net Position", value: formatInr(k.netPosition, { compactLakh: true }), icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase font-semibold">
                  <Icon size={12} /> {label}
                </div>
                <div className="text-xl font-bold tabular-nums mt-1">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <span className="text-slate-500 text-xs">Active loans</span>
              <div className="font-bold text-lg">{k.activeLoanCases}</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <span className="text-slate-500 text-xs">Pending EMI/mo</span>
              <div className="font-bold text-lg">{formatInr(k.pendingMonthlyEmi, { compactLakh: true })}</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <span className="text-slate-500 text-xs">Plot value</span>
              <div className="font-bold text-lg">{formatInr(k.totalPlotInvestment, { compactLakh: true })}</div>
            </div>
            <div className="rounded-xl bg-white/[0.03] p-3 border border-white/5">
              <span className="text-slate-500 text-xs">This month</span>
              <div className="font-bold text-lg">{k.monthActivityCount} updates</div>
            </div>
          </div>
        </section>

        {/* Quick actions */}
        <section className="glass-card-secondary rounded-3xl p-4 border border-white/10">
          <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => (a.kind === "sync" ? void handleSyncNow() : goToTab(a.tab))}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-blue-600/20 hover:border-blue-500/30 text-sm font-medium transition"
              >
                <PlusCircle size={14} className="text-blue-400" />
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {/* Charts */}
        <section className="glass-card-primary rounded-3xl p-5 md:p-6 border border-white/[0.12]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="font-semibold">Financial Trend</h4>
            <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
              {(["7d", "30d"] as ChartRange[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setChartRange(r)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-semibold transition",
                    chartRange === r ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200",
                  )}
                >
                  {r === "7d" ? "7 Days" : "30 Days"}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 h-[200px]">
              {!chartHasActivity ? (
                <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 text-center px-4">
                  <TrendingUp className="w-10 h-10 text-slate-500 mb-2 opacity-60" />
                  <p className="text-sm text-slate-400">No activity yet</p>
                  <p className="text-xs text-slate-500 mt-1">Start by adding your first loan, IT filing, or plot record.</p>
                  <button type="button" onClick={() => goToTab("loans")} className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
                    Add Record
                  </button>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="dashActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis width={28} tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
                    <Area type="monotone" dataKey="count" name="Records" stroke="#3b82f6" strokeWidth={2} fill="url(#dashActivity)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="h-[200px]">
              {data.assetBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500 border border-dashed border-white/10 rounded-2xl">
                  Asset breakdown appears when you add plot or jewel data.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={data.assetBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                      {data.assetBreakdown.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatInr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <p className="text-[11px] text-slate-500 text-center mt-1">Asset distribution</p>
            </div>
          </div>
        </section>

        {/* AI Insights */}
        <section className="glass-card-secondary rounded-3xl p-5 border border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-blue-400" />
            <h4 className="font-semibold">AI Insight</h4>
          </div>
          <ul className="space-y-1.5 mb-4">
            {data.insights.length === 0 ? (
              <li className="text-sm text-slate-500">Add records to unlock personalized insights.</li>
            ) : (
              data.insights.map((line, i) => (
                <li key={i} className="text-sm text-slate-300 flex gap-2">
                  <span className="text-blue-400">•</span> {line}
                </li>
              ))
            )}
          </ul>
          {aiText && <p className="text-sm text-slate-200 mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/8">{aiText}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={aiLoading}
              onClick={() => void runAi("Summarize my financial status in 2-3 sentences.")}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-60"
            >
              {aiLoading ? "Thinking…" : "Ask AI"}
            </button>
            <button type="button" onClick={() => goToTab("reports")} className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10">
              Generate Report
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem(AI_PROMPT_KEY, "Give me a monthly finance report with bullet points.");
                goToTab("ai-assistant");
              }}
              className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 inline-flex items-center gap-1"
            >
              <Bot size={14} /> Full Assistant
            </button>
          </div>
        </section>

        {/* Bottom cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card-secondary rounded-3xl p-5 border border-white/10">
            <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Calculator size={18} className="text-blue-500" /> Quick Calculator
            </h4>
            <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.03]">
              <span className="text-xs text-slate-500 uppercase font-bold">Est. annual tax</span>
              <div className="text-2xl font-bold font-mono mt-1">
                {k.estimatedTaxFromLatestIT != null ? formatInr(k.estimatedTaxFromLatestIT) : "—"}
              </div>
            </div>
          </div>
          <div className="glass-card-secondary rounded-3xl p-5 border border-white/10">
            <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
              <LandPlot size={18} className="text-purple-400" /> Plot Valuation
            </h4>
            <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.03]">
              <span className="text-xs text-slate-500 uppercase font-bold">Latest rate / sqft</span>
              <div className="text-2xl font-bold font-mono mt-1">
                {k.plotRatePerSqft != null ? `${formatInr(k.plotRatePerSqft)} / sqft` : "—"}
              </div>
            </div>
          </div>
          <div className="glass-card-secondary rounded-3xl p-5 border border-white/10 bg-blue-500/[0.06]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <Send size={18} className="text-sky-400" /> Telegram
              </h4>
              <StatusChip label={telegramChip.label} variant={telegramChip.variant} />
            </div>
            <p className="text-sm text-slate-400 mb-4">Connect your bot for alerts.</p>
            <button type="button" onClick={() => goToTab("settings")} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold">
              Configure Bot
            </button>
          </div>
        </div>

        <section className="glass-card-tertiary rounded-3xl p-5 md:p-6 border border-white/8">
          <h4 className="text-lg font-semibold mb-4">Recent records</h4>
          {data.recentRecords.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-500">No saved records yet.</p>
              <p className="text-xs text-slate-600 mt-1">Start by adding your first loan, IT filing, or plot record.</p>
              <button type="button" onClick={() => goToTab("loans")} className="mt-3 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold">
                Add Record
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 uppercase tracking-widest text-[11px]">
                    <th className="pb-3 pr-4">Source</th>
                    <th className="pb-3 pr-4">Summary</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRecords.map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="py-3 pr-4 font-medium text-slate-300">{row.source}</td>
                      <td className="py-3 pr-4 text-slate-200">{row.label}</td>
                      <td className="py-3 pr-4 font-mono">{row.amountLabel}</td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">{formatRelativeTime(row.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <div className="glass-card-tertiary rounded-3xl p-5 md:p-6 border border-white/8">
          <h4 className="text-lg font-semibold mb-6">Recent Activity</h4>
          {data.activity.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500">No activity yet</p>
              <p className="text-xs text-slate-600 mt-1">Sync Google Sheets or save a calculation.</p>
              <button type="button" onClick={() => goToTab("loans")} className="mt-3 text-sm text-blue-400 font-semibold hover:underline">
                Add Record
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {data.activity.map((item) => {
                const { Icon, className } = activityIcon(item.kind);
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10 bg-white/[0.04]">
                      <Icon size={16} className={className} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-snug">{item.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.subtitle}</div>
                      <div className="text-[11px] text-slate-600 mt-1">{formatRelativeTime(item.createdAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card-tertiary rounded-3xl p-5 md:p-6 border border-white/8">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold">Control Center</h4>
            <StatusChip label={syncing ? "Syncing…" : "Ready"} variant={syncing ? "info" : "neutral"} />
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Integrations</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Google Sheets</span><StatusChip label={settingsStatus.googleSheetsStatus === "connected" ? "Connected" : "Not connected"} variant={settingsStatus.googleSheetsStatus === "connected" ? "success" : "warning"} /></div>
                <div className="flex justify-between"><span>Telegram</span><StatusChip label={settingsStatus.telegramStatus === "connected" ? "Connected" : "Not connected"} variant={settingsStatus.telegramStatus === "connected" ? "success" : "warning"} /></div>
                <div className="flex justify-between"><span>Last sync</span><span className="text-xs text-slate-500">{settingsStatus.lastSheetsReadAt ? formatRelativeTime(settingsStatus.lastSheetsReadAt) : "Never"}</span></div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">Preferences</div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-slate-500 text-xs">Currency</div><div className="font-medium">{controlSettings.preferences.defaultCurrency}</div></div>
                <div><div className="text-slate-500 text-xs">Theme</div><div className="font-medium capitalize">{controlSettings.preferences.theme}</div></div>
                <div className="col-span-2"><div className="text-slate-500 text-xs">Default module</div><div className="font-medium">{controlSettings.preferences.defaultModule}</div></div>
              </div>
            </div>
            {controlError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{controlError}</div>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void handleSyncNow()} disabled={syncing} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-70">
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} /> Sync Now
              </button>
              <button type="button" onClick={() => goToTab("settings")} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm">
                <SlidersHorizontal size={14} /> Open Preferences
              </button>
            </div>
          </div>
        </div>

        <div className="glass-card-tertiary rounded-2xl p-4 border border-white/8 text-xs text-slate-500">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-1">
              <Cloud size={14} /> Storage synced
            </div>
            Last backup: {data.lastSheetsReadAt ? formatRelativeTime(data.lastSheetsReadAt) : "never"}
        </div>
      </div>
    </>
  );
}
