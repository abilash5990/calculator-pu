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

type Props = {
  records: LoanRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function LoanHistoryTable({
  records,
  selectedId,
  onSelect,
}: Props) {
  return (
    <div className="glass p-8 rounded-3xl border border-white/10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h4 className="font-bold">Saved History</h4>
      </div>

      {records.length === 0 ? (
        <div className="text-sm text-gray-500">No saved loans yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 uppercase tracking-widest text-[11px]">
                <th className="pb-3">Created</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Rate</th>
                <th className="pb-3">Tenure</th>
                <th className="pb-3">EMI</th>
                <th className="pb-3">Total Payment</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const created = new Date(r.createdAt).toLocaleString();
                const selected = r.id === selectedId;
                return (
                  <tr
                    key={r.id}
                    className={selected ? "bg-white/5" : undefined}
                  >
                    <td className="py-3 pr-4 text-gray-500">{created}</td>
                    <td className="py-3 pr-4 font-mono">
                      {new Intl.NumberFormat("en-IN", {
                        style: "currency",
                        currency: "INR",
                        maximumFractionDigits: 0,
                      }).format(r.loanAmount)}
                    </td>
                    <td className="py-3 pr-4 font-mono">{r.interestRate}%</td>
                    <td className="py-3 pr-4 font-mono">{r.tenure}y</td>
                    <td className="py-3 pr-4 font-mono">{r.emi}</td>
                    <td className="py-3 pr-4 font-mono">{r.totalPayment}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => onSelect(r.id)}
                        className={`px-3 py-2 rounded-xl border transition-all text-xs font-bold ${
                          selected
                            ? "bg-blue-500 text-white border-blue-500/60"
                            : "glass border-white/10 hover:bg-white/5 text-gray-300"
                        }`}
                      >
                        {selected ? "Selected" : "Select"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

