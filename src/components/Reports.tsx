import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { formatInr } from "../lib/formatCurrency";
import type { DashboardPayload } from "../lib/dashboardTypes";
import { goToTab } from "../tabNav";

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const [data, setData] = useState<DashboardPayload | null>(null);

  useEffect(() => {
    void fetch("/api/dashboard")
      .then((r) => r.json())
      .then((j) => setData(j as DashboardPayload))
      .catch(() => setData(null));
  }, []);

  const exportSummary = () => {
    if (!data) return;
    const k = data.kpis;
    const lines = [
      `FinanceHub Report — FY ${data.financialYear}`,
      `Generated: ${new Date().toLocaleString("en-IN")}`,
      "",
      `Health Score: ${data.health.score}/100 (${data.health.status})`,
      `Total Assets: ${formatInr(k.totalAssets)}`,
      `Total Loans: ${formatInr(k.totalLoanPrincipal)}`,
      `Net Position: ${formatInr(k.netPosition)}`,
      `Monthly Tax Est.: ${k.monthlyTaxEstimate != null ? formatInr(k.monthlyTaxEstimate) : "—"}`,
      `Pending EMI/mo: ${formatInr(k.pendingMonthlyEmi)}`,
      `Saved Records: ${k.totalSavedRecords}`,
      "",
      "Insights:",
      ...data.insights.map((i) => `• ${i}`),
    ];
    downloadText(`financehub-report-${data.financialYear.replace("–", "-")}.txt`, lines.join("\n"));
  };

  return (
    <div className="col-span-full space-y-6">
      <section className="glass-card-primary rounded-3xl p-6 md:p-8 border border-white/[0.12]">
        <h3 className="text-xl font-semibold mb-2">Reports & Export</h3>
        <p className="text-sm text-slate-400 mb-6">Download summaries of your synced financial data.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={exportSummary}
            disabled={!data}
            className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-blue-500/30 text-left transition disabled:opacity-50"
          >
            <FileText size={22} className="text-blue-400 mb-3" />
            <div className="font-semibold text-sm">Export Summary</div>
            <p className="text-xs text-slate-500 mt-1">Text report with KPIs & insights</p>
          </button>
          <button
            type="button"
            onClick={() => goToTab("loans")}
            className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-blue-500/30 text-left transition"
          >
            <Download size={22} className="text-emerald-400 mb-3" />
            <div className="font-semibold text-sm">Loan Summary</div>
            <p className="text-xs text-slate-500 mt-1">Open Loan Analytics to save & view</p>
          </button>
          <button
            type="button"
            onClick={() => goToTab("it-filing")}
            className="p-5 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-blue-500/30 text-left transition"
          >
            <FileSpreadsheet size={22} className="text-purple-400 mb-3" />
            <div className="font-semibold text-sm">Tax Report</div>
            <p className="text-xs text-slate-500 mt-1">Open IT Filing for estimates</p>
          </button>
        </div>
      </section>
    </div>
  );
}
