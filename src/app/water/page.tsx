"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import Link from "next/link";
import SendConfirmModal from "@/components/SendConfirmModal";

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

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "FAILED", label: "Failed" },
];

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    DRAFT: "bg-yellow-100 text-yellow-700",
    SENT: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function WaterBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<WaterBill[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [sendModal, setSendModal] = useState<{
    id: string;
    pdfUrl: string;
    title: string;
    email: string;
    ccEmails: string;
  } | null>(null);

  const fetchBills = useCallback((p = page, s = search, st = status) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", "20");
    if (s) params.set("search", s);
    if (st) params.set("status", st);
    fetch(`/api/water?${params}`)
      .then((res) => res.json())
      .then((data) => { setBills(data.bills); setPagination(data.pagination); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, search, status]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); fetchBills(1, v, status); };
  const handleStatus = (v: string) => { setStatus(v); setPage(1); fetchBills(1, search, v); };
  const handlePage = (p: number) => { setPage(p); fetchBills(p, search, status); };

  const openSendModal = (bill: WaterBill) => {
    setSendModal({
      id: bill.id,
      pdfUrl: `/api/water/${bill.id}/pdf`,
      title: `Send Water Bill - ${bill.tenant.name} - ${bill.month} ${bill.year}`,
      email: bill.tenant.email,
      ccEmails: bill.tenant.ccEmails,
    });
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      const res = await fetch(`/api/water/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) { toast.success("Water bill sent!"); fetchBills(); } else { toast.error(data.error || "Failed to send."); }
    } catch { toast.error("Failed to send water bill."); }
    setSendingId(null);
    setSendModal(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft water bill?")) return;
    try {
      const res = await fetch(`/api/water/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { toast.success("Water bill deleted!"); fetchBills(); } else { toast.error(data.error || "Failed to delete."); }
    } catch { toast.error("Failed to delete water bill."); }
  };

  const downloadPDF = (id: string, tenant: string, month: string, year: number) => {
    const a = document.createElement("a"); a.href = `/api/water/${id}/pdf`; a.download = `Water-Bill-${tenant}-${month}-${year}.pdf`; a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Water Bills</h1>
        <Link href="/water/new" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors">
          + New Water Bill
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text" value={search} onChange={(e) => handleSearch(e.target.value)} placeholder="Search by tenant name..."
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => handleStatus(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === opt.value ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-sm py-10 text-center">Loading water bills...</div>
      ) : bills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500">
            {search || status ? "No water bills match your filters." : "No water bills yet."}
          </p>
          {!search && !status && (
            <Link href="/water/new" className="inline-block mt-3 text-teal-600 font-medium hover:text-teal-800">
              Create your first water bill
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bills.map((bill) => (
              <div key={bill.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-gray-800">
                      {bill.month} {bill.year}
                    </div>
                    <div className="text-sm text-gray-500">
                      {bill.sender.name} &rarr; {bill.tenant.name}
                    </div>
                  </div>
                  {statusBadge(bill.status)}
                </div>

                {bill.invoiceNo && (
                  <div className="text-xs text-gray-500 mb-2">Invoice: {bill.invoiceNo}</div>
                )}

                <div className="text-sm text-gray-600 mb-2">
                  {bill.tenant.email ? (
                    <span className="text-gray-500">{bill.tenant.email}</span>
                  ) : (
                    <span className="text-red-400 text-xs">No email</span>
                  )}
                </div>

                <div className="text-xs text-gray-400 mb-3">
                  {bill.status === "SENT" && bill.sentAt
                    ? `Sent ${formatDate(bill.sentAt)}`
                    : bill.status === "FAILED"
                    ? `Failed ${formatDate(bill.createdAt)}`
                    : `Created ${formatDate(bill.createdAt)}`}
                </div>

                <div className="text-2xl font-bold text-teal-700 mb-4">
                  {formatCurrency(bill.netPayable)}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => downloadPDF(bill.id, bill.tenant.name, bill.month, bill.year)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200">PDF</button>
                  <button onClick={() => openSendModal(bill)}
                    disabled={sendingId === bill.id || (!bill.tenant.email && !bill.tenant.ccEmails)}
                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50">
                    {sendingId === bill.id ? "..." : "Send"}
                  </button>
                  {bill.status !== "SENT" && (
                    <>
                      <button onClick={() => router.push(`/water/${bill.id}/edit`)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100">Edit</button>
                      <button onClick={() => handleDelete(bill.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100">Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">Prev</button>
                <button onClick={() => handlePage(page + 1)} disabled={page >= pagination.totalPages}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50">Next</button>
              </div>
            </div>
          )}
        </>
      )}

      <SendConfirmModal
        open={sendModal !== null}
        onClose={() => setSendModal(null)}
        onConfirm={() => { if (sendModal) handleSend(sendModal.id); }}
        pdfUrl={sendModal?.pdfUrl}
        title={sendModal?.title || ""}
        recipientEmail={sendModal?.email || ""}
        ccEmails={sendModal?.ccEmails}
        sending={sendingId !== null}
      />
    </div>
  );
}
