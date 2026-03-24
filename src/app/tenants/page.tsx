"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import ConfirmModal from "@/components/ConfirmModal";
import PageHeader from "@/components/PageHeader";
import LoadingState from "@/components/LoadingState";
import EmptyState from "@/components/EmptyState";

interface Tenant {
  id: string;
  name: string;
  email: string;
  ccEmails: string;
  phone: string;
  propertyAddress: string;
  gstNumber: string;
  defaultRent: number;
  buildingId: string | null;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchTenants = () => {
    fetch("/api/tenants")
      .then((res) => res.json())
      .then((data) => {
        setTenants(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleDelete = async (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    const res = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${name} removed.`);
      fetchTenants();
    } else {
      toast.error("Failed to remove tenant.");
    }
  };

  if (loading) {
    return <LoadingState message="Loading tenants..." />;
  }

  return (
    <div>
      <PageHeader title="Tenants" actionLabel="+ Add Tenant" actionHref="/tenants/new" />

      {tenants.length === 0 ? (
        <EmptyState message="No tenants added yet." actionLabel="Add Your First Tenant" actionHref="/tenants/new" />
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="bg-white rounded-xl shadow-sm p-5"
              style={{ border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {tenant.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {tenant.email || (!tenant.ccEmails ? "No email — PDF only" : "")}
                    {tenant.email && tenant.ccEmails ? ` (+${tenant.ccEmails.split(",").filter((e) => e.trim()).length} CC)` : ""}
                    {!tenant.email && tenant.ccEmails && (() => {
                      const ccList = tenant.ccEmails.split(",").filter((e) => e.trim());
                      return ccList.length === 1
                        ? ccList[0].trim()
                        : `${ccList[0].trim()} (+${ccList.length - 1} more)`;
                    })()}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {tenant.propertyAddress}
                  </p>
                  {tenant.gstNumber && (
                    <p className="text-xs text-gray-400 mt-1">
                      GST: {tenant.gstNumber}
                    </p>
                  )}
                  {tenant.defaultRent > 0 && (
                    <p className="text-sm text-green-700 font-medium mt-1">
                      Default Rent: {formatCurrency(tenant.defaultRent)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/tenants/${tenant.id}/edit`}
                    className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(tenant.id, tenant.name)}
                    className="px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Remove Tenant"
        message={`Are you sure you want to remove ${deleteTarget?.name ?? "this tenant"}? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}
