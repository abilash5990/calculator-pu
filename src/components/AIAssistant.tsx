import { useCallback, useEffect, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import type { DashboardPayload } from "../lib/dashboardTypes";
import { AI_PROMPT_KEY } from "../lib/dashboardTypes";

const PROMPTS = [
  { id: "summary", label: "Summarize my financial status", prompt: "Summarize my financial status in 2-3 concise sentences." },
  { id: "tax", label: "Suggest tax-saving ideas", prompt: "Suggest 3 practical tax-saving ideas for an Indian user." },
  { id: "loan", label: "Explain loan risk", prompt: "Explain my loan risk exposure briefly based on the data." },
  { id: "report", label: "Generate monthly finance report", prompt: "Write a short monthly finance report with bullet points." },
];

async function askAi(prompt: string, context: unknown, fallback: string) {
  const res = await fetch("/api/ai/insight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, context, fallback }),
  });
  const json = await res.json();
  return String(json.text ?? fallback);
}

export default function AIAssistant() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/dashboard")
      .then((r) => r.json())
      .then((j) => setDashboard(j as DashboardPayload))
      .catch(() => setDashboard(null));
  }, []);

  const context = dashboard
    ? { financialYear: dashboard.financialYear, health: dashboard.health, kpis: dashboard.kpis, insights: dashboard.insights }
    : {};

  const run = useCallback(
    async (prompt: string) => {
      setLoading(true);
      setResponse(null);
      const fallback = dashboard?.insights.join(" ") || "Add records and sync Google Sheets for richer insights.";
      try {
        setResponse(await askAi(prompt, context, fallback));
      } catch {
        setResponse(fallback);
      } finally {
        setLoading(false);
      }
    },
    [context, dashboard?.insights],
  );

  useEffect(() => {
    const pending = sessionStorage.getItem(AI_PROMPT_KEY);
    if (pending) {
      sessionStorage.removeItem(AI_PROMPT_KEY);
      void run(pending);
    }
  }, [run]);

  return (
    <div className="col-span-full space-y-6">
      <section className="glass-card-primary rounded-3xl p-6 md:p-8 border border-white/[0.12]">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <Bot size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold">AI Financial Assistant</h3>
            <p className="text-sm text-slate-400 mt-1">Powered by Gemini when configured; otherwise rule-based insights.</p>
          </div>
        </div>

        {dashboard && (
          <div className="mb-6 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 flex flex-wrap gap-6">
            <div>
              <div className="text-xs text-slate-500 uppercase">Health Score</div>
              <div className="text-3xl font-bold text-blue-300">{dashboard.health.score}/100</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div className="font-medium">{dashboard.health.status} · Risk {dashboard.health.risk}</div>
            </div>
            <p className="text-sm text-slate-400 flex-1 min-w-[200px]">{dashboard.health.suggestion}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {PROMPTS.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={loading}
              onClick={() => void run(p.prompt)}
              className="text-left p-4 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-blue-500/30 transition disabled:opacity-60"
            >
              <Sparkles size={16} className="text-blue-400 mb-2" />
              <span className="text-sm font-medium">{p.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 min-h-[100px]">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Loader2 size={16} className="animate-spin" /> Thinking…
            </div>
          ) : (
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {response ?? "Choose a prompt to get started."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
