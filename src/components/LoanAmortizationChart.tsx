import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Calendar } from "lucide-react";

type ChartDatum = { year: number; balance: number };

type Props = {
  chartData: ChartDatum[];
};

export default function LoanAmortizationChart({ chartData }: Props) {
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="glass p-8 rounded-3xl border border-white/10 h-[400px]">
      <h4 className="font-bold mb-6 flex items-center gap-2">
        <Calendar className="text-blue-500" />
        Balance Projection
      </h4>

      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="year"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            label={{
              value: "Years",
              position: "insideBottom",
              offset: -5,
              fontSize: 10,
              fill: "#64748b",
            }}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            // Keep existing tick formatting style from the original component.
            tickFormatter={(val) => `â¹${(val / 100000).toFixed(1)}L`}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
            }}
            itemStyle={{ color: "#fff" }}
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
  );
}

