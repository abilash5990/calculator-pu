import {
  Pie,
  PieChart,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  loanAmount: number;
  emi: number;
  totalInterest: number;
  totalPayment: number;
};

export default function LoanSummaryCards({
  loanAmount,
  emi,
  totalInterest,
  totalPayment,
}: Props) {
  const pieData = [
    { name: "Principal", value: loanAmount, color: "#3b82f6" },
    { name: "Interest", value: totalInterest, color: "#8b5cf6" },
  ];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="glass p-8 rounded-3xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-center">
        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">
          Monthly EMI
        </span>
        <div className="text-5xl font-bold mt-2 tracking-tighter">
          {formatCurrency(emi)}
        </div>

        <div className="mt-8 flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Total Interest
            </span>
            <div className="text-lg font-semibold">
              {formatCurrency(totalInterest)}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Total Payment
            </span>
            <div className="text-lg font-semibold">
              {formatCurrency(totalPayment)}
            </div>
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
                contentStyle={{
                  background: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                }}
                itemStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-6 mt-4">
          {pieData.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: item.color }}
              />
              <span className="text-xs font-medium text-gray-500">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

