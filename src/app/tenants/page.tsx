"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";

interface Tenant {
  id: string;
  name: string;
  email: string;
  ccEmails: string;
  phone: string;
  propertyAddress: string;
  gstNumber: string;
  defaultRent: number;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!confirm(`Are you sure you want to remove ${name}?`)) return;

    const res = await fetch(`/api/tenants/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success(`${name} removed.`);
      fetchTenants();
    } else {
      toast.error("Failed to remove tenant.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-500">Loading tenants...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tenants</h1>
        <Link
          href="/tenants/new"
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors text-base"
        >
          + Add Tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <p className="text-lg text-gray-500 mb-4">
            No tenants added yet.
          </p>
          <Link
            href="/tenants/new"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            Add Your First Tenant
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
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
                    <p className="text-sm text-green-600 font-medium mt-1">
                      Default Rent: {formatCurrency(tenant.defaultRent)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/tenants/${tenant.id}/edit`}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(tenant.id, tenant.name)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
