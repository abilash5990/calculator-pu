import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Gem, Calculator, Info, TrendingDown, IndianRupee } from "lucide-react";

export default function JewelLoan() {
  const [weight, setWeight] = useState(50); // grams
  const [purity, setPurity] = useState(22); // karat
  const [marketRate, setMarketRate] = useState(6500); // per gram
  const [loanLTV, setLoanLTV] = useState(75); // %
  const [interestRate, setInterestRate] = useState(12); // % per annum

  const [result, setResult] = useState({
    goldValue: 0,
    loanAmount: 0,
    monthlyInterest: 0,
  });

  useEffect(() => {
    const goldVal = weight * marketRate * (purity / 24);
    const loanAmt = (goldVal * loanLTV) / 100;
    const monthlyInt = (loanAmt * (interestRate / 100)) / 12;

    setResult({
      goldValue: goldVal,
      loanAmount: loanAmt,
      monthlyInterest: monthlyInt,
    });
  }, [weight, purity, marketRate, loanLTV, interestRate]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <div className="glass p-8 rounded-3xl border border-white/10">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Gem className="text-yellow-500" />
            Jewel Parameters
          </h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Weight (Grams)</label>
                <input 
                  type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Purity (Karat)</label>
                <select 
                  value={purity} onChange={(e) => setPurity(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-yellow-500/50 transition-colors appearance-none"
                >
                  <option value={24}>24K</option>
                  <option value={22}>22K</option>
                  <option value={20}>20K</option>
                  <option value={18}>18K</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Market Rate (â¹/gram)</label>
              <input 
                type="number" value={marketRate} onChange={(e) => setMarketRate(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">LTV Ratio (%)</label>
                <input 
                  type="number" value={loanLTV} onChange={(e) => setLoanLTV(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Interest Rate (%)</label>
                <input 
                  type="number" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-yellow-500/50 transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/10 bg-yellow-500/5 flex items-start gap-4">
          <Info className="text-yellow-500 shrink-0 mt-1" />
          <p className="text-sm text-gray-400">
            Gold loan valuation depends on the daily market rate and the purity of the gold. LTV (Loan-to-Value) is typically capped at 75% by RBI guidelines.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <motion.div 
          layout
          className="glass p-8 rounded-3xl border border-yellow-500/20 bg-yellow-500/5 relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest">Maximum Loan Amount</span>
            <div className="text-5xl font-bold mt-2 tracking-tighter">
              {formatCurrency(result.loanAmount)}
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gold Value</span>
                <div className="text-lg font-semibold">{formatCurrency(result.goldValue)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Monthly Interest</span>
                <div className="text-lg font-semibold">{formatCurrency(result.monthlyInterest)}</div>
              </div>
            </div>
          </div>
          
          <div className="absolute -right-10 -bottom-10 opacity-10 text-yellow-500">
            <Gem size={200} />
          </div>
        </motion.div>

        <div className="glass p-8 rounded-3xl border border-white/10">
          <h4 className="font-bold mb-4">Repayment Strategy</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
              <span className="text-sm text-gray-400">Interest Only (Monthly)</span>
              <span className="font-mono font-bold">{formatCurrency(result.monthlyInterest)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
              <span className="text-sm text-gray-400">Total Interest (1 Year)</span>
              <span className="font-mono font-bold">{formatCurrency(result.monthlyInterest * 12)}</span>
            </div>
          </div>
        </div>

        <button className="w-full py-4 glass rounded-2xl border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold text-sm">
          <IndianRupee size={16} />
          Save to Google Sheets
        </button>
      </div>
    </div>
  );
}
