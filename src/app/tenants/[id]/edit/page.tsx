"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Building {
  id: string;
  name: string;
  address: string;
}

export default function EditTenantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    ccEmails: "",
    phone: "",
    propertyAddress: "",
    gstNumber: "",
    defaultRent: "",
    defaultDescription: "",
    elecMultiplier: "15",
    elecMinChargeUnits: "0",
    elecKVA: "375",
    elecBWSSB: "0",
    elecMaintenance: "0",
    buildingId: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/tenants/${id}`).then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
    ]).then(([data, buildingsData]) => {
        setBuildings(buildingsData);
        setForm({
          name: data.name,
          email: data.email || "",
          ccEmails: data.ccEmails || "",
          phone: data.phone || "",
          propertyAddress: data.propertyAddress,
          gstNumber: data.gstNumber || "",
          defaultRent: data.defaultRent?.toString() || "",
          defaultDescription: data.defaultDescription || "Amount Charged towards rental of the premises",
          elecMultiplier: data.elecMultiplier?.toString() || "15",
          elecMinChargeUnits: data.elecMinChargeUnits?.toString() || "0",
          elecKVA: data.elecKVA?.toString() || "375",
          elecBWSSB: data.elecBWSSB?.toString() || "0",
          elecMaintenance: data.elecMaintenance?.toString() || "0",
          buildingId: data.buildingId || "",
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
    if (!form.name || !form.propertyAddress) {
      toast.error("Please fill in name and property address.");
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
              <label className={labelClass}>Email</label>
              <input
                type="text"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              />
            </div>

            <div>
              <label className={labelClass}>Building / Property</label>
              <select
                className={inputClass}
                value={form.buildingId}
                onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
              >
                <option value="">-- Select Building --</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}{b.address ? ` — ${b.address.replace(/\n/g, ", ")}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Assign this tenant to a building so they appear when creating bills for that building.
              </p>
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
              <label className={labelClass}>Default Invoice Description</label>
              <input
                type="text"
                className={inputClass}
                value={form.defaultDescription}
                onChange={(e) =>
                  setForm({ ...form, defaultDescription: e.target.value })
                }
                placeholder="Amount Charged towards rental of the premises"
              />
              <p className="text-xs text-gray-400 mt-1">
                This will appear under &quot;Particulars&quot; in invoices.
              </p>
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Electricity Defaults</h2>
          <p className="text-xs text-gray-400 mb-4">
            These values are pre-filled when creating electricity bills for this tenant.
          </p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Multiplication Factor (CT Ratio)</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.elecMultiplier}
                  onChange={(e) => setForm({ ...form, elecMultiplier: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Min Charge Units</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.elecMinChargeUnits}
                  onChange={(e) => setForm({ ...form, elecMinChargeUnits: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>KVA</label>
                <input
                  type="number"
                  className={inputClass}
                  value={form.elecKVA}
                  onChange={(e) => setForm({ ...form, elecKVA: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>BWSSB Charges</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.elecBWSSB}
                  onChange={(e) => setForm({ ...form, elecBWSSB: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>Maintenance Charges</label>
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={form.elecMaintenance}
                  onChange={(e) => setForm({ ...form, elecMaintenance: e.target.value })}
                />
              </div>
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
