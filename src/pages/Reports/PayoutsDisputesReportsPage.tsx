import React, { useState, useEffect, useCallback } from "react";
import PageMeta from "../../components/common/PageMeta";
import { reportsApi } from "../../services/api/reportsApi";
import ReportsFilterHeader, { FilterState } from "./ReportsFilterHeader";

const fmt = (n: number) => `${(n || 0).toLocaleString()} EGP`;

export const PayoutsDisputesReportsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [commissionRate, setCommissionRate] = useState(10);

  const [filters, setFilters] = useState<FilterState>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
      venueId: "",
      interval: "day",
    };
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportsApi.getPayoutsAndDisputesReport({
        ...filters,
        commissionRate,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to load payouts & disputes report:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, commissionRate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = data?.summary || {};

  return (
    <>
      <PageMeta title="Venue Owner Payouts & Disputes Report | ArenaHub" description="Owner commission settlements, platform service fees, and customer inquiry dispute tracking" />

      <div className="space-y-6">
        <ReportsFilterHeader
          filters={filters}
          onFilterChange={setFilters}
          onRefresh={fetchData}
          loading={loading}
        />

        {/* Commission Rate Configurator & KPI Cards */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">
          <div>
            <h2 className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
              ⚙️ Platform Commission Rate Settlement Rule
            </h2>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-400">
              Calculates platform service fee withheld from gross court booking revenue.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Commission %:</span>
            <input
              type="number"
              min="0"
              max="50"
              value={commissionRate}
              onChange={(e) => setCommissionRate(Number(e.target.value))}
              className="w-20 px-3 py-1.5 text-xs font-bold rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-center focus:outline-none"
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard icon="💰" label="Gross Venue Revenue" value={fmt(summary.totalGrossRevenue)} sub="Total customer match spend" color="blue" />
          <KpiCard icon="🏦" label="Platform Commission" value={fmt(summary.totalPlatformCommission)} sub={`Earned at ${summary.commissionRatePct || 10}% rate`} color="indigo" />
          <KpiCard icon="🤝" label="Net Payouts to Owners" value={fmt(summary.totalOwnerPayouts)} sub="Owed to venue owners" color="emerald" />
          <KpiCard icon="📩" label="Disputes / Inquiries" value={`${summary.totalDisputes || 0} Inquiries`} sub="Customer contact messages" color="amber" />
        </div>

        {/* Owner Payouts Settlement Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Venue Owner Commission & Payout Ledger
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Financial settlement owed to court creators and partner venue managers</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Owner / Manager</th>
                  <th className="pb-2.5">Pitch Venue</th>
                  <th className="pb-2.5">Bookings</th>
                  <th className="pb-2.5">Gross Revenue</th>
                  <th className="pb-2.5">Platform Fee ({summary.commissionRatePct}%)</th>
                  <th className="pb-2.5">Net Payout Owed</th>
                  <th className="pb-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.ownerPayoutsTable?.docs || []).map((p: any) => (
                  <tr key={p._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 font-bold text-gray-900 dark:text-white">
                      {p.ownerName || "Venue Owner"}
                      {p.ownerEmail && <span className="block text-[10px] text-gray-400">{p.ownerEmail}</span>}
                    </td>
                    <td className="py-2.5">{p.venueName || "Venue"}</td>
                    <td className="py-2.5 font-semibold text-gray-800 dark:text-gray-200">{p.bookingsCount} slots</td>
                    <td className="py-2.5 text-gray-900 dark:text-white font-bold">{fmt(p.grossRevenue)}</td>
                    <td className="py-2.5 text-indigo-600 dark:text-indigo-400 font-semibold">{fmt(p.platformFee)}</td>
                    <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">{fmt(p.netPayoutOwed)}</td>
                    <td className="py-2.5 text-right">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                        {p.payoutStatus || "Ready"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!data?.ownerPayoutsTable?.docs || data.ownerPayoutsTable.docs.length === 0) && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-400">No owner payout records generated for this timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inquiries & Disputes Table */}
        <div className="p-6 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
            Customer Inquiries & Disputes Log
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Customer support contacts and dispute resolution status</p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700/80 text-gray-500 dark:text-gray-400 font-bold uppercase">
                  <th className="pb-2.5">Customer Name</th>
                  <th className="pb-2.5">Phone / Email</th>
                  <th className="pb-2.5">Campaign / Subject</th>
                  <th className="pb-2.5">Message Snippet</th>
                  <th className="pb-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                {(data?.disputesTable?.docs || []).map((d: any) => (
                  <tr key={d._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="py-2.5 font-bold text-gray-900 dark:text-white">{d.name}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400">{d.phone || d.email}</td>
                    <td className="py-2.5 font-semibold text-gray-800 dark:text-gray-200">{d.campaignType || d.company || "General"}</td>
                    <td className="py-2.5 text-gray-500 dark:text-gray-400 max-w-[250px] truncate">{d.message || "N/A"}</td>
                    <td className="py-2.5 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        d.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" :
                        d.status === "CONTACTED" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" :
                        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      }`}>
                        {d.status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!data?.disputesTable?.docs || data.disputesTable.docs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">No customer support disputes recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

function KpiCard({ icon, label, value, sub, color }: { icon: string; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  };

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700/80 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        <span className={`text-base p-1.5 rounded-xl border ${colorMap[color] || ""}`}>{icon}</span>
      </div>
      <div className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{value}</div>
      <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">{sub}</div>
    </div>
  );
}

export default PayoutsDisputesReportsPage;
