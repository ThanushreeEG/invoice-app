"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/formatCurrency";
import SendConfirmModal from "@/components/SendConfirmModal";

interface Sender {
  id: string;
  name: string;
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
}

interface TenantBill {
  tenantId: string;
  tenant: Tenant;
  waterCharges: number;
  invoiceNo: string;
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

export default function NewWaterBillPage() {
  const router = useRouter();
  const [senders, setSenders] = useState<Sender[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantBill[]>([]);
  const [month, setMonth] = useState(MONTHS[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [step, setStep] = useState<"select" | "details" | "preview">("select");
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/senders").then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
    ]).then(([sendersData, buildingsData]) => {
      setSenders(sendersData);
      if (sendersData.length > 0) setSelectedSenderId(sendersData[0].id);
      setBuildings(buildingsData);
      if (buildingsData.length > 0) setSelectedBuildingId(buildingsData[0].id);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBuildingId) return;
    setSelected([]);
    fetch(`/api/tenants?buildingId=${selectedBuildingId}`)
      .then((r) => r.json())
      .then((data) => setTenants(data))
      .catch(() => {});
  }, [selectedBuildingId]);

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
          waterCharges: 0,
          invoiceNo: "",
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
          waterCharges: 0,
          invoiceNo: "",
        }))
      );
    }
  };

  const updateField = (tenantId: string, field: string, value: number | string) => {
    setSelected(
      selected.map((s) =>
        s.tenantId === tenantId ? { ...s, [field]: value } : s
      )
    );
  };

  const buildPayload = () => ({
    senderId: selectedSenderId,
    buildingId: selectedBuildingId,
    month,
    year,
    tenants: selected.map((s) => ({
      tenantId: s.tenantId,
      waterCharges: s.waterCharges,
      invoiceNo: s.invoiceNo,
    })),
  });

  const handleSend = async () => {
    setShowSendModal(false);
    setSending(true);
    try {
      setSendProgress("Creating bills...");
      const createRes = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!createRes.ok) {
        const data = await createRes.json();
        toast.error(data.error || "Failed to create bills.");
        setSending(false);
        return;
      }

      const bills = await createRes.json();
      const billIds = bills.map((b: { id: string }) => b.id);

      setSendProgress(`Sending ${billIds.length} email(s)...`);
      const sendRes = await fetch("/api/water/send-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billIds }),
      });

      const sendData = await sendRes.json();

      if (sendRes.ok) {
        const successCount = sendData.results.filter(
          (r: { success: boolean }) => r.success
        ).length;
        const failCount = sendData.results.length - successCount;

        if (failCount === 0) {
          toast.success(`All ${successCount} water bill(s) sent successfully!`);
        } else {
          toast.success(`${successCount} sent, ${failCount} failed.`);
        }
        router.push("/water");
      } else {
        toast.error(sendData.error || "Failed to send bills.");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
    setSending(false);
    setSendProgress("");
  };

  const handleDownloadPDF = async () => {
    setSending(true);
    try {
      setSendProgress("Creating bills...");
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create bills.");
        setSending(false);
        setSendProgress("");
        return;
      }

      const bills = await res.json();
      setSendProgress("Downloading PDFs...");

      for (const bill of bills) {
        const link = document.createElement("a");
        link.href = `/api/water/${bill.id}/pdf`;
        link.download = `Water-Bill-${bill.tenant.name}-${month}-${year}.pdf`;
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast.success(`${bills.length} water bill(s) saved & PDF(s) downloaded!`);
      router.push("/water");
    } catch {
      toast.error("Failed to download PDFs.");
    }
    setSending(false);
    setSendProgress("");
  };

  const handleSaveDraft = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });

      if (res.ok) {
        toast.success("Water bills saved as drafts!");
        router.push("/water");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save bills.");
      }
    } catch {
      toast.error("Failed to save bills.");
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

  const selectedSender = senders.find((s) => s.id === selectedSenderId);
  const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Create Water Bill
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
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-700 mb-3">
          Bill Period
        </h2>
        <div className="flex gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex-1 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
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
            className="w-28 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
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
                className="text-sm text-teal-600 hover:text-teal-800 font-medium"
              >
                {selected.length === tenants.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            {tenants.length === 0 ? (
              <p className="text-gray-500 py-4 text-center">
                No tenants found. Please add tenants first.
              </p>
            ) : (
              <div className="space-y-2">
                {tenants.map((tenant) => {
                  const isSelected = selected.some((s) => s.tenantId === tenant.id);
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => toggleTenant(tenant)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? "border-teal-500 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-teal-600 border-teal-600"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{tenant.name}</div>
                          <div className="text-sm text-gray-500">
                            {tenant.propertyAddress}
                          </div>
                        </div>
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
            className="w-full py-4 bg-teal-600 text-white text-lg font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Enter Water Charges
          </button>
        </>
      )}

      {/* Step 2: Enter Details */}
      {step === "details" && (
        <>
          <div className="space-y-4 mb-6">
            {selected.map((item) => (
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
                      Water Charges *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={item.waterCharges || ""}
                      onChange={(e) => updateField(item.tenantId, "waterCharges", parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Enter water charge amount"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Invoice No
                    </label>
                    <input
                      type="text"
                      value={item.invoiceNo}
                      onChange={(e) => updateField(item.tenantId, "invoiceNo", e.target.value)}
                      className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                {item.waterCharges > 0 && (
                  <div className="bg-teal-50 rounded-lg p-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Water Charges</span>
                      <span>{formatCurrency(item.waterCharges)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-teal-200 mt-2">
                      <span>Net Payable</span>
                      <span>{formatCurrency(item.waterCharges)}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
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
              disabled={selected.some((s) => s.waterCharges <= 0)}
              className="flex-1 py-4 bg-teal-600 text-white text-lg font-semibold rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              Preview Bills
            </button>
          </div>
        </>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && (
        <>
          <div className="space-y-4 mb-6">
            {selected.map((item) => (
              <div
                key={item.tenantId}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                {/* Bill Header */}
                <div className="text-center mb-4 pb-3 border-b border-gray-300">
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

                <div className="flex justify-between text-sm mb-2">
                  <span>To,</span>
                  <span>Date: 01/{String(MONTHS.indexOf(month) + 2).padStart(2, "0")}/{year}</span>
                </div>

                {item.invoiceNo && (
                  <div className="font-semibold text-sm mb-1">Invoice No: {item.invoiceNo}</div>
                )}
                <div className="font-semibold">{item.tenant.name}</div>
                <div className="text-sm text-gray-600 mb-4">{item.tenant.propertyAddress}</div>

                <div className="text-center mb-4">
                  <div className="text-sm font-bold italic bg-gray-100 py-2 rounded border border-gray-200">
                    WATER BILL FOR THE MONTH OF {month}, {year}.
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-2">
                  <span>Water charges</span>
                  <span>= Rs. {item.waterCharges.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <hr className="my-3" />

                <div className="flex justify-between font-bold text-base bg-green-50 p-3 rounded border border-green-300">
                  <span>Net amt. payable</span>
                  <span>{formatCurrency(item.waterCharges)}</span>
                </div>

                <div className="mt-4 text-sm text-gray-600">Thanking you,</div>
                <div className="text-sm font-semibold mt-2">({selectedSender?.name})</div>
              </div>
            ))}
          </div>

          {sending && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-4 text-center">
              <div className="text-teal-700 font-medium">{sendProgress}</div>
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
              onClick={handleDownloadPDF}
              disabled={sending}
              className="px-6 py-4 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {sending && sendProgress.includes("PDF") ? "Downloading..." : "Download PDF"}
            </button>
            <button
              onClick={() => setShowSendModal(true)}
              disabled={sending}
              className="flex-1 py-4 bg-green-600 text-white text-lg font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send Bill(s)"}
            </button>
          </div>
        </>
      )}

      <SendConfirmModal
        open={showSendModal}
        onClose={() => setShowSendModal(false)}
        onConfirm={handleSend}
        title={`Send ${selected.length} Water Bill(s)`}
        recipientEmail={selected.map((s) => s.tenant.email).filter(Boolean).join(", ")}
        sending={sending}
      />
    </div>
  );
}
