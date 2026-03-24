"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import Link from "next/link";
import SendConfirmModal from "@/components/SendConfirmModal";
import ConfirmModal from "@/components/ConfirmModal";
import StatusBadge from "@/components/StatusBadge";
import { STATUS_OPTIONS, MONTHS as MONTH_NAMES, MONTH_SHORT, formatDate } from "@/lib/constants";

interface Invoice {
  id: string;
  invoiceNumber: string;
  month: string;
  year: number;
  baseRent: number;
  totalAmount: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  tenant: { name: string; email: string; ccEmails: string };
  sender: { name: string };
}

interface ElectricityBill {
  id: string;
  month: string;
  year: number;
  openingReading: number;
  closingReading: number;
  totalUnitsCharged: number;
  netPayable: number;
  status: string;
  sentAt: string | null;
  createdAt: string;
  tenant: { name: string; email: string; ccEmails: string };
  sender: { name: string };
}

interface WaterBill {
  id: string;
  month: string;
  year: number;
  waterCharges: number;
  netPayable: number;
  invoiceNo: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
  tenant: { name: string; email: string; ccEmails: string };
  sender: { name: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}


export default function HistoryPage() {
  const router = useRouter();
  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState(now.toLocaleString("en-US", { month: "long" }).toUpperCase());
  const [periodYear, setPeriodYear] = useState(now.getFullYear());

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invPagination, setInvPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [invPage, setInvPage] = useState(1);
  const [invSearch, setInvSearch] = useState("");
  const [invStatus, setInvStatus] = useState("");
  const [invLoading, setInvLoading] = useState(true);
  const [invSendingId, setInvSendingId] = useState<string | null>(null);

  // EB Bill state
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [ebPagination, setEbPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [ebPage, setEbPage] = useState(1);
  const [ebSearch, setEbSearch] = useState("");
  const [ebStatus, setEbStatus] = useState("");
  const [ebLoading, setEbLoading] = useState(true);
  const [ebSendingId, setEbSendingId] = useState<string | null>(null);

  // Water Bill state
  const [waterBills, setWaterBills] = useState<WaterBill[]>([]);
  const [wbPagination, setWbPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [wbPage, setWbPage] = useState(1);
  const [wbSearch, setWbSearch] = useState("");
  const [wbStatus, setWbStatus] = useState("");
  const [wbLoading, setWbLoading] = useState(true);
  const [wbSendingId, setWbSendingId] = useState<string | null>(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{ type: "invoice" | "eb" | "water"; id: string } | null>(null);

  // Send modal state
  const [sendModal, setSendModal] = useState<{
    type: "invoice" | "eb" | "water";
    id: string;
    pdfUrl: string;
    title: string;
    email: string;
    ccEmails: string;
  } | null>(null);

  // Fetch invoices
  const fetchInvoices = useCallback((p = invPage, s = invSearch, st = invStatus) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", "10");
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    if (periodMonth) params.set("month", periodMonth);
    if (periodYear) params.set("year", String(periodYear));
    fetch(`/api/invoices?${params}`)
      .then((res) => res.json())
      .then((data) => { setInvoices(data.invoices); setInvPagination(data.pagination); setInvLoading(false); })
      .catch(() => setInvLoading(false));
  }, [invPage, invSearch, invStatus, periodMonth, periodYear]);

  // Fetch EB bills
  const fetchBills = useCallback((p = ebPage, s = ebSearch, st = ebStatus) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", "10");
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    if (periodMonth) params.set("month", periodMonth);
    if (periodYear) params.set("year", String(periodYear));
    fetch(`/api/electricity?${params}`)
      .then((res) => res.json())
      .then((data) => { setBills(data.bills); setEbPagination(data.pagination); setEbLoading(false); })
      .catch(() => setEbLoading(false));
  }, [ebPage, ebSearch, ebStatus, periodMonth, periodYear]);

  // Fetch Water Bills
  const fetchWaterBills = useCallback((p = wbPage, s = wbSearch, st = wbStatus) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", "10");
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    if (periodMonth) params.set("month", periodMonth);
    if (periodYear) params.set("year", String(periodYear));
    fetch(`/api/water?${params}`)
      .then((res) => res.json())
      .then((data) => { setWaterBills(data.bills); setWbPagination(data.pagination); setWbLoading(false); })
      .catch(() => setWbLoading(false));
  }, [wbPage, wbSearch, wbStatus, periodMonth, periodYear]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { fetchBills(); }, [fetchBills]);
  useEffect(() => { fetchWaterBills(); }, [fetchWaterBills]);

  // Invoice handlers
  const handleInvSearch = (v: string) => { setInvSearch(v); setInvPage(1); fetchInvoices(1, v, invStatus); };
  const handleInvStatus = (v: string) => { setInvStatus(v); setInvPage(1); fetchInvoices(1, invSearch, v); };
  const handleInvPage = (p: number) => { setInvPage(p); fetchInvoices(p, invSearch, invStatus); };

  const openInvSendModal = (inv: Invoice) => {
    setSendModal({
      type: "invoice",
      id: inv.id,
      pdfUrl: `/api/invoices/${inv.id}/pdf`,
      title: `Send Invoice #${inv.invoiceNumber}`,
      email: inv.tenant.email,
      ccEmails: inv.tenant.ccEmails,
    });
  };

  const handleInvSend = async (id: string) => {
    setInvSendingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { toast.success("Invoice sent!"); fetchInvoices(); } else { toast.error(data.error || "Failed to send."); }
    } catch { toast.error("Failed to send invoice."); }
    setInvSendingId(null);
    setSendModal(null);
  };

