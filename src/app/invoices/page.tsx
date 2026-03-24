"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import Link from "next/link";
import SendConfirmModal from "@/components/SendConfirmModal";

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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this draft invoice?")) return;
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
    const link = document.createElement("a");
    link.href = `/api/invoices/${id}/pdf`;
    link.download = `Invoice-${invoiceNumber}.pdf`;
    link.click();
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: "bg-yellow-100 text-yellow-700",
      SENT: "bg-green-100 text-green-700",
      FAILED: "bg-red-100 text-red-700",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || "bg-gray-100 text-gray-700"}`}
      >
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-500">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Invoice History</h1>
        <Link
          href="/invoices/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-base"
        >
          + New Invoice
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by invoice # or tenant name..."
          aria-label="Search invoices"
          className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleStatusFilter(opt.value)}
              aria-label={`Filter by ${opt.label}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <p className="text-lg text-gray-500 mb-4">
            {search || statusFilter ? "No invoices match your filters." : "No invoices yet."}
          </p>
          {!search && !statusFilter && (
            <Link
              href="/invoices/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Create Your First Invoice
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">
                        Invoice #{invoice.invoiceNumber}
                      </span>
                      {statusBadge(invoice.status)}
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
                      <div className="text-xs text-green-600 mt-1">
                        Sent on {new Date(invoice.sentAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(invoice.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {invoice.status === "DRAFT" && (
                      <div className="text-xs text-gray-400 mt-1">
                        Created on {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(invoice.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {invoice.status === "FAILED" && (
                      <div className="text-xs text-red-600 mt-1">
                        Failed — created on {new Date(invoice.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} at {new Date(invoice.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold text-gray-800">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                    <div className="flex gap-2">
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
                            className="px-3 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= pagination.totalPages}
                  aria-label="Next page"
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

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
