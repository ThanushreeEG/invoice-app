"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import InvoiceForm from "@/components/InvoiceForm";

interface Sender {
  id: string;
  name: string;
  gstNumber: string;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  senderId: string;
  buildingId: string;
  tenantId: string;
  month: string;
  year: number;
  baseRent: number;
  description: string;
  status: string;
  tenant: { name: string; email: string; propertyAddress: string };
  sender: { name: string };
  building: { name: string } | null;
}

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [senderId, setSenderId] = useState("");
  const [buildingId, setBuildingId] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState(2026);
  const [baseRent, setBaseRent] = useState(0);
  const [description, setDescription] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/invoices/${id}`).then((r) => r.json()),
      fetch("/api/senders").then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
    ]).then(([invoiceData, sendersData, buildingsData]) => {
      if (invoiceData.error) {
        toast.error(invoiceData.error);
        router.push("/invoices");
        return;
      }
      if (invoiceData.status === "SENT") {
        toast.error("Cannot edit a sent invoice.");
        router.push("/invoices");
        return;
      }
      setInvoice(invoiceData);
      setInvoiceNumber(invoiceData.invoiceNumber);
      setSenderId(invoiceData.senderId);
      setBuildingId(invoiceData.buildingId);
      setMonth(invoiceData.month);
      setYear(invoiceData.year);
      setBaseRent(invoiceData.baseRent);
      setDescription(invoiceData.description);
      setSenders(sendersData);
      setBuildings(buildingsData);
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load invoice.");
      setLoading(false);
    });
  }, [id, router]);

  const handleSave = async () => {
    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is required.");
      return;
    }
    if (baseRent <= 0) {
      toast.error("Base rent must be greater than 0.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber,
          senderId,
          buildingId,
          month,
          year,
          baseRent,
          description,
        }),
      });
      if (res.ok) {
        toast.success("Invoice updated!");
        router.push("/invoices");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update.");
      }
    } catch {
      toast.error("Failed to update invoice.");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-500">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Edit Draft Invoice</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="text-sm text-gray-500 mb-4">
          Tenant: <span className="font-semibold text-gray-800">{invoice.tenant.name}</span> ({invoice.tenant.email})
        </div>

        <InvoiceForm
          senders={senders}
          buildings={buildings}
          senderId={senderId}
          buildingId={buildingId}
          invoiceNumber={invoiceNumber}
          month={month}
          year={year}
          baseRent={baseRent}
          description={description}
          onSenderChange={setSenderId}
          onBuildingChange={setBuildingId}
          onInvoiceNumberChange={setInvoiceNumber}
          onMonthChange={setMonth}
          onYearChange={setYear}
          onBaseRentChange={setBaseRent}
          onDescriptionChange={setDescription}
        />

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/invoices")}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
