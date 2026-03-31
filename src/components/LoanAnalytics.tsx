import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { TrendingUp, DollarSign, Calendar, Percent } from "lucide-react";

export default function LoanAnalytics() {
  const [loanAmount, setLoanAmount] = useState(5000000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [tenure, setTenure] = useState(20);

  const data = useMemo(() => {
    const monthlyRate = interestRate / 12 / 100;
    const numPayments = tenure * 12;
    const emi = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    let balance = loanAmount;
    const chartData = [];
    
    for (let i = 0; i <= tenure; i++) {
      chartData.push({
        year: i,
        balance: Math.round(balance),
      });
      
      // Approximate balance reduction for visualization
      for (let j = 0; j < 12; j++) {
        const interest = balance * monthlyRate;
        const principal = emi - interest;
        balance -= principal;
      }
      if (balance < 0) balance = 0;
    }
    
    return { chartData, emi: Math.round(emi) };
  }, [loanAmount, interestRate, tenure]);

  const pieData = [
    { name: "Principal", value: loanAmount, color: "#3b82f6" },
    { name: "Interest", value: (data.emi * tenure * 12) - loanAmount, color: "#8b5cf6" },
  ];

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="glass p-8 rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="text-blue-500" />
            Loan Parameters
          </h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Loan Amount</label>
              <input 
                type="range" min="100000" max="20000000" step="100000"
                value={loanAmount} onChange={(e) => setLoanAmount(Number(e.target.value))}
                className="w-full h-2 bg-blue-500/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="text-xl font-mono mt-2">{formatCurrency(loanAmount)}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Interest Rate (%)</label>
              <input 
                type="range" min="1" max="20" step="0.1"
                value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))}
                className="w-full h-2 bg-purple-500/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="text-xl font-mono mt-2">{interestRate}%</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Tenure (Years)</label>
              <input 
                type="range" min="1" max="30" step="1"
                value={tenure} onChange={(e) => setTenure(Number(e.target.value))}
                className="w-full h-2 bg-pink-500/20 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <div className="text-xl font-mono mt-2">{tenure} Years</div>
            </div>
          </div>
        </div>

        {/* EMI Summary */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass p-8 rounded-3xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-center">
            <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Monthly EMI</span>
            <div className="text-5xl font-bold mt-2 tracking-tighter">{formatCurrency(data.emi)}</div>
            <div className="mt-8 flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Interest</span>
                <div className="text-lg font-semibold">{formatCurrency(pieData[1].value)}</div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Payment</span>
                <div className="text-lg font-semibold">{formatCurrency(pieData[0].value + pieData[1].value)}</div>
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/10 flex flex-col items-center justify-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-6 mt-4">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs font-medium text-gray-500">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Amortization Graph */}
      <div className="glass p-8 rounded-3xl border border-white/10 h-[400px]">
        <h4 className="font-bold mb-6 flex items-center gap-2">
          <Calendar className="text-blue-500" />
          Balance Projection
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.chartData}>
            <defs>
              <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis 
              dataKey="year" 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              label={{ value: 'Years', position: 'insideBottom', offset: -5, fontSize: 10, fill: '#64748b' }}
            />
            <YAxis 
              stroke="#64748b" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(val) => `â¹${(val / 100000).toFixed(1)}L`}
            />
            <Tooltip 
              contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(val: number) => [formatCurrency(val), "Balance"]}
            />
            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorBalance)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
