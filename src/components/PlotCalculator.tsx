import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LandPlot, Calculator, Info, TrendingUp, IndianRupee } from "lucide-react";
import PlotPurchaseHistoryTable from "./PlotPurchaseHistoryTable";

interface CalculationResult {
  totalCost: number;
  registrationCost: number;
  otherCosts: number;
  perSqftCost: number;
}

export default function PlotCalculator() {
  const [area, setArea] = useState<number>(1200);
  const [rate, setRate] = useState<number>(3500);
  const [registrationPercent, setRegistrationPercent] = useState<number>(7);
  const [otherExpenses, setOtherExpenses] = useState<number>(50000);
  const [result, setResult] = useState<CalculationResult>({
    totalCost: 0,
    registrationCost: 0,
    otherCosts: 0,
    perSqftCost: 0,
  });

  type PlotPurchaseRecord = {
    id: string;
    area: number;
    rate: number;
    registrationPercent: number;
    otherExpenses: number;
    totalCost: number;
    registrationCost: number;
    otherCosts: number;
    perSqftCost: number;
    createdAt: string;
  };

  const [records, setRecords] = useState<PlotPurchaseRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    const baseCost = area * rate;
    const regCost = (baseCost * registrationPercent) / 100;
    const total = baseCost + regCost + otherExpenses;
    
    setResult({
      totalCost: total,
      registrationCost: regCost,
      otherCosts: otherExpenses,
      perSqftCost: total / area,
    });
  }, [area, rate, registrationPercent, otherExpenses]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  async function refreshHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/plot-purchase");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to fetch history");
      setRecords(Array.isArray(json.records) ? json.records : []);
    } catch (e: any) {
      setHistoryError(e?.message ?? "Failed to fetch history");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
      <div className="space-y-6">
        <div className="glass p-8 rounded-3xl border border-white/10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Calculator className="text-blue-500" />
            Plot Parameters
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Plot Area (sq.ft)
              </label>
              <input 
                type="number"
                value={area}
                onChange={(e) => setArea(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                Rate per sq.ft (â¹)
              </label>
              <input 
                type="number"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Registration (%)
                </label>
                <input 
                  type="number"
                  value={registrationPercent}
                  onChange={(e) => setRegistrationPercent(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Other Expenses (â¹)
                </label>
                <input 
                  type="number"
                  value={otherExpenses}
                  onChange={(e) => setOtherExpenses(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/10 bg-blue-500/5 flex items-start gap-4">
          <Info className="text-blue-500 shrink-0 mt-1" />
          <p className="text-sm text-gray-400">
            This calculation includes basic plot cost, registration fees, and miscellaneous expenses. Always verify current registration rates with local authorities.
          </p>
        </div>
      </div>

      {/* Result Section */}
      <div className="space-y-6">
        <motion.div 
          layout
          className="glass p-8 rounded-3xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Total Estimated Investment</span>
            <div className="text-5xl font-bold mt-2 tracking-tighter">
              {formatCurrency(result.totalCost)}
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Registration</span>
                <div className="text-lg font-semibold">{formatCurrency(result.registrationCost)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Effective Rate</span>
                <div className="text-lg font-semibold">{formatCurrency(result.perSqftCost)}/sqft</div>
              </div>
            </div>
          </div>
          
          {/* Decorative element */}
          <div className="absolute -right-10 -bottom-10 opacity-10">
            <LandPlot size={200} />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 gap-4">
          <div className="glass p-6 rounded-3xl border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="text-sm font-bold">Market Analysis</div>
                <div className="text-xs text-gray-500">Based on current area trends</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-green-500 font-bold text-sm">+12.4%</div>
              <div className="text-[10px] text-gray-500 uppercase font-bold">Annual Growth</div>
            </div>
          </div>

          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              setSaveSuccess(null);
              try {
                const res = await fetch("/api/plot-purchase/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    area,
                    rate,
                    registrationPercent,
                    otherExpenses,
                  }),
                });
                const json = await res.json();
                if (!res.ok)
                  throw new Error(
                    json?.error ?? "Failed to save plot purchase",
                  );
                const record = json.record as PlotPurchaseRecord;
                setSelectedId(record.id);
                setRecords((prev) => [record, ...prev]);
                setArea(record.area);
                setRate(record.rate);
                setRegistrationPercent(record.registrationPercent);
                setOtherExpenses(record.otherExpenses);
                setSaveSuccess("Saved to Google Sheets.");
              } catch (e: any) {
                setSaveError(e?.message ?? "Failed to save plot purchase");
              } finally {
                setSaving(false);
              }
            }}
            className="w-full py-4 glass rounded-2xl border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-60"
          >
            <IndianRupee size={16} />
            Save to Google Sheets
          </button>

          {saveError ? (
            <div className="text-red-400 text-sm">{saveError}</div>
          ) : null}
          {saveSuccess ? (
            <div className="text-green-400 text-sm">{saveSuccess}</div>
          ) : null}
        </div>
      </div>
      </div>

      <div>
        {historyLoading ? (
          <div className="text-sm text-gray-500">Loading saved plot purchases...</div>
        ) : historyError ? (
          <div className="text-red-400 text-sm">{historyError}</div>
        ) : (
          <PlotPurchaseHistoryTable
            records={records}
            selectedId={selectedId}
            onSelect={(id) => {
              const record = records.find((r) => r.id === id);
              if (!record) return;
              setSelectedId(id);
              setArea(record.area);
              setRate(record.rate);
              setRegistrationPercent(record.registrationPercent);
              setOtherExpenses(record.otherExpenses);
            }}
          />
        )}
      </div>
    </div>
  );
}
