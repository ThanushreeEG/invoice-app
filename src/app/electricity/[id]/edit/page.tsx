"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

interface Sender {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

export default function EditElectricityBillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tenantName, setTenantName] = useState("");
  const [multiplier, setMultiplier] = useState(15);
  const [minChargeUnits, setMinChargeUnits] = useState(0);
  const [kva, setKva] = useState(375);
  const [form, setForm] = useState({
    senderId: "",
    buildingId: "",
    month: "",
    year: 2025,
    openingReading: 0,
    closingReading: 0,
    miscUnits: 0,
    ratePerUnit: 0,
    bwssbCharges: 0,
    maintenance: 0,
    dgMaintenance: 0,
    waterCharges: 0,
    invoiceNo: "",
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/electricity/${id}`).then((r) => r.json()),
      fetch("/api/senders").then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
    ]).then(([bill, sendersData, buildingsData]) => {
      if (bill.error) {
        toast.error(bill.error);
        router.push("/electricity");
        return;
      }
      if (bill.status === "SENT") {
        toast.error("Cannot edit a sent bill.");
        router.push("/electricity");
        return;
      }
      setSenders(sendersData);
      setBuildings(buildingsData);
      setTenantName(bill.tenant.name);
      setMultiplier(bill.tenant.elecMultiplier);
      setMinChargeUnits(bill.minChargeUnits);
      setKva(bill.kva);
      setForm({
        senderId: bill.senderId,
        buildingId: bill.buildingId,
        month: bill.month,
        year: bill.year,
        openingReading: bill.openingReading,
        closingReading: bill.closingReading,
        miscUnits: bill.miscUnits,
        ratePerUnit: bill.ratePerUnit,
        bwssbCharges: bill.bwssbCharges,
        maintenance: bill.maintenance,
        dgMaintenance: bill.dgMaintenance,
        waterCharges: bill.waterCharges,
        invoiceNo: bill.invoiceNo || "",
      });
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load bill.");
      setLoading(false);
    });
  }, [id, router]);

  const unitsConsumed = Math.max(0, form.closingReading - form.openingReading);
  const totalUnitsConsumed = unitsConsumed * multiplier;
  const totalUnitsCharged = totalUnitsConsumed + form.miscUnits;
  const totalAmount = totalUnitsCharged * form.ratePerUnit;
  const minimumCharge = minChargeUnits * kva;
  const netPayable = totalAmount + minimumCharge + form.bwssbCharges + form.maintenance + form.dgMaintenance + form.waterCharges;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/electricity/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Bill updated!");
        router.push("/electricity");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update bill.");
      }
    } catch {
      toast.error("Failed to update bill.");
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

  const inputClass = "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Electricity Bill</h1>
      <p className="text-gray-500 mb-6">Tenant: <strong>{tenantName}</strong> | CT Ratio: x{multiplier}</p>

      <form onSubmit={handleSubmit}>
        {/* Sender & Building */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Sender</label>
              <select
                value={form.senderId}
                onChange={(e) => setForm({ ...form, senderId: e.target.value })}
                className={inputClass}
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Building</label>
              <select
                value={form.buildingId}
                onChange={(e) => setForm({ ...form, buildingId: e.target.value })}
                className={inputClass}
              >
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>Month</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                className={inputClass}
              >
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Year</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: parseInt(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Invoice No */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <div>
            <label className={labelClass}>Invoice No</label>
            <input
              type="text"
              value={form.invoiceNo}
              onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
              className={inputClass}
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Readings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Meter Readings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Opening Reading</label>
              <input
                type="number"
                step="0.01"
                value={form.openingReading || ""}
                onChange={(e) => setForm({ ...form, openingReading: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Closing Reading</label>
              <input
                type="number"
                step="0.01"
                value={form.closingReading || ""}
                onChange={(e) => setForm({ ...form, closingReading: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className={labelClass}>Rate per Unit</label>
              <input
                type="number"
                step="0.01"
                value={form.ratePerUnit || ""}
                onChange={(e) => setForm({ ...form, ratePerUnit: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Misc. Units</label>
              <input
                type="number"
                step="0.01"
                value={form.miscUnits || ""}
                onChange={(e) => setForm({ ...form, miscUnits: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Additional charges */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Additional Charges</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>BWSSB Charges</label>
              <input
                type="number"
                step="0.01"
                value={form.bwssbCharges || ""}
                onChange={(e) => setForm({ ...form, bwssbCharges: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Maintenance</label>
              <input
                type="number"
                step="0.01"
                value={form.maintenance || ""}
                onChange={(e) => setForm({ ...form, maintenance: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className={labelClass}>DG Maintenance</label>
              <input
                type="number"
                step="0.01"
                value={form.dgMaintenance || ""}
                onChange={(e) => setForm({ ...form, dgMaintenance: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Water Charges</label>
              <input
                type="number"
                step="0.01"
                value={form.waterCharges || ""}
                onChange={(e) => setForm({ ...form, waterCharges: parseFloat(e.target.value) || 0 })}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Live calculations */}
        {form.closingReading > 0 && form.ratePerUnit > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-700 mb-3">Calculated Summary</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Units Consumed</span>
                <span>{unitsConsumed}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Total Units (x{multiplier})</span>
                <span>{totalUnitsConsumed}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Total Units Charged</span>
                <span>{totalUnitsCharged}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1 pt-2 border-t border-gray-200">
                <span>Amount</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Min Charge ({minChargeUnits} x {kva})</span>
                <span>{formatCurrency(minimumCharge)}</span>
              </div>
              {form.bwssbCharges > 0 && (
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>BWSSB</span>
                  <span>{formatCurrency(form.bwssbCharges)}</span>
                </div>
              )}
              {form.maintenance > 0 && (
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Maintenance</span>
                  <span>{formatCurrency(form.maintenance)}</span>
                </div>
              )}
              {form.dgMaintenance > 0 && (
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>DG Maintenance</span>
                  <span>{formatCurrency(form.dgMaintenance)}</span>
                </div>
              )}
              {form.waterCharges > 0 && (
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Water Charges</span>
                  <span>{formatCurrency(form.waterCharges)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-300 mt-2">
                <span>Net Payable</span>
                <span>{formatCurrency(netPayable)}</span>
              </div>
            </div>
          </div>
        )}

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
            onClick={() => router.push("/electricity")}
            className="px-6 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
