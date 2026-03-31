import { TrendingUp, Calculator, LandPlot } from "lucide-react";

export default function Dashboard() {
  return (
    <>
      <div className="lg:col-span-2 space-y-8">
        <div className="glass p-8 rounded-3xl h-[400px] flex items-center justify-center border border-white/10">
          <div className="text-center">
            <TrendingUp size={48} className="mx-auto mb-4 text-blue-500 opacity-50" />
            <h3 className="text-xl font-semibold mb-2">Financial Overview</h3>
            <p className="text-gray-500">Real-time analytics will appear here once data is synced with Google Sheets.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass p-6 rounded-3xl border border-white/10">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Calculator size={18} className="text-blue-500" />
              Quick Calculator
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Estimated Tax</span>
                <div className="text-2xl font-mono mt-1">â¹0.00</div>
              </div>
            </div>
          </div>
          <div className="glass p-6 rounded-3xl border border-white/10">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <LandPlot size={18} className="text-purple-500" />
              Plot Valuation
            </h4>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Market Rate</span>
                <div className="text-2xl font-mono mt-1">â¹0.00 / sqft</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-8">
        <div className="glass p-8 rounded-3xl border border-white/10">
          <h4 className="font-semibold mb-6">Recent Activity</h4>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium">Loan Calculation</div>
                  <div className="text-xs text-gray-500">2 hours ago</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass p-8 rounded-3xl border border-white/10 bg-blue-600/10">
          <h4 className="font-semibold mb-2">Telegram Sync</h4>
          <p className="text-sm text-gray-400 mb-4">Connect your Telegram bot to receive real-time alerts and send commands.</p>
          <button className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold transition-colors">
            Configure Bot
          </button>
        </div>
      </div>
    </>
  );
}
