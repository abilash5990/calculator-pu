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
} from "lucide-react";
import {
  Area,
  AreaChart,
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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ActivityItem = {
  id: string;
  kind: "loan" | "it" | "jewel" | "plot";
  title: string;
  subtitle: string;
  createdAt: string;
};

type RecentRow = {
  id: string;
  source: string;
  label: string;
  detail: string;
  amountLabel: string;
  status: string;
  updatedAt: string;
};

type DashboardPayload = {
  refreshedAt: string;
  lastSheetsReadAt: string | null;
  sheetsConfigured: boolean;
  sheetsError: string | null;
  googleSheetsStatus: "synced" | "not_configured" | "error";
  telegramStatus: "connected" | "not_connected";
  kpis: {
    totalLoanPrincipal: number;
    activeLoanCases: number;
    monthlyTaxEstimate: number | null;
    plotRatePerSqft: number | null;
    estimatedTaxFromLatestIT: number | null;
  };
  chartSeries: { day: string; count: number }[];
  activity: ActivityItem[];
  recentRecords: RecentRow[];
  moduleErrors: Record<string, string>;
};

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
  return `${d}d ago`;
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
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[variant],
      )}
    >
      {label}
    </span>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (!r.ok) {
        throw new Error(j.error ?? "Failed to load dashboard");
      }
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
    if (!res.ok) {
      setControlError(res.error ?? res.message);
    } else {
      setControlError(null);
    }
  }, []);

  useEffect(() => {
    void loadControlCenter();
  }, [loadControlCenter]);

  const chartData = useMemo(() => {
    if (!data?.chartSeries?.length) return [];
    return data.chartSeries.map((c) => ({
      name: new Date(c.day + "T12:00:00").toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      }),
      count: c.count,
    }));
  }, [data]);

  const chartHasActivity = useMemo(
    () => chartData.some((d) => d.count > 0),
    [chartData],
  );

  const showChartPlaceholder = useMemo(() => {
    if (!data) return true;
    const k = data.kpis;
    const noRecords =
      k.activeLoanCases === 0 &&
      data.activity.length === 0 &&
      data.recentRecords.length === 0;
    return !chartHasActivity && noRecords;
  }, [data, chartHasActivity]);

  const sheetsChip = useMemo(() => {
    if (!data) return { label: "…", variant: "neutral" as const };
    if (data.googleSheetsStatus === "not_configured") {
      return { label: "Sheets not connected", variant: "warning" as const };
    }
    if (data.googleSheetsStatus === "error") {
      return { label: "Sheets error", variant: "danger" as const };
    }
    return { label: "Synced", variant: "success" as const };
  }, [data]);

  const telegramChip = useMemo(() => {
    if (!data) return { label: "…", variant: "neutral" as const };
    if (data.telegramStatus === "connected") {
      return { label: "Bot connected", variant: "success" as const };
    }
    return { label: "Not connected", variant: "warning" as const };
  }, [data]);

  const controlSheetsChip = useMemo(() => {
    if (settingsStatus.googleSheetsStatus === "connected") {
      return { label: "Connected", variant: "success" as const };
    }
    if (settingsStatus.googleSheetsStatus === "error") {
      return { label: "Error", variant: "danger" as const };
    }
    return { label: "Not connected", variant: "warning" as const };
  }, [settingsStatus.googleSheetsStatus]);

  const controlTelegramChip = useMemo(() => {
    return settingsStatus.telegramStatus === "connected"
      ? { label: "Connected", variant: "success" as const }
      : { label: "Not connected", variant: "warning" as const };
  }, [settingsStatus.telegramStatus]);

  const handleSyncNow = useCallback(async () => {
    setSyncing(true);
    setControlError(null);
    try {
      const result = await syncNow();
      setControlSettings(result.settings);
      setSettingsStatus(result.status);
      await Promise.all([load(), loadControlCenter()]);
    } catch (e: any) {
      setControlError(e?.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [load, loadControlCenter]);

  if (loading && !data) {
    return (
      <div className="contents">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card-primary rounded-3xl p-6 md:p-8 min-h-[320px] animate-pulse">
            <div className="h-8 bg-white/10 rounded-lg w-1/3 mb-8" />
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="h-16 bg-white/5 rounded-xl" />
              <div className="h-16 bg-white/5 rounded-xl" />
              <div className="h-16 bg-white/5 rounded-xl" />
            </div>
            <div className="h-40 bg-white/5 rounded-xl" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="glass-card-tertiary rounded-3xl p-6 h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="col-span-full glass-card-primary rounded-3xl p-8 flex flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-slate-300">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition active:scale-[0.98]"
        >
          <RefreshCw size={18} />
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const k = data.kpis;
  const hasModuleErrors = Object.keys(data.moduleErrors).length > 0;

  return (
    <>
      <div className="lg:col-span-2 space-y-6">
        <section className="glass-card-primary rounded-3xl p-5 md:p-6 border border-white/[0.12] shadow-2xl shadow-black/40 transition hover:border-white/15">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Financial Overview
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Data from Google Sheets · Refreshed{" "}
                {formatRelativeTime(data.refreshedAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void load()}
                className="p-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition active:scale-[0.98]"
                title="Refresh dashboard"
                aria-label="Refresh dashboard"
              >
                <RefreshCw size={18} className={cn("text-slate-300", loading && "animate-spin")} />
              </button>
              <StatusChip label={sheetsChip.label} variant={sheetsChip.variant} />
              {data.lastSheetsReadAt && (
                <StatusChip
                  label={`Read ${formatRelativeTime(data.lastSheetsReadAt)}`}
                  variant="neutral"
                />
              )}
            </div>
          </div>

          {hasModuleErrors && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Some modules could not load:{" "}
                {Object.entries(data.moduleErrors)
                  .map(([key, msg]) => `${key}: ${msg}`)
                  .join(" · ")}
              </span>
            </div>
          )}

          {!data.sheetsConfigured && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-foreground">No Google Sheet connected.</span>{" "}
                Set <code className="text-blue-400">GOOGLE_SHEET_ID</code> and credentials to sync
                data.
              </div>
              <button
                type="button"
                onClick={() => goToTab("settings")}
                className="shrink-0 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition active:scale-[0.98]"
              >
                Open Settings
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition hover:border-white/12 hover:bg-white/[0.06]">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total loan principal
              </span>
              <div className="text-3xl font-bold tabular-nums mt-2 text-foreground">
                {formatInr(k.totalLoanPrincipal, { compactLakh: true })}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition hover:border-white/12 hover:bg-white/[0.06]">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Active loan cases
              </span>
              <div className="text-3xl font-bold tabular-nums mt-2 text-foreground">
                {k.activeLoanCases}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition hover:border-white/12 hover:bg-white/[0.06]">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Monthly tax (latest IT)
              </span>
              <div className="text-3xl font-bold tabular-nums mt-2 text-foreground">
                {k.monthlyTaxEstimate != null && Number.isFinite(k.monthlyTaxEstimate)
                  ? formatInr(k.monthlyTaxEstimate)
                  : "—"}
              </div>
            </div>
          </div>

          <div className="h-[200px] w-full">
            {showChartPlaceholder ? (
              <div className="h-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 text-center">
                <TrendingUp className="w-10 h-10 text-slate-500 mb-2 opacity-60" />
                <p className="text-sm text-slate-400 font-medium">
                  Waiting for your first saved calculation or sheet sync.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Use Loan Analytics, IT Filing, or Plot Purchase — activity will appear here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dashActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    width={32}
                    tick={{ fill: "#64748b", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    labelStyle={{ color: "#e2e8f0" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Records"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="url(#dashActivity)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">7-day saved-record trend (all modules)</p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card-secondary rounded-3xl p-5 border border-white/10 transition hover:border-white/15 hover:shadow-lg hover:shadow-black/20">
            <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Calculator size={18} className="text-blue-500" />
              Quick Calculator
            </h4>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.03]">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Est. annual tax (latest)
                </span>
                <div className="text-2xl font-bold font-mono mt-1 tabular-nums">
                  {k.estimatedTaxFromLatestIT != null && Number.isFinite(k.estimatedTaxFromLatestIT)
                    ? formatInr(k.estimatedTaxFromLatestIT)
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card-secondary rounded-3xl p-5 border border-white/10 transition hover:border-white/15 hover:shadow-lg hover:shadow-black/20">
            <h4 className="text-base font-semibold mb-4 flex items-center gap-2">
              <LandPlot size={18} className="text-purple-400" />
              Plot Valuation
            </h4>
            <div className="space-y-3">
              <div className="p-4 rounded-2xl border border-white/8 bg-white/[0.03]">
                <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                  Latest rate / sqft
                </span>
                <div className="text-2xl font-bold font-mono mt-1 tabular-nums">
                  {k.plotRatePerSqft != null && Number.isFinite(k.plotRatePerSqft)
                    ? `${formatInr(k.plotRatePerSqft)} / sqft`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card-secondary rounded-3xl p-5 border border-white/10 bg-blue-500/[0.06] transition hover:border-blue-500/25 hover:shadow-lg hover:shadow-black/20">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h4 className="text-base font-semibold flex items-center gap-2">
                <Send size={18} className="text-sky-400" />
                Telegram
              </h4>
              <StatusChip label={telegramChip.label} variant={telegramChip.variant} />
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Connect your bot for alerts and commands.
            </p>
            <button
              type="button"
              onClick={() => goToTab("settings")}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition active:scale-[0.98]"
            >
              Configure Bot
            </button>
          </div>
        </div>

        <section className="glass-card-tertiary rounded-3xl p-5 md:p-6 border border-white/8">
          <h4 className="text-lg font-semibold mb-4">Recent records</h4>
          {data.recentRecords.length === 0 ? (
            <p className="text-sm text-slate-500">No saved records yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 uppercase tracking-widest text-[11px]">
                    <th className="pb-3 pr-4">Source</th>
                    <th className="pb-3 pr-4">Summary</th>
                    <th className="pb-3 pr-4">Detail</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentRecords.map((row) => (
                    <tr key={row.id} className="border-t border-white/5">
                      <td className="py-3 pr-4 font-medium text-slate-300">{row.source}</td>
                      <td className="py-3 pr-4 text-slate-200">{row.label}</td>
                      <td className="py-3 pr-4 text-slate-500 max-w-[200px] truncate">{row.detail}</td>
                      <td className="py-3 pr-4 font-mono text-slate-200">{row.amountLabel}</td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-slate-400">
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 whitespace-nowrap">
                        {formatRelativeTime(row.updatedAt)}
                      </td>
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
          <h4 className="text-lg font-semibold mb-6">Recent activity</h4>
          {data.activity.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <div className="space-y-4">
              {data.activity.map((item) => {
                const Icon =
                  item.kind === "loan"
                    ? TrendingUp
                    : item.kind === "it"
                      ? FileSpreadsheet
                      : item.kind === "jewel"
                        ? Gem
                        : LandPlot;
                const iconClass =
                  item.kind === "loan"
                    ? "text-blue-400"
                    : item.kind === "it"
                      ? "text-emerald-400"
                      : item.kind === "jewel"
                        ? "text-amber-400"
                        : "text-purple-400";
                return (
                  <div key={item.id} className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border border-white/10 bg-white/[0.04]",
                      )}
                    >
                      <Icon size={16} className={iconClass} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground leading-snug">
                        {item.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.subtitle}</div>
                      <div className="text-[11px] text-slate-600 mt-1">
                        {formatRelativeTime(item.createdAt)}
                      </div>
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
            <StatusChip
              label={syncing ? "Syncing..." : "Ready"}
              variant={syncing ? "info" : "neutral"}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">
                Integrations
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">Google Sheets</span>
                  <StatusChip label={controlSheetsChip.label} variant={controlSheetsChip.variant} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">Telegram</span>
                  <StatusChip label={controlTelegramChip.label} variant={controlTelegramChip.variant} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-300">Last sync</span>
                  <span className="text-xs text-slate-500">
                    {settingsStatus.lastSheetsReadAt
                      ? formatRelativeTime(settingsStatus.lastSheetsReadAt)
                      : "Never"}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-3">
                Preferences
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-slate-500 text-xs">Currency</div>
                  <div className="text-slate-200 font-medium">{controlSettings.preferences.defaultCurrency}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-xs">Theme</div>
                  <div className="text-slate-200 font-medium capitalize">{controlSettings.preferences.theme}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-500 text-xs">Default module</div>
                  <div className="text-slate-200 font-medium">{controlSettings.preferences.defaultModule}</div>
                </div>
              </div>
            </div>

            {controlError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {controlError}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSyncNow()}
                disabled={syncing}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition disabled:opacity-70"
              >
                <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                Sync Now
              </button>
              <button
                type="button"
                onClick={() => goToTab("settings")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm transition"
              >
                <SlidersHorizontal size={14} />
                Open Preferences
              </button>
              <button
                type="button"
                onClick={() => goToTab("loans")}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm transition"
              >
                <PlusCircle size={14} />
                Add Record
              </button>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