  const handleInvDelete = (id: string) => {
    setDeleteTarget({ type: "invoice", id });
  };

  // EB handlers
  const handleEbSearch = (v: string) => { setEbSearch(v); setEbPage(1); fetchBills(1, v, ebStatus); };
  const handleEbStatus = (v: string) => { setEbStatus(v); setEbPage(1); fetchBills(1, ebSearch, v); };
  const handleEbPage = (p: number) => { setEbPage(p); fetchBills(p, ebSearch, ebStatus); };

  const openEbSendModal = (bill: ElectricityBill) => {
    setSendModal({
      type: "eb",
      id: bill.id,
      pdfUrl: `/api/electricity/${bill.id}/pdf`,
      title: `Send EB Bill - ${bill.tenant.name} - ${bill.month} ${bill.year}`,
      email: bill.tenant.email,
      ccEmails: bill.tenant.ccEmails,
    });
  };

  const handleEbSend = async (id: string) => {
    setEbSendingId(id);
    try {
      const res = await fetch(`/api/electricity/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { toast.success("Bill sent!"); fetchBills(); } else { toast.error(data.error || "Failed to send."); }
    } catch { toast.error("Failed to send bill."); }
    setEbSendingId(null);
    setSendModal(null);
  };

  const handleEbDelete = (id: string) => {
    setDeleteTarget({ type: "eb", id });
  };

  // Water Bill handlers
  const handleWbSearch = (v: string) => { setWbSearch(v); setWbPage(1); fetchWaterBills(1, v, wbStatus); };
  const handleWbStatus = (v: string) => { setWbStatus(v); setWbPage(1); fetchWaterBills(1, wbSearch, v); };
  const handleWbPage = (p: number) => { setWbPage(p); fetchWaterBills(p, wbSearch, wbStatus); };

  const openWbSendModal = (bill: WaterBill) => {
    setSendModal({
      type: "water",
      id: bill.id,
      pdfUrl: `/api/water/${bill.id}/pdf`,
      title: `Send Water Bill - ${bill.tenant.name} - ${bill.month} ${bill.year}`,
      email: bill.tenant.email,
      ccEmails: bill.tenant.ccEmails,
    });
  };

  const handleWbSend = async (id: string) => {
    setWbSendingId(id);
    try {
      const res = await fetch(`/api/water/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { toast.success("Water bill sent!"); fetchWaterBills(); } else { toast.error(data.error || "Failed to send."); }
    } catch { toast.error("Failed to send water bill."); }
    setWbSendingId(null);
    setSendModal(null);
  };

  const handleWbDelete = (id: string) => {
    setDeleteTarget({ type: "water", id });
  };

  const confirmHistoryDelete = async () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    setDeleteTarget(null);
    try {
      const endpoint = type === "invoice" ? "invoices" : type === "eb" ? "electricity" : "water";
      const res = await fetch(`/api/${endpoint}/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Deleted!");
        if (type === "invoice") fetchInvoices();
        else if (type === "eb") fetchBills();
        else fetchWaterBills();
      } else {
        toast.error(data.error || "Failed to delete.");
      }
    } catch {
      toast.error("Failed to delete.");
    }
  };

  // Download helpers
  const downloadInvPDF = (id: string, num: string) => {
    const a = document.createElement("a"); a.href = `/api/invoices/${id}/pdf`; a.download = `Invoice-${num}.pdf`; a.click();
  };
  const downloadEbPDF = (id: string, tenant: string, month: string, year: number) => {
    const a = document.createElement("a"); a.href = `/api/electricity/${id}/pdf`; a.download = `EB-Bill-${tenant}-${month}-${year}.pdf`; a.click();
  };
  const downloadWbPDF = (id: string, tenant: string, month: string, year: number) => {
    const a = document.createElement("a"); a.href = `/api/water/${id}/pdf`; a.download = `Water-Bill-${tenant}-${month}-${year}.pdf`; a.click();
  };

  // Shared pagination component
  const PaginationControls = ({ pagination, currentPage, onPageChange }: { pagination: Pagination; currentPage: number; onPageChange: (p: number) => void }) =>
    pagination.totalPages > 1 ? (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-500">
          {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
        </div>
        <div className="flex gap-2">
          <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50">Prev</button>
          <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= pagination.totalPages} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50">Next</button>
        </div>
      </div>
    ) : null;

  // Shared filter bar
  const FilterBar = ({ search, onSearch, status, onStatus, placeholder }: { search: string; onSearch: (v: string) => void; status: string; onStatus: (v: string) => void; placeholder: string }) => (
    <div className="flex flex-col sm:flex-row gap-3 mb-3">
      <input
        type="text" value={search} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex gap-2">
        {STATUS_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => onStatus(opt.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${status === opt.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >{opt.label}</button>
        ))}
      </div>
    </div>
  );

  const goToPrevMonth = () => {
    const idx = MONTH_NAMES.indexOf(periodMonth);
    if (idx === 0) { setPeriodMonth(MONTH_NAMES[11]); setPeriodYear(periodYear - 1); }
    else { setPeriodMonth(MONTH_NAMES[idx - 1]); }
  };
  const goToNextMonth = () => {
    const idx = MONTH_NAMES.indexOf(periodMonth);
    if (idx === 11) { setPeriodMonth(MONTH_NAMES[0]); setPeriodYear(periodYear + 1); }
    else { setPeriodMonth(MONTH_NAMES[idx + 1]); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Bill History</h1>
        <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm px-2 py-1.5" style={{ border: "1px solid var(--border)" }}>
          <button onClick={goToPrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Previous month">
            &larr;
          </button>
          <div className="flex items-center gap-2 px-3">
            <select value={periodMonth} onChange={(e) => setPeriodMonth(e.target.value)}
              aria-label="Select month"
              className="text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer">
              {MONTH_NAMES.map((m) => <option key={m} value={m}>{MONTH_SHORT[m]}</option>)}
            </select>
            <select value={periodYear} onChange={(e) => setPeriodYear(parseInt(e.target.value))}
              aria-label="Select year"
              className="text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none cursor-pointer">
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={goToNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Next month">
            &rarr;
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* INVOICES SECTION */}
      {/* ═══════════════════════════════════════ */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Rent Invoices</h2>
          <Link href="/invoices/new" className="px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">+ New Invoice</Link>
        </div>

        <FilterBar search={invSearch} onSearch={handleInvSearch} status={invStatus} onStatus={handleInvStatus} placeholder="Search by invoice # or tenant..." />

        {invLoading ? (
          <div className="text-gray-500 text-sm py-6 text-center" role="status" aria-live="polite">Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm" style={{ border: "1px solid var(--border)" }}>
            {invSearch || invStatus ? "No invoices match your filters." : "No invoices yet."}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-gray-600 text-xs uppercase" style={{ background: "var(--surface-secondary)" }}>
                    <th className="text-left px-4 py-3 font-semibold">Invoice #</th>
                    <th className="text-left px-4 py-3 font-semibold">Tenant</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Landlord</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Period</th>
                    <th className="text-right px-4 py-3 font-semibold">Amount</th>
                    <th className="text-center px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-t hover:bg-gray-50" style={{ borderColor: "var(--border-light)" }}>
                      <td className="px-4 py-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3">
                        <div>{inv.tenant.name}</div>
                        <div className="text-xs text-gray-400 sm:hidden">{inv.sender.name}</div>
                        {inv.status === "SENT" && inv.sentAt && <div className="text-xs text-green-700">Sent {formatDate(inv.sentAt)}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.sender.name}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.month} {inv.year}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(inv.totalAmount)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={inv.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => downloadInvPDF(inv.id, inv.invoiceNumber)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">PDF</button>
                          <button onClick={() => openInvSendModal(inv)} disabled={invSendingId === inv.id || (!inv.tenant.email && !inv.tenant.ccEmails)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50">
                            {invSendingId === inv.id ? "..." : "Send"}
                          </button>
                          {inv.status !== "SENT" && (
                            <>
                              <button onClick={() => router.push(`/invoices/${inv.id}/edit`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">Edit</button>
                              <button onClick={() => handleInvDelete(inv.id)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">Del</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={invPagination} currentPage={invPage} onPageChange={handleInvPage} />
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* ELECTRICITY BILLS SECTION */}
      {/* ═══════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Electricity / Water Bills</h2>
          <Link href="/electricity/new" className="px-4 py-2 bg-orange-700 text-white rounded-lg text-sm font-medium hover:bg-orange-800 transition-colors">+ New EB Bill</Link>
        </div>

        <FilterBar search={ebSearch} onSearch={handleEbSearch} status={ebStatus} onStatus={handleEbStatus} placeholder="Search by tenant name..." />

        {ebLoading ? (
          <div className="text-gray-500 text-sm py-6 text-center" role="status" aria-live="polite">Loading electricity bills...</div>
        ) : bills.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm" style={{ border: "1px solid var(--border)" }}>
            {ebSearch || ebStatus ? "No bills match your filters." : "No electricity bills yet."}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-gray-600 text-xs uppercase" style={{ background: "var(--surface-secondary)" }}>
                    <th className="text-left px-4 py-3 font-semibold">Tenant</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Period</th>
                    <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Reading</th>
                    <th className="text-right px-4 py-3 font-semibold">Net Payable</th>
                    <th className="text-center px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bills.map((bill) => (
                    <tr key={bill.id} className="border-t hover:bg-gray-50" style={{ borderColor: "var(--border-light)" }}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{bill.tenant.name}</div>
                        {bill.status === "SENT" && bill.sentAt && <div className="text-xs text-green-700">Sent {formatDate(bill.sentAt)}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{bill.month} {bill.year}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{bill.openingReading} &rarr; {bill.closingReading}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(bill.netPayable)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={bill.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => downloadEbPDF(bill.id, bill.tenant.name, bill.month, bill.year)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">PDF</button>
                          <button onClick={() => openEbSendModal(bill)} disabled={ebSendingId === bill.id || (!bill.tenant.email && !bill.tenant.ccEmails)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50">
                            {ebSendingId === bill.id ? "..." : "Send"}
                          </button>
                          {bill.status !== "SENT" && (
                            <>
                              <button onClick={() => router.push(`/electricity/${bill.id}/edit`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">Edit</button>
                              <button onClick={() => handleEbDelete(bill.id)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">Del</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={ebPagination} currentPage={ebPage} onPageChange={handleEbPage} />
          </>
        )}
      </section>

      {/* ═══════════════════════════════════════ */}
      {/* WATER BILLS SECTION */}
      {/* ═══════════════════════════════════════ */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Water Bills</h2>
          <Link href="/water/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">+ New Water Bill</Link>
        </div>

        <FilterBar search={wbSearch} onSearch={handleWbSearch} status={wbStatus} onStatus={handleWbStatus} placeholder="Search by tenant name..." />

        {wbLoading ? (
          <div className="text-gray-500 text-sm py-6 text-center" role="status" aria-live="polite">Loading water bills...</div>
        ) : waterBills.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center text-gray-500 text-sm" style={{ border: "1px solid var(--border)" }}>
            {wbSearch || wbStatus ? "No water bills match your filters." : "No water bills yet."}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="text-gray-600 text-xs uppercase" style={{ background: "var(--surface-secondary)" }}>
                    <th className="text-left px-4 py-3 font-semibold">Tenant</th>
                    <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Period</th>
                    <th className="text-right px-4 py-3 font-semibold">Net Payable</th>
                    <th className="text-center px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {waterBills.map((bill) => (
                    <tr key={bill.id} className="border-t hover:bg-gray-50" style={{ borderColor: "var(--border-light)" }}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{bill.tenant.name}</div>
                        {bill.status === "SENT" && bill.sentAt && <div className="text-xs text-green-700">Sent {formatDate(bill.sentAt)}</div>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{bill.month} {bill.year}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(bill.netPayable)}</td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={bill.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => downloadWbPDF(bill.id, bill.tenant.name, bill.month, bill.year)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">PDF</button>
                          <button onClick={() => openWbSendModal(bill)} disabled={wbSendingId === bill.id || (!bill.tenant.email && !bill.tenant.ccEmails)}
                            className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50">
                            {wbSendingId === bill.id ? "..." : "Send"}
                          </button>
                          {bill.status !== "SENT" && (
                            <>
                              <button onClick={() => router.push(`/water/${bill.id}/edit`)} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">Edit</button>
                              <button onClick={() => handleWbDelete(bill.id)} className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-medium hover:bg-red-100">Del</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationControls pagination={wbPagination} currentPage={wbPage} onPageChange={handleWbPage} />
          </>
        )}
      </section>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmHistoryDelete}
        title={`Delete ${deleteTarget?.type === "invoice" ? "Invoice" : deleteTarget?.type === "eb" ? "Electricity Bill" : "Water Bill"}`}
        message="Are you sure you want to delete this draft? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <SendConfirmModal
        open={sendModal !== null}
        onClose={() => setSendModal(null)}
        onConfirm={() => {
          if (!sendModal) return;
          if (sendModal.type === "invoice") handleInvSend(sendModal.id);
          else if (sendModal.type === "eb") handleEbSend(sendModal.id);
          else handleWbSend(sendModal.id);
        }}
        pdfUrl={sendModal?.pdfUrl}
        title={sendModal?.title || ""}
        recipientEmail={sendModal?.email || ""}
        ccEmails={sendModal?.ccEmails}
        sending={invSendingId !== null || ebSendingId !== null || wbSendingId !== null}
      />
    </div>
  );
}
