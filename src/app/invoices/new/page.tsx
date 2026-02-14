"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { calculateGST } from "@/lib/gst";
import { formatCurrency, formatInvoiceAmount } from "@/lib/formatCurrency";
import { amountInWords } from "@/lib/amountInWords";

interface Sender {
  id: string;
  name: string;
  gstNumber: string;
  signature: string;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  propertyAddress: string;
  gstNumber: string;
  defaultRent: number;
}

interface TenantInvoice {
  tenantId: string;
  tenant: Tenant;
  baseRent: number;
  description: string;
  invoiceNumber: string;
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

export default function NewInvoicePage() {
  const router = useRouter();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantInvoice[]>([]);
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [step, setStep] = useState<"select" | "details" | "preview">("select");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/senders").then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
      fetch("/api/tenants").then((r) => r.json()),
    ]).then(([sendersData, buildingsData, tenantsData]) => {
      setSenders(sendersData);
      if (sendersData.length > 0) setSelectedSenderId(sendersData[0].id);
      setBuildings(buildingsData);
      if (buildingsData.length > 0) setSelectedBuildingId(buildingsData[0].id);
      setTenants(tenantsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const selectedSender = senders.find((s) => s.id === selectedSenderId);
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  const toggleTenant = (tenant: Tenant) => {
    const exists = selected.find((s) => s.tenantId === tenant.id);
    if (exists) {
      setSelected(selected.filter((s) => s.tenantId !== tenant.id));
    } else {
      setSelected([
        ...selected,
        {
          tenantId: tenant.id,
          tenant,
          baseRent: tenant.defaultRent || 0,
          description: "Amount Charged towards rental of the premises",
          invoiceNumber: "",
        },
      ]);
    }
  };

  const selectAll = () => {
    if (selected.length === tenants.length) {
      setSelected([]);
    } else {
      setSelected(
        tenants.map((t) => ({
          tenantId: t.id,
          tenant: t,
          baseRent: t.defaultRent || 0,
          description: "Amount Charged towards rental of the premises",
          invoiceNumber: "",
        }))
      );
    }
  };

  const updateRent = (tenantId: string, rent: number) => {
    setSelected(
      selected.map((s) =>
        s.tenantId === tenantId ? { ...s, baseRent: rent } : s
      )
    );
  };

  const handleSend = async () => {
    if (!confirm(`Send ${selected.length} invoice(s)? This will email the tenants.`)) return;

    setSending(true);
    try {
      setSendProgress("Creating invoices...");
      const createRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: selectedSenderId,
          buildingId: selectedBuildingId,
          tenants: selected.map((s) => ({
            tenantId: s.tenantId,
            baseRent: s.baseRent,
            description: s.description,
            invoiceNumber: s.invoiceNumber,
            month,
            year,
          })),
        }),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        toast.error(data.error || "Failed to create invoices.");
        setSending(false);
        return;
      }

      const invoices = await createRes.json();
      const invoiceIds = invoices.map((inv: { id: string }) => inv.id);

      setSendProgress(`Sending ${invoiceIds.length} email(s)...`);
      const sendRes = await fetch("/api/invoices/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds }),
      });

      const sendData = await sendRes.json();

      if (sendRes.ok) {
        const successCount = sendData.results.filter(
          (r: { success: boolean }) => r.success
        ).length;
        const failCount = sendData.results.length - successCount;

        if (failCount === 0) {
          toast.success(`All ${successCount} invoice(s) sent successfully!`);
        } else {
          toast.success(`${successCount} sent, ${failCount} failed.`);
        }
        router.push("/invoices");
      } else {
        toast.error(sendData.error || "Failed to send invoices.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSending(false);
    setSendProgress("");
  };

  const handleSaveDraft = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: selectedSenderId,
          buildingId: selectedBuildingId,
          tenants: selected.map((s) => ({
            tenantId: s.tenantId,
            baseRent: s.baseRent,
            description: s.description,
            invoiceNumber: s.invoiceNumber,
            month,
            year,
          })),
        }),
      });

      if (res.ok) {
        toast.success("Invoices saved as drafts!");
        router.push("/invoices");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save invoices.");
      }
    } catch {
      toast.error("Failed to save invoices.");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Create Invoice
      </h1>

      {/* Sender Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Sender (Landlord)
        </h2>
        <div className="flex gap-3 flex-wrap">
          {senders.map((sender) => (
            <button
              key={sender.id}
              onClick={() => setSelectedSenderId(sender.id)}
              className={`px-5 py-3 rounded-lg border-2 font-medium text-base transition-colors ${
                selectedSenderId === sender.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {sender.name}
              <div className="text-xs font-normal mt-0.5">
                GST: {sender.gstNumber}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Building Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-4">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Building / Property
        </h2>
        <div className="flex gap-3 flex-wrap">
          {buildings.map((building) => (
            <button
              key={building.id}
              onClick={() => setSelectedBuildingId(building.id)}
              className={`px-5 py-3 rounded-lg border-2 font-medium text-base transition-colors ${
                selectedBuildingId === building.id
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {building.name}
              {building.address && (
                <div className="text-xs font-normal mt-0.5 max-w-xs truncate">
                  {building.address.replace(/\n/g, ", ")}
                </div>
              )}
            </button>
          ))}
        </div>
        {buildings.length === 0 && (
          <p className="text-gray-500 text-sm">
            No buildings added. Please add buildings in Settings first.
          </p>
        )}
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Invoice Period
        </h2>
        <div className="flex gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-28 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Invoice date will be set to 01/{String(MONTHS.indexOf(month) + 1).padStart(2, "0")}/{year}
        </p>
      </div>

      {/* Step 1: Select Tenants */}
      {step === "select" && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-700">
                Select Tenants ({selected.length} selected)
              </h2>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selected.length === tenants.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>

            {tenants.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">
                No tenants found. Please add tenants first.
              </p>
            ) : (
              <div className="space-y-2">
                {tenants.map((tenant) => {
                  const isSelected = selected.some(
                    (s) => s.tenantId === tenant.id
                  );
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => toggleTenant(tenant)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">
                            {tenant.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {tenant.email} | {tenant.propertyAddress}
                          </div>
                        </div>
                        {tenant.defaultRent > 0 && (
                          <div className="text-sm font-medium text-green-600">
                            {formatCurrency(tenant.defaultRent)}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setStep("details")}
            disabled={selected.length === 0 || !selectedSenderId || !selectedBuildingId}
            className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Enter Amounts
          </button>
        </>
      )}

      {/* Step 2: Enter Amounts */}
      {step === "details" && (
        <>
          <div className="space-y-4 mb-6">
            {selected.map((item) => {
              const gst = calculateGST(item.baseRent);
              return (
                <div
                  key={item.tenantId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
                >
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {item.tenant.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {item.tenant.propertyAddress}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Invoice Number *
                      </label>
                      <input
                        type="text"
                        value={item.invoiceNumber}
                        onChange={(e) =>
                          setSelected(
                            selected.map((s) =>
                              s.tenantId === item.tenantId
                                ? { ...s, invoiceNumber: e.target.value }
                                : s
                            )
                          )
                        }
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 47"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Base Rent Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.baseRent || ""}
                        onChange={(e) =>
                          updateRent(
                            item.tenantId,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter rent amount"
                      />
                    </div>
                  </div>

                  {item.baseRent > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Base Rent</span>
                        <span>{formatInvoiceAmount(item.baseRent)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>CGST @ 9%</span>
                        <span>{formatInvoiceAmount(gst.cgst)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>SGST @ 9%</span>
                        <span>{formatInvoiceAmount(gst.sgst)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-300 mt-2">
                        <span>Total</span>
                        <span>{formatCurrency(gst.total)}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep("select")}
              className="px-6 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep("preview")}
              disabled={selected.some((s) => s.baseRent <= 0 || !s.invoiceNumber.trim())}
              className="flex-1 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              Preview Invoices
            </button>
          </div>
        </>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <>
          <div className="space-y-4 mb-6">
            {selected.map((item) => {
              const gst = calculateGST(item.baseRent);
              const invoiceDate = `01/${String(MONTHS.indexOf(month) + 1).padStart(2, "0")}/${year}`;
              return (
                <div
                  key={item.tenantId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  {/* Invoice Header */}
                  <div className="text-center mb-4">
                    <div className="text-lg font-bold">{selectedSender?.name}</div>
                    {selectedBuilding?.name && (
                      <div className="text-sm font-semibold">{selectedBuilding.name}</div>
                    )}
                    {selectedBuilding?.address && (
                      <div className="text-xs text-gray-600 whitespace-pre-line">
                        {selectedBuilding.address}
                      </div>
                    )}
                  </div>

                  <div className="text-center mb-4">
                    <div className="text-lg font-bold underline">INVOICE</div>
                  </div>

                  <div className="flex justify-between text-sm mb-1">
                    <span>Invoice No.{item.invoiceNumber}</span>
                    <span>Date: {invoiceDate}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    GST.No: {selectedSender?.gstNumber}
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-500">To</div>
                    <div className="font-semibold">{item.tenant.name}</div>
                    <div className="text-sm text-gray-600">
                      {item.tenant.propertyAddress}
                    </div>
                    {item.tenant.gstNumber && (
                      <div className="text-sm text-gray-500">
                        GST.No: {item.tenant.gstNumber}
                      </div>
                    )}
                  </div>

                  <div className="text-sm font-semibold mb-3">
                    Sub: Invoice for the month of {month} {year}
                  </div>

                  <table className="w-full border-collapse mb-4">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">
                          Particulars
                        </th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold w-32">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          {item.description}
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                          {formatInvoiceAmount(item.baseRent)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          Add: GST@ 9%
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                          {formatInvoiceAmount(gst.cgst)}
                        </td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          Add: GST@ 9%
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                          {formatInvoiceAmount(gst.sgst)}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 font-bold">
                        <td className="border border-gray-300 px-3 py-2 text-sm">
                          Total Rental Amount
                        </td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                          {formatInvoiceAmount(gst.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="text-xs text-gray-500 italic mb-4">
                    Amount in words: {amountInWords(gst.total)}
                  </p>

                  <div className="text-sm text-gray-600">Thanking You</div>
                  {selectedSender?.signature && (
                    <img
                      src={selectedSender.signature}
                      alt="Signature"
                      className="h-14 mt-2"
                    />
                  )}
                  <div className="text-sm font-semibold mt-2">
                    ({selectedSender?.name})
                  </div>
                </div>
              );
            })}
          </div>

          {sending && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-center">
              <div className="text-blue-700 font-medium">{sendProgress}</div>
            </div>
          )}

          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setStep("details")}
              disabled={sending}
              className="px-6 py-4 bg-gray-100 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={sending}
              className="px-6 py-4 bg-gray-600 text-white text-lg font-semibold rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex-1 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Invoice(s)"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
