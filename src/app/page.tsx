"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import { MONTHS, MONTH_SHORT } from "@/lib/constants";
import StatusBadge from "@/components/StatusBadge";
import {
  Users,
  FileText,
  Zap,
  Droplets,
  TrendingUp,
  CalendarDays,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface DashboardData {
  totalTenants: number;
  invoiceCount: number;
  totalBaseRent: number;
  totalCgst: number;
  totalSgst: number;
  totalInvoiced: number;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    month: string;
    year: number;
    totalAmount: number;
    status: string;
    tenant: { name: string };
  }>;
  ebCount: number;
  totalEb: number;
  recentBills: Array<{
    id: string;
    month: string;
    year: number;
    netPayable: number;
    status: string;
    tenant: { name: string };
  }>;
  waterCount: number;
  totalWater: number;
  recentWaterBills: Array<{
    id: string;
    month: string;
    year: number;
    netPayable: number;
    status: string;
    tenant: { name: string };
  }>;
  senderSummaries: Array<{
    id: string;
    name: string;
    invoiceCount: number;
    baseRent: number;
    cgst: number;
    sgst: number;
    total: number;
  }>;
}

export default function DashboardPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSender, setExpandedSender] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${selectedMonth}&year=${selectedYear}`);
      const json = await res.json();
      setData(json);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goToPrevMonth = () => {
    const idx = MONTHS.indexOf(selectedMonth);
    if (idx === 0) {
      setSelectedMonth(MONTHS[11]);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(MONTHS[idx - 1]);
    }
  };

  const goToNextMonth = () => {
    const idx = MONTHS.indexOf(selectedMonth);
    if (idx === 11) {
      setSelectedMonth(MONTHS[0]);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(MONTHS[idx + 1]);
    }
  };

  const grandTotal = data ? data.totalInvoiced + data.totalEb + data.totalWater : 0;

  return (
    <div>
      {/* Header with month picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-2 py-1.5" style={{ border: "1px solid var(--border)" }}>
          <button
            onClick={goToPrevMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <CalendarDays className="w-4 h-4 text-blue-600" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              aria-label="Select month"
              className="text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{MONTH_SHORT[m]}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              aria-label="Select year"
              className="text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <button
            onClick={goToNextMonth}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
          <div className="text-gray-400 text-lg">Loading...</div>
        </div>
      ) : (
        <div className="fade-in">
          {/* Grand Total Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 sm:p-8 mb-6 text-white fade-in">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="w-5 h-5 opacity-80" />
              <span className="text-sm font-medium opacity-80 uppercase tracking-wide">
                Total Billed &mdash; {MONTH_SHORT[selectedMonth]} {selectedYear}
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-extrabold tracking-tight">{formatCurrency(grandTotal)}</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm opacity-80">
              <span>Rent: {formatCurrency(data.totalInvoiced)}</span>
              <span>EB: {formatCurrency(data.totalEb)}</span>
              <span>Water: {formatCurrency(data.totalWater)}</span>
            </div>
          </div>

          {/* GST Breakdown */}
          {data.invoiceCount > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6" style={{ border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                Invoice Breakdown &mdash; {MONTH_SHORT[selectedMonth]} {selectedYear}
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-xs text-gray-400">Base Rent</div>
                  <div className="text-lg font-bold text-gray-800">{formatCurrency(data.totalBaseRent)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">CGST (9%)</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(data.totalCgst)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">SGST (9%)</div>
                  <div className="text-lg font-bold text-blue-600">{formatCurrency(data.totalSgst)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total GST Collected</div>
                  <div className="text-lg font-bold text-red-700">{formatCurrency(data.totalCgst + data.totalSgst)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Landlord Summary */}
          {data.senderSummaries && data.senderSummaries.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6" style={{ border: "1px solid var(--border)" }}>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">
                Landlord Summary &mdash; {MONTH_SHORT[selectedMonth]} {selectedYear}
              </h3>
              <div className="space-y-2">
                {data.senderSummaries.map((sender) => (
                  <div key={sender.id}>
                    <button
                      onClick={() => setExpandedSender(expandedSender === sender.id ? null : sender.id)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                          {sender.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-800">{sender.name}</div>
                          <div className="text-xs text-gray-400">{sender.invoiceCount} invoice{sender.invoiceCount !== 1 ? "s" : ""}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-800">{formatCurrency(sender.total)}</span>
                        <span className="text-gray-400 text-sm">{expandedSender === sender.id ? "▲" : "▼"}</span>
                      </div>
                    </button>
                    {expandedSender === sender.id && (
                      <div className="ml-11 mr-4 mb-2 p-3 rounded-lg" style={{ background: "var(--surface-secondary)" }}>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-gray-400">Base Rent</div>
                            <div className="font-semibold text-gray-800">{formatCurrency(sender.baseRent)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">CGST</div>
                            <div className="font-semibold text-blue-600">{formatCurrency(sender.cgst)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">SGST</div>
                            <div className="font-semibold text-blue-600">{formatCurrency(sender.sgst)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-400">Total GST</div>
                            <div className="font-semibold text-red-700">{formatCurrency(sender.cgst + sender.sgst)}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 card-hover" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2.5 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500 font-medium">Tenants</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.totalTenants}</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 card-hover" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2.5 rounded-lg">
                  <FileText className="w-5 h-5 text-green-700" />
                </div>
                <span className="text-sm text-gray-500 font-medium">Invoices</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.invoiceCount}</div>
              <div className="text-sm text-green-700 font-semibold mt-1">{formatCurrency(data.totalInvoiced)}</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 card-hover" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-100 p-2.5 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-700" />
                </div>
                <span className="text-sm text-gray-500 font-medium">EB Bills</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.ebCount}</div>
              <div className="text-sm text-orange-700 font-semibold mt-1">{formatCurrency(data.totalEb)}</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 card-hover" style={{ border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-cyan-100 p-2.5 rounded-lg">
                  <Droplets className="w-5 h-5 text-cyan-700" />
                </div>
                <span className="text-sm text-gray-500 font-medium">Water Bills</span>
              </div>
              <div className="text-3xl font-extrabold text-gray-900 tracking-tight">{data.waterCount}</div>
              <div className="text-sm text-cyan-700 font-semibold mt-1">{formatCurrency(data.totalWater)}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link
              href="/invoices/new"
              className="group bg-white rounded-xl p-5 card-hover" style={{ border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2.5 rounded-xl group-hover:bg-green-200 transition-colors">
                  <PlusCircle className="w-5 h-5 text-green-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">New Invoice</div>
                  <div className="text-xs text-gray-400">Rent invoice</div>
                </div>
              </div>
            </Link>
            <Link
              href="/electricity/new"
              className="group bg-white rounded-xl p-5 card-hover" style={{ border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-xl group-hover:bg-orange-200 transition-colors">
                  <Zap className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">EB Bill</div>
                  <div className="text-xs text-gray-400">Electricity bill</div>
                </div>
              </div>
            </Link>
            <Link
              href="/water/new"
              className="group bg-white rounded-xl p-5 card-hover" style={{ border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-cyan-100 p-2.5 rounded-xl group-hover:bg-cyan-200 transition-colors">
                  <Droplets className="w-5 h-5 text-cyan-700" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Water Bill</div>
                  <div className="text-xs text-gray-400">Water charges</div>
                </div>
              </div>
            </Link>
            <Link
              href="/tenants"
              className="group bg-white rounded-xl p-5 card-hover" style={{ border: "1px solid var(--border)" }}
            >
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl group-hover:bg-blue-200 transition-colors">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Tenants</div>
                  <div className="text-xs text-gray-400">Manage tenants</div>
                </div>
              </div>
            </Link>
          </div>

          {/* Recent Invoices */}
          {data.recentInvoices.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-5 bg-green-500 rounded-full" />
                  Invoices
                </h2>
                <Link href="/invoices" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </Link>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-gray-600" style={{ background: "var(--surface-secondary)" }}>
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Invoice #</th>
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">Period</th>
                      <th className="text-right px-4 py-3 font-semibold" scope="col">Amount</th>
                      <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentInvoices.map((inv) => (
                      <tr key={inv.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border-light)" }}>
                        <td className="px-4 py-3 text-sm font-medium">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm">{inv.tenant.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{inv.month} {inv.year}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Electricity Bills */}
          {data.recentBills.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-5 bg-orange-500 rounded-full" />
                  Electricity Bills
                </h2>
                <Link href="/electricity" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </Link>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-gray-600" style={{ background: "var(--surface-secondary)" }}>
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">Period</th>
                      <th className="text-right px-4 py-3 font-semibold" scope="col">Net Payable</th>
                      <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBills.map((bill) => (
                      <tr key={bill.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border-light)" }}>
                        <td className="px-4 py-3 text-sm font-medium">{bill.tenant.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{bill.month} {bill.year}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(bill.netPayable)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={bill.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Water Bills */}
          {data.recentWaterBills.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <span className="w-1 h-5 bg-cyan-500 rounded-full" />
                  Water Bills
                </h2>
                <Link href="/water" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </Link>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                <table className="w-full">
                  <thead>
                    <tr className="text-sm text-gray-600" style={{ background: "var(--surface-secondary)" }}>
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">Period</th>
                      <th className="text-right px-4 py-3 font-semibold" scope="col">Net Payable</th>
                      <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentWaterBills.map((bill) => (
                      <tr key={bill.id} className="border-t hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--border-light)" }}>
                        <td className="px-4 py-3 text-sm font-medium">{bill.tenant.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{bill.month} {bill.year}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(bill.netPayable)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={bill.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {data.recentInvoices.length === 0 && data.recentBills.length === 0 && data.recentWaterBills.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg">No bills found for {MONTH_SHORT[selectedMonth]} {selectedYear}</p>
              <p className="text-sm mt-1">Try selecting a different month</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
