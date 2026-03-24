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
  tenant: {
    name: string;
    email: string;
    ccEmails: string;
  };
  sender: {
    name: string;
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [periods, setPeriods] = useState<{ month: string; year: number }[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [sendModal, setSendModal] = useState<{
    id: string;
    pdfUrl: string;
    title: string;
    email: string;
    ccEmails: string;
  } | null>(null);

  const fetchInvoices = useCallback((p = page, s = search, st = statusFilter) => {
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", "20");
    if (s) params.set("search", s);
    if (st) params.set("status", st);

    fetch(`/api/invoices?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data.invoices);
        setPagination(data.pagination);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    fetchInvoices(1, value, statusFilter);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    fetchInvoices(1, search, value);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchInvoices(newPage, search, statusFilter);
  };

  const openSendModal = (invoice: Invoice) => {
    setSendModal({
      id: invoice.id,
      pdfUrl: `/api/invoices/${invoice.id}/pdf`,
      title: `Send Invoice #${invoice.invoiceNumber}`,
      email: invoice.tenant.email,
      ccEmails: invoice.tenant.ccEmails,
    });
  };

  const handleResend = async (id: string) => {
    setSendingId(id);
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Invoice sent!");
        fetchInvoices();
      } else {
        toast.error(data.error || "Failed to send.");
      }
    } catch {
      toast.error("Failed to send invoice.");
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
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success("Invoice deleted!");
        fetchInvoices();
      } else {
        toast.error(data.error || "Failed to delete.");
      }
    } catch {
      toast.error("Failed to delete invoice.");
    }
  };

  const handleDownloadPDF = (id: string, invoiceNumber: string) => {
    downloadPDF(`/api/invoices/${id}/pdf`, `Invoice-${invoiceNumber}.pdf`);
  };

  if (loading) {
    return <LoadingState message="Loading invoices..." />;
  }

  return (
    <div>
      <PageHeader title="Invoice History" actionLabel="+ New Invoice" actionHref="/invoices/new" />

      <FilterBar
        search={search}
        onSearch={handleSearch}
        statusFilter={statusFilter}
        onStatusFilter={handleStatusFilter}
        searchPlaceholder="Search by invoice # or tenant name..."
        searchLabel="Search invoices"
      />

      {invoices.length === 0 ? (
        <EmptyState
          message={search || statusFilter ? "No invoices match your filters." : "No invoices yet."}
          actionLabel={!search && !statusFilter ? "Create Your First Invoice" : undefined}
          actionHref={!search && !statusFilter ? "/invoices/new" : undefined}
        />
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-xl shadow-sm p-5"
                style={{ border: "1px solid var(--border)" }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        Invoice #{invoice.invoiceNumber}
                      </span>
                      <StatusBadge status={invoice.status} />
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{invoice.sender.name}</span> &rarr; {invoice.tenant.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {invoice.month} {invoice.year}
                      {invoice.tenant.email ? ` | ${invoice.tenant.email}` : ""}
                      {invoice.tenant.ccEmails ? ` (+${invoice.tenant.ccEmails.split(",").filter((e: string) => e.trim()).length} CC)` : ""}
                      {!invoice.tenant.email && !invoice.tenant.ccEmails && " | No email"}
                    </div>
                    {invoice.status === "SENT" && invoice.sentAt && (
                      <div className="text-xs text-green-700 mt-1">
                        Sent on {new Date(invoice.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(invoice.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {invoice.status === "DRAFT" && (
                      <div className="text-xs text-gray-400 mt-1">
                        Created on {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(invoice.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {invoice.status === "FAILED" && (
                      <div className="text-xs text-red-700 mt-1">
                        Failed — created on {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(invoice.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-lg font-bold text-gray-800">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          handleDownloadPDF(invoice.id, invoice.invoiceNumber)
                        }
                        aria-label={`Download PDF for invoice ${invoice.invoiceNumber}`}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() => openSendModal(invoice)}
                        disabled={sendingId === invoice.id || (!invoice.tenant.email && !invoice.tenant.ccEmails)}
                        title={!invoice.tenant.email && !invoice.tenant.ccEmails ? "No email configured for this tenant" : undefined}
                        aria-label={`Send invoice ${invoice.invoiceNumber}`}
                        className="px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {sendingId === invoice.id ? "Sending..." : "Send"}
                      </button>
                      {invoice.status !== "SENT" && (
                        <>
                          <button
                            onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
                            aria-label={`Edit invoice ${invoice.invoiceNumber}`}
                            className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            aria-label={`Delete invoice ${invoice.invoiceNumber}`}
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
        title="Delete Invoice"
        message="Are you sure you want to delete this draft invoice? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      <SendConfirmModal
        open={sendModal !== null}
        onClose={() => setSendModal(null)}
        onConfirm={() => { if (sendModal) handleResend(sendModal.id); }}
        pdfUrl={sendModal?.pdfUrl}
        title={sendModal?.title || ""}
        recipientEmail={sendModal?.email || ""}
        ccEmails={sendModal?.ccEmails}
        sending={sendingId !== null}
      />
    </div>
  );
}
