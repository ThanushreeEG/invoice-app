"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import Link from "next/link";
import SendConfirmModal from "@/components/SendConfirmModal";
import ConfirmModal from "@/components/ConfirmModal";
import StatusBadge from "@/components/StatusBadge";
import type { Pagination } from "@/lib/types";
import { downloadPDF } from "@/lib/downloadPDF";
import PageHeader from "@/components/PageHeader";
import FilterBar from "@/components/FilterBar";
import EmptyState from "@/components/EmptyState";
import LoadingState from "@/components/LoadingState";
import PaginationControls from "@/components/PaginationControls";

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
  tenant: {
    name: string;
    email: string;
    ccEmails: string;
  };
  sender: {
    name: string;
  };
}

export default function ElectricityBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<ElectricityBill[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState<{
    id: string;
    pdfUrl: string;
    title: string;
    email: string;
    ccEmails: string;
  } | null>(null);

  const fetchBills = useCallback((p = page, s = search, st = statusFilter) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", "20");
    if (s) params.set("search", s);
    if (st) params.set("status", st);

    fetch(`/api/electricity?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setBills(data.bills);
        setPagination(data.pagination);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchBills(1, value, statusFilter);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    fetchBills(1, search, value);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchBills(newPage, search, statusFilter);
  };

  const openSendModal = (bill: ElectricityBill) => {
    setSendModal({
      id: bill.id,
      pdfUrl: `/api/electricity/${bill.id}/pdf`,
      title: `Send EB Bill - ${bill.tenant.name} - ${bill.month} ${bill.year}`,
      email: bill.tenant.email,
      ccEmails: bill.tenant.ccEmails,
    });
  };

  const handleSend = async (id: string) => {
    setSendingId(id);
    try {
      const res = await fetch(`/api/electricity/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Bill sent!");
        fetchBills();
      } else {
        toast.error(data.error || "Failed to send.");
      }
    } catch {
      toast.error("Failed to send bill.");
    }
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
      const res = await fetch(`/api/electricity/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Bill deleted!");
        fetchBills();
      } else {
        toast.error(data.error || "Failed to delete.");
      }
    } catch {
      toast.error("Failed to delete bill.");
    }
  };

  const handleDownloadPDF = (id: string, tenantName: string, month: string, year: number) => {
    downloadPDF(`/api/electricity/${id}/pdf`, `Electricity-Bill-${tenantName}-${month}-${year}.pdf`);
  };

  if (loading) {
    return <LoadingState message="Loading electricity bills..." />;
  }

  return (
    <div>
      <PageHeader title="Electricity Bills" actionLabel="+ New Bill" actionHref="/electricity/new" />

      <FilterBar
        search={search}
        onSearch={handleSearch}
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        searchPlaceholder="Search by tenant name..."
        searchLabel="Search electricity bills"
      />

      {bills.length === 0 ? (
        <EmptyState
          message={search || statusFilter ? "No bills match your filters." : "No electricity bills yet."}
          actionLabel={!search && !statusFilter ? "Create Your First Electricity Bill" : undefined}
          actionHref={!search && !statusFilter ? "/electricity/new" : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="bg-white rounded-xl shadow-sm p-5"
                style={{ border: "1px solid var(--border)" }}
              >
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
                      Reading: {bill.openingReading} &rarr; {bill.closingReading} | {bill.totalUnitsCharged} units
                      {bill.tenant.email ? ` | ${bill.tenant.email}` : ""}
                      {!bill.tenant.email && !bill.tenant.ccEmails && " | No email"}
                    </div>
                    {bill.status === "SENT" && bill.sentAt && (
                      <div className="text-xs text-green-700 mt-1">
                        Sent on {new Date(bill.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(bill.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {bill.status === "DRAFT" && (
                      <div className="text-xs text-gray-400 mt-1">
                        Created on {new Date(bill.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(bill.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {bill.status === "FAILED" && (
                      <div className="text-xs text-red-700 mt-1">
                        Failed — created on {new Date(bill.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg font-bold text-gray-800">
                      {formatCurrency(bill.netPayable)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleDownloadPDF(bill.id, bill.tenant.name, bill.month, bill.year)}
                        aria-label={`Download PDF for ${bill.tenant.name} ${bill.month} ${bill.year}`}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => openSendModal(bill)}
                        disabled={sendingId === bill.id || (!bill.tenant.email && !bill.tenant.ccEmails)}
                        title={!bill.tenant.email && !bill.tenant.ccEmails ? "No email configured" : undefined}
                        aria-label={`Send bill to ${bill.tenant.name}`}
                        className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {sendingId === bill.id ? "Sending..." : "Send"}
                      </button>
                      {bill.status !== "SENT" && (
                        <>
                          <button
                            onClick={() => router.push(`/electricity/${bill.id}/edit`)}
                            aria-label={`Edit bill for ${bill.tenant.name}`}
                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(bill.id)}
                            aria-label={`Delete bill for ${bill.tenant.name}`}
                            className="px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <PaginationControls pagination={pagination} currentPage={page} onPageChange={handlePageChange} />
        </>
      )}

      <ConfirmModal
        open={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Electricity Bill"
        message="Are you sure you want to delete this draft electricity bill? This action cannot be undone."
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
