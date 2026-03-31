import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Calculator, Info, TrendingUp, IndianRupee, PieChart } from "lucide-react";

export default function ITFiling() {
  const [income, setIncome] = useState(1200000);
  const [deductions, setDeductions] = useState(150000);
  const [regime, setRegime] = useState<"old" | "new">("new");

  const [tax, setTax] = useState(0);

  useEffect(() => {
    let taxableIncome = Math.max(0, income - (regime === "old" ? deductions : 0));
    let calculatedTax = 0;

    if (regime === "new") {
      // New Regime Slabs (Simplified for 2024-25)
      if (taxableIncome <= 300000) calculatedTax = 0;
      else if (taxableIncome <= 600000) calculatedTax = (taxableIncome - 300000) * 0.05;
      else if (taxableIncome <= 900000) calculatedTax = 15000 + (taxableIncome - 600000) * 0.10;
      else if (taxableIncome <= 1200000) calculatedTax = 45000 + (taxableIncome - 900000) * 0.15;
      else if (taxableIncome <= 1500000) calculatedTax = 90000 + (taxableIncome - 1200000) * 0.20;
      else calculatedTax = 150000 + (taxableIncome - 1500000) * 0.30;
      
      // Revisions/Rebates
      if (taxableIncome <= 700000) calculatedTax = 0;
    } else {
      // Old Regime Slabs
      if (taxableIncome <= 250000) calculatedTax = 0;
      else if (taxableIncome <= 500000) calculatedTax = (taxableIncome - 250000) * 0.05;
      else if (taxableIncome <= 1000000) calculatedTax = 12500 + (taxableIncome - 500000) * 0.20;
      else calculatedTax = 112500 + (taxableIncome - 1000000) * 0.30;
      
      if (taxableIncome <= 500000) calculatedTax = 0;
    }

    // Add 4% Cess
    setTax(calculatedTax * 1.04);
  }, [income, deductions, regime]);

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
            <Calculator className="text-blue-500" />
            Income Parameters
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Annual Income (â¹)</label>
              <input 
                type="number" value={income} onChange={(e) => setIncome(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setRegime("new")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${regime === "new" ? "bg-blue-500 text-white" : "glass text-gray-400"}`}
              >
                New Regime
              </button>
              <button 
                onClick={() => setRegime("old")}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${regime === "old" ? "bg-blue-500 text-white" : "glass text-gray-400"}`}
              >
                Old Regime
              </button>
            </div>

            {regime === "old" && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Deductions (80C, etc.)</label>
                <input 
                  type="number" value={deductions} onChange={(e) => setDeductions(Number(e.target.value))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl font-mono focus:outline-none focus:border-blue-500/50 transition-colors"
                />
              </motion.div>
            )}
          </div>
        </div>

        <div className="glass p-6 rounded-3xl border border-white/10 bg-blue-500/5 flex items-start gap-4">
          <Info className="text-blue-500 shrink-0 mt-1" />
          <p className="text-sm text-gray-400">
            Calculations are based on the Finance Act 2024. The new regime is now the default. Standard deduction of â¹50,000 is automatically applied in our logic.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <motion.div 
          layout
          className="glass p-8 rounded-3xl border border-blue-500/20 bg-blue-500/5 relative overflow-hidden"
        >
          <div className="relative z-10">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Estimated Annual Tax</span>
            <div className="text-5xl font-bold mt-2 tracking-tighter">
              {formatCurrency(tax)}
            </div>
            
            <div className="mt-8 grid grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Monthly Tax</span>
                <div className="text-lg font-semibold">{formatCurrency(tax / 12)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Take Home (Monthly)</span>
                <div className="text-lg font-semibold">{formatCurrency((income - tax) / 12)}</div>
              </div>
            </div>
          </div>
          
          <div className="absolute -right-10 -bottom-10 opacity-10 text-blue-500">
            <PieChart size={200} />
          </div>
        </motion.div>

        <div className="glass p-8 rounded-3xl border border-white/10">
          <h4 className="font-bold mb-4">Tax Breakdown</h4>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
              <span className="text-sm text-gray-400">Effective Tax Rate</span>
              <span className="font-mono font-bold text-blue-500">{((tax / income) * 100).toFixed(2)}%</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl">
              <span className="text-sm text-gray-400">Health & Education Cess (4%)</span>
              <span className="font-mono font-bold">{formatCurrency(tax * 0.04 / 1.04)}</span>
            </div>
          </div>
        </div>

        <button className="w-full py-4 glass rounded-2xl border border-white/10 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-bold text-sm">
          <IndianRupee size={16} />
          Export IT Filing Plan
        </button>
      </div>
    </div>
  );
}
