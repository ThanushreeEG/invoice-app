"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function NewTenantPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    ccEmails: "",
    phone: "",
    propertyAddress: "",
    gstNumber: "",
    defaultRent: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.propertyAddress) {
      toast.error("Please fill in name and property address.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Tenant added successfully!");
        router.push("/tenants");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add tenant.");
      }
    } catch {
      toast.error("Failed to add tenant.");
    }
    setSaving(false);
  };

  const inputClass =
    "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Add New Tenant</h1>

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
                placeholder="M/S. Pearltri Foods Pvt. Ltd."
              />
            </div>

            <div>
              <label className={labelClass}>Email</label>
              <input
                type="text"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="tenant@company.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                Optional — leave blank if tenant prefers WhatsApp
              </p>
            </div>

            <div>
              <label className={labelClass}>Additional Emails (CC)</label>
              <input
                type="text"
                className={inputClass}
                value={form.ccEmails}
                onChange={(e) => setForm({ ...form, ccEmails: e.target.value })}
                placeholder="person1@co.com, person2@co.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                Comma-separated, e.g. person1@co.com, person2@co.com
              </p>
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
                placeholder="First Floor, No 942, BTM LYT 2nd Stage., Bangalore- 560 029."
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
                placeholder="29AACCH0615F1ZY"
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
                placeholder="60637.50"
              />
              <p className="text-xs text-gray-400 mt-1">
                This will be pre-filled when creating invoices.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Tenant"}
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
