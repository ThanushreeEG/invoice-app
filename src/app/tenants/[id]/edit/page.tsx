"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyAddress: "",
    gstNumber: "",
    defaultRent: "",
  });

  useEffect(() => {
    fetch(`/api/tenants/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          name: data.name,
          email: data.email,
          phone: data.phone || "",
          propertyAddress: data.propertyAddress,
          gstNumber: data.gstNumber || "",
          defaultRent: data.defaultRent?.toString() || "",
        });
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load tenant.");
        setLoading(false);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.propertyAddress) {
      toast.error("Please fill in name, email, and property address.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/tenants/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Tenant updated!");
        router.push("/tenants");
      } else {
        toast.error("Failed to update tenant.");
      }
    } catch {
      toast.error("Failed to update tenant.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Tenant</h1>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Tenant / Company Name *</label>
              <input
                type="text"
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Email *</label>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="text"
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div>
              <label className={labelClass}>Property Address *</label>
              <textarea
                className={inputClass}
                rows={2}
                value={form.propertyAddress}
                onChange={(e) =>
                  setForm({ ...form, propertyAddress: e.target.value })
                }
              />
            </div>

            <div>
              <label className={labelClass}>GST Number</label>
              <input
                type="text"
                className={inputClass}
                value={form.gstNumber}
                onChange={(e) =>
                  setForm({ ...form, gstNumber: e.target.value })
                }
              />
            </div>

            <div>
              <label className={labelClass}>Default Monthly Rent</label>
              <input
                type="number"
                step="0.01"
                className={inputClass}
                value={form.defaultRent}
                onChange={(e) =>
                  setForm({ ...form, defaultRent: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/tenants")}
            className="px-6 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
