import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import LoanInputForm from "./LoanInputForm";
import LoanSummaryCards from "./LoanSummaryCards";
import LoanAmortizationChart from "./LoanAmortizationChart";
import LoanHistoryTable from "./LoanHistoryTable";

type LoanInput = {
  loanAmount: number;
  interestRate: number;
  tenure: number;
};

type ChartDatum = { year: number; balance: number };

type LoanRecord = {
  id: string;
  loanAmount: number;
  interestRate: number;
  tenure: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
  createdAt: string;
};

function computeLoanPreview(input: LoanInput) {
  const { loanAmount, interestRate, tenure } = input;

  const monthlyRate = interestRate / 12 / 100;
  const numPayments = tenure * 12;

  const emiFloat =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const emi = Math.round(emiFloat);
  const totalPayment = emi * numPayments;
  const totalInterest = totalPayment - loanAmount;

  let balance = loanAmount;
  const chartData: ChartDatum[] = [];

  // Year-bucketed amortization projection (visual approximation).
  for (let i = 0; i <= tenure; i++) {
    chartData.push({ year: i, balance: Math.round(balance) });

    for (let j = 0; j < 12; j++) {
      const interest = balance * monthlyRate;
      const principal = emi - interest;
      balance -= principal;
    }

    if (balance < 0) balance = 0;
  }

  return { chartData, emi, totalInterest, totalPayment };
}

export default function LoanAnalytics() {
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const preview = useMemo(
    () =>
      computeLoanPreview({
        loanAmount,
        interestRate,
        tenure,
      }),
    [loanAmount, interestRate, tenure],
  );

  const [records, setRecords] = useState<LoanRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  async function refreshHistory() {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/loans");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to fetch loans");
      setRecords(Array.isArray(json.records) ? json.records : []);
    } catch (e: any) {
      setHistoryError(e?.message ?? "Failed to fetch loans");
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRecord = useMemo(
    () => records.find((r) => r.id === selectedId) ?? null,
    [records, selectedId],
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <LoanInputForm
            loanAmount={loanAmount}
            interestRate={interestRate}
            tenure={tenure}
            onLoanAmountChange={setLoanAmount}
            onInterestRateChange={setInterestRate}
            onTenureChange={setTenure}
          />

          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              setSaveError(null);
              setSaveSuccess(null);
              try {
                const res = await fetch("/api/loans/save", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    loanAmount,
                    interestRate,
                    tenure,
                  }),
                });
                const json = await res.json();
                if (!res.ok)
                  throw new Error(json?.error ?? "Failed to save loan");

                const record = json.record as LoanRecord;
                setSelectedId(record.id);
                setRecords((prev) => [record, ...prev]);
                setSaveSuccess("Loan saved to Google Sheets.");
              } catch (e: any) {
                setSaveError(e?.message ?? "Failed to save loan");
              } finally {
                setSaving(false);
              }
            }}
            className="w-full py-4 glass rounded-2xl border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold text-sm disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save to Google Sheets
          </button>

          {saveError ? (
            <div className="text-red-400 text-sm">{saveError}</div>
          ) : null}
          {saveSuccess ? (
            <div className="text-green-400 text-sm">{saveSuccess}</div>
          ) : null}
        </div>

        <LoanSummaryCards
          loanAmount={loanAmount}
          emi={preview.emi}
          totalInterest={preview.totalInterest}
          totalPayment={preview.totalPayment}
        />
      </div>

      <LoanAmortizationChart chartData={preview.chartData} />

      <div className="space-y-4">
        {selectedRecord ? (
          <div className="text-xs text-gray-500">
            Selected saved record from{" "}
            {new Date(selectedRecord.createdAt).toLocaleString()}
          </div>
        ) : null}

        {historyLoading ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading saved loans...
          </div>
        ) : historyError ? (
          <div className="text-red-400 text-sm">{historyError}</div>
        ) : (
          <LoanHistoryTable
            records={records}
            selectedId={selectedId}
            onSelect={(id) => {
              const record = records.find((r) => r.id === id);
              if (!record) return;
              setSelectedId(id);
              setLoanAmount(record.loanAmount);
              setInterestRate(record.interestRate);
              setTenure(record.tenure);
            }}
          />
        )}
      </div>
    </div>
  );
}
