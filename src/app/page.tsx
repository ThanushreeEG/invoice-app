"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/formatCurrency";
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

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

const MONTH_SHORT: Record<string, string> = {
  JANUARY: "Jan", FEBRUARY: "Feb", MARCH: "Mar", APRIL: "Apr",
  MAY: "May", JUNE: "Jun", JULY: "Jul", AUGUST: "Aug",
  SEPTEMBER: "Sep", OCTOBER: "Oct", NOVEMBER: "Nov", DECEMBER: "Dec",
};

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
}

export default function DashboardPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[now.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      SENT: "bg-green-100 text-green-700 border border-green-200",
      FAILED: "bg-red-100 text-red-700 border border-red-200",
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

  const grandTotal = data ? data.totalInvoiced + data.totalEb + data.totalWater : 0;

  return (
    <div>
      {/* Header with month picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm border border-gray-200 px-2 py-1.5">
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
              className="text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m}>{MONTH_SHORT[m]}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400 text-lg">Loading...</div>
        </div>
      ) : (
        <>
          {/* Grand Total Banner */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 mb-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">
                Total Billed &mdash; {MONTH_SHORT[selectedMonth]} {selectedYear}
              </span>
            </div>
            <div className="text-4xl font-bold">{formatCurrency(grandTotal)}</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3 text-sm opacity-80">
              <span>Rent: {formatCurrency(data.totalInvoiced)}</span>
              <span>EB: {formatCurrency(data.totalEb)}</span>
              <span>Water: {formatCurrency(data.totalWater)}</span>
            </div>
          </div>

          {/* GST Breakdown */}
          {data.invoiceCount > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
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
                  <div className="text-lg font-bold text-amber-600">{formatCurrency(data.totalCgst)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">SGST (9%)</div>
                  <div className="text-lg font-bold text-amber-600">{formatCurrency(data.totalSgst)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Total GST Collected</div>
                  <div className="text-lg font-bold text-red-600">{formatCurrency(data.totalCgst + data.totalSgst)}</div>
                </div>
              </div>
            </div>
          )}

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Tenants</span>
              </div>
              <div className="text-3xl font-bold text-gray-800">{data.totalTenants}</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-green-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Invoices</span>
              </div>
              <div className="text-3xl font-bold text-gray-800">{data.invoiceCount}</div>
              <div className="text-sm text-green-600 font-medium mt-1">{formatCurrency(data.totalInvoiced)}</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-orange-100 p-2 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">EB Bills</span>
              </div>
              <div className="text-3xl font-bold text-gray-800">{data.ebCount}</div>
              <div className="text-sm text-orange-600 font-medium mt-1">{formatCurrency(data.totalEb)}</div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  <Droplets className="w-5 h-5 text-teal-600" />
                </div>
                <span className="text-sm text-gray-500">Water Bills</span>
              </div>
              <div className="text-3xl font-bold text-gray-800">{data.waterCount}</div>
              <div className="text-sm text-teal-600 font-medium mt-1">{formatCurrency(data.totalWater)}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Link
              href="/invoices/new"
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-green-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-green-100 p-2.5 rounded-xl group-hover:bg-green-200 transition-colors">
                  <PlusCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">New Invoice</div>
                  <div className="text-xs text-gray-400">Rent invoice</div>
                </div>
              </div>
            </Link>
            <Link
              href="/electricity/new"
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-orange-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-orange-100 p-2.5 rounded-xl group-hover:bg-orange-200 transition-colors">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">EB Bill</div>
                  <div className="text-xs text-gray-400">Electricity bill</div>
                </div>
              </div>
            </Link>
            <Link
              href="/water/new"
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-teal-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-teal-100 p-2.5 rounded-xl group-hover:bg-teal-200 transition-colors">
                  <Droplets className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <div className="font-semibold text-gray-800">Water Bill</div>
                  <div className="text-xs text-gray-400">Water charges</div>
                </div>
              </div>
            </Link>
            <Link
              href="/tenants"
              className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
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
                <h2 className="text-lg font-semibold text-gray-800">Invoices</h2>
                <Link href="/invoices" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </Link>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-sm text-gray-600">
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Invoice #</th>
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">Period</th>
                      <th className="text-right px-4 py-3 font-semibold" scope="col">Amount</th>
                      <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentInvoices.map((inv) => (
                      <tr key={inv.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{inv.invoiceNumber}</td>
                        <td className="px-4 py-3 text-sm">{inv.tenant.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{inv.month} {inv.year}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                        <td className="px-4 py-3 text-center">{statusBadge(inv.status)}</td>
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
                <h2 className="text-lg font-semibold text-gray-800">Electricity Bills</h2>
                <Link href="/electricity" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </Link>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-sm text-gray-600">
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">Period</th>
                      <th className="text-right px-4 py-3 font-semibold" scope="col">Net Payable</th>
                      <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentBills.map((bill) => (
                      <tr key={bill.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{bill.tenant.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{bill.month} {bill.year}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(bill.netPayable)}</td>
                        <td className="px-4 py-3 text-center">{statusBadge(bill.status)}</td>
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
                <h2 className="text-lg font-semibold text-gray-800">Water Bills</h2>
                <Link href="/water" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View All
                </Link>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-sm text-gray-600">
                      <th className="text-left px-4 py-3 font-semibold" scope="col">Tenant</th>
                      <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell" scope="col">Period</th>
                      <th className="text-right px-4 py-3 font-semibold" scope="col">Net Payable</th>
                      <th className="text-center px-4 py-3 font-semibold" scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentWaterBills.map((bill) => (
                      <tr key={bill.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{bill.tenant.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden sm:table-cell">{bill.month} {bill.year}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(bill.netPayable)}</td>
                        <td className="px-4 py-3 text-center">{statusBadge(bill.status)}</td>
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
        </>
      )}
    </div>
  );
}
