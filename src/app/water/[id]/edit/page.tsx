"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import { MONTHS } from "@/lib/constants";

interface Sender {
  id: string;
  name: string;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface WaterBill {
  id: string;
  senderId: string;
  buildingId: string;
  month: string;
  year: number;
  waterCharges: number;
  netPayable: number;
  invoiceNo: string;
  status: string;
  tenant: { id: string; name: string; propertyAddress: string };
  sender: { id: string; name: string };
  building: { id: string; name: string; address: string } | null;
}

export default function EditWaterBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [bill, setBill] = useState<WaterBill | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [senderId, setSenderId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(2024);
  const [waterCharges, setWaterCharges] = useState(0);
  const [invoiceNo, setInvoiceNo] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/water/${id}`).then((r) => r.json()),
      fetch("/api/senders").then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
    ]).then(([billData, sendersData, buildingsData]) => {
      if (billData.error) {
        toast.error(billData.error);
        router.push("/water");
        return;
      }
      setBill(billData);
      setSenders(sendersData);
      setBuildings(buildingsData);
      setSenderId(billData.senderId);
      setBuildingId(billData.buildingId);
      setMonth(billData.month);
      setYear(billData.year);
      setWaterCharges(billData.waterCharges);
      setInvoiceNo(billData.invoiceNo || "");
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load bill.");
      router.push("/water");
    });
  }, [id, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/water/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId,
          buildingId,
          month,
          year,
          waterCharges,
          invoiceNo,
        }),
      });

      if (res.ok) {
        toast.success("Water bill updated!");
        router.push("/water");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update.");
      }
    } catch {
      toast.error("Failed to update water bill.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!bill) return null;

  if (bill.status === "SENT") {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <p className="text-gray-600 mb-4">This water bill has already been sent and cannot be edited.</p>
        <button onClick={() => router.push("/water")} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300">
          Back to Water Bills
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Edit Water Bill
      </h1>

      {/* Tenant Info */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6">
        <div className="font-semibold text-gray-800">{bill.tenant.name}</div>
        <div className="text-sm text-gray-600">{bill.tenant.propertyAddress}</div>
      </div>

      {/* Sender & Building */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4" style={{ border: "1px solid var(--border)" }}>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Sender & Building</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Sender</label>
            <select value={senderId} onChange={(e) => setSenderId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              {senders.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Building</label>
            <select value={buildingId} onChange={(e) => setBuildingId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Month & Year */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4" style={{ border: "1px solid var(--border)" }}>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Bill Period</h2>
        <div className="flex gap-3">
          <select value={month} onChange={(e) => setMonth(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-28 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Water Charges */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-4" style={{ border: "1px solid var(--border)" }}>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Charges</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Water Charges *</label>
            <input type="number" step="0.01" value={waterCharges || ""}
              onChange={(e) => setWaterCharges(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter water charge amount" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice No</label>
            <input type="text" value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional" />
          </div>
        </div>

        {waterCharges > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Water Charges</span>
              <span>{formatCurrency(waterCharges)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-blue-200 mt-2">
              <span>Net Payable</span>
              <span>{formatCurrency(waterCharges)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={() => router.push("/water")}
          className="px-6 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors">
          Cancel
        </button>
        <button onClick={handleSave} disabled={saving || waterCharges <= 0}
          className="flex-1 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
