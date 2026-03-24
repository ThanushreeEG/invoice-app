"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import Link from "next/link";
import SendConfirmModal from "@/components/SendConfirmModal";
import ConfirmModal from "@/components/ConfirmModal";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/constants";
import type { Pagination } from "@/lib/types";
import { downloadPDF as downloadPDFUtil } from "@/lib/downloadPDF";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import PaginationControls from "@/components/PaginationControls";

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

export default function WaterBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<WaterBill[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
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

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);
    try {
      const res = await fetch(`/api/water/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) { toast.success("Water bill deleted!"); fetchBills(); } else { toast.error(data.error || "Failed to delete."); }
    } catch { toast.error("Failed to delete water bill."); }
  };

  const downloadPDFFile = (id: string, tenant: string, month: string, year: number) => {
    downloadPDFUtil(`/api/water/${id}/pdf`, `Water-Bill-${tenant}-${month}-${year}.pdf`);
  };

  return (
    <div>
      <PageHeader title="Water Bills" actionLabel="+ New Water Bill" actionHref="/water/new" />

      <FilterBar
        search={search}
        onSearch={handleSearch}
        statusFilter={status}
        onStatusFilter={handleStatus}
        searchPlaceholder="Search by tenant name..."
        searchLabel="Search water bills"
      />

      {loading ? (
        <LoadingState message="Loading water bills..." />
      ) : bills.length === 0 ? (
        <EmptyState
          message={search || status ? "No water bills match your filters." : "No water bills yet."}
          actionLabel={!search && !status ? "Create your first water bill" : undefined}
          actionHref={!search && !status ? "/water/new" : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {bills.map((bill) => (
              <div key={bill.id} className="bg-white rounded-xl shadow-sm p-5" style={{ border: "1px solid var(--border)" }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        {bill.month} {bill.year}
                      </span>
                      <StatusBadge status={bill.status} />
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{bill.sender.name}</span> &rarr; {bill.tenant.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {bill.tenant.email ? bill.tenant.email : <span className="text-red-400 text-xs">No email</span>}
                      {bill.invoiceNo ? ` | Invoice: ${bill.invoiceNo}` : ""}
                    </div>
                    {bill.status === "SENT" && bill.sentAt && (
                      <div className="text-xs text-green-600 mt-1">
                        Sent {formatDate(bill.sentAt)}
                      </div>
                    )}
                    {bill.status === "DRAFT" && (
                      <div className="text-xs text-gray-400 mt-1">
                        Created {formatDate(bill.createdAt)}
                      </div>
                    )}
                    {bill.status === "FAILED" && (
                      <div className="text-xs text-red-600 mt-1">
                        Failed — created {formatDate(bill.createdAt)}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg font-bold text-gray-800">
                      {formatCurrency(bill.netPayable)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => downloadPDFFile(bill.id, bill.tenant.name, bill.month, bill.year)}
                        aria-label={`Download PDF for water bill ${bill.month} ${bill.year}`}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">PDF</button>
                      <button onClick={() => openSendModal(bill)}
                        disabled={sendingId === bill.id || (!bill.tenant.email && !bill.tenant.ccEmails)}
                        title={!bill.tenant.email && !bill.tenant.ccEmails ? "No email configured for this tenant" : undefined}
                        aria-label={`Send water bill ${bill.month} ${bill.year}`}
                        className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50">
                        {sendingId === bill.id ? "Sending..." : "Send"}
                      </button>
                      {bill.status !== "SENT" && (
                        <>
                          <button onClick={() => router.push(`/water/${bill.id}/edit`)}
                            aria-label={`Edit water bill ${bill.month} ${bill.year}`}
                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">Edit</button>
                          <button onClick={() => handleDelete(bill.id)}
                            aria-label={`Delete water bill ${bill.month} ${bill.year}`}
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <PaginationControls pagination={pagination} currentPage={page} onPageChange={handlePage} />
        </>
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Water Bill"
        message="Are you sure you want to delete this draft water bill? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

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
