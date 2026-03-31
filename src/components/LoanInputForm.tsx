import { useMemo } from "react";

type Props = {
  loanAmount: number;
  interestRate: number;
  tenure: number;
  onLoanAmountChange: (val: number) => void;
  onInterestRateChange: (val: number) => void;
  onTenureChange: (val: number) => void;
};

export default function LoanInputForm({
  loanAmount,
  interestRate,
  tenure,
  onLoanAmountChange,
  onInterestRateChange,
  onTenureChange,
}: Props) {
  const formatCurrency = useMemo(
    () => (val: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(val),
    [],
  );

  return (
    <div className="glass p-8 rounded-3xl border border-white/10 space-y-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        Loan Parameters
      </h3>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Loan Amount
          </label>
          <input
            type="range"
            min="100000"
            max="20000000"
            step="100000"
            value={loanAmount}
            onChange={(e) => onLoanAmountChange(Number(e.target.value))}
            className="w-full h-2 bg-blue-500/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="text-xl font-mono mt-2">{formatCurrency(loanAmount)}</div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Interest Rate (%)
          </label>
          <input
            type="range"
            min="1"
            max="20"
            step="0.1"
            value={interestRate}
            onChange={(e) => onInterestRateChange(Number(e.target.value))}
            className="w-full h-2 bg-purple-500/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="text-xl font-mono mt-2">{interestRate}%</div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            Tenure (Years)
          </label>
          <input
            type="range"
            min="1"
            max="30"
            step="1"
            value={tenure}
            onChange={(e) => onTenureChange(Number(e.target.value))}
            className="w-full h-2 bg-pink-500/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />
          <div className="text-xl font-mono mt-2">{tenure} Years</div>
        </div>
      </div>
    </div>
  );
}

