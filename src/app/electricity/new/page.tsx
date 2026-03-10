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
  elecMultiplier: number;
  elecMinChargeUnits: number;
  elecKVA: number;
  elecBWSSB: number;
  elecMaintenance: number;
  elecDgMaintenance: number;
  elecWaterCharges: number;
}

interface TenantBill {
  tenantId: string;
  tenant: Tenant;
  openingReading: number;
  closingReading: number;
  miscUnits: number;
  ratePerUnit: number;
  bwssbCharges: number;
  maintenance: number;
  dgMaintenance: number;
  waterCharges: number;
  invoiceNo: string;
  hasLastReading: boolean;
}

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

function calcBill(item: TenantBill) {
  const unitsConsumed = Math.max(0, item.closingReading - item.openingReading);
  const totalUnitsConsumed = unitsConsumed * item.tenant.elecMultiplier;
  const totalUnitsCharged = totalUnitsConsumed + item.miscUnits;
  const totalAmount = totalUnitsCharged * item.ratePerUnit;
  const minimumCharge = item.tenant.elecMinChargeUnits * item.tenant.elecKVA;
  const netPayable = totalAmount + minimumCharge + item.bwssbCharges + item.maintenance + item.dgMaintenance + item.waterCharges;
  return { unitsConsumed, totalUnitsConsumed, totalUnitsCharged, totalAmount, minimumCharge, netPayable };
}

export default function NewElectricityBillPage() {
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

  // Re-fetch tenants when building changes
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
          openingReading: 0,
          closingReading: 0,
          miscUnits: 0,
          ratePerUnit: 0,
          bwssbCharges: tenant.elecBWSSB,
          maintenance: tenant.elecMaintenance,
          dgMaintenance: tenant.elecDgMaintenance,
          waterCharges: tenant.elecWaterCharges,
          invoiceNo: "",
          hasLastReading: false,
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
          openingReading: 0,
          closingReading: 0,
          miscUnits: 0,
          ratePerUnit: 0,
          bwssbCharges: t.elecBWSSB,
          maintenance: t.elecMaintenance,
          dgMaintenance: t.elecDgMaintenance,
          waterCharges: t.elecWaterCharges,
          invoiceNo: "",
          hasLastReading: false,
        }))
      );
    }
  };

  const goToDetails = async () => {
    // Fetch last readings for selected tenants
    const tenantIds = selected.map((s) => s.tenantId).join(",");
    try {
      const res = await fetch(`/api/electricity/last-readings?tenantIds=${tenantIds}`);
      const readings = await res.json();
      setSelected(
        selected.map((s) => ({
          ...s,
          openingReading: readings[s.tenantId] ?? 0,
          hasLastReading: readings[s.tenantId] !== undefined,
        }))
      );
    } catch {
      // Continue without last readings
    }
    setStep("details");
  };

  const updateField = (tenantId: string, field: string, value: number | string) => {
    setSelected(
      selected.map((s) =>
        s.tenantId === tenantId ? { ...s, [field]: value } : s
      )
    );
  };

  const handleSend = async () => {
    setShowSendModal(false);
    setSending(true);
    try {
      setSendProgress("Creating bills...");
      const createRes = await fetch("/api/electricity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: selectedSenderId,
          buildingId: selectedBuildingId,
          month,
          year,
          tenants: selected.map((s) => ({
            tenantId: s.tenantId,
            openingReading: s.openingReading,
            closingReading: s.closingReading,
            miscUnits: s.miscUnits,
            ratePerUnit: s.ratePerUnit,
            bwssbCharges: s.bwssbCharges,
            maintenance: s.maintenance,
            dgMaintenance: s.dgMaintenance,
            waterCharges: s.waterCharges,
            invoiceNo: s.invoiceNo,
          })),
        }),
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
      const sendRes = await fetch("/api/electricity/send-bulk", {
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
          toast.success(`All ${successCount} bill(s) sent successfully!`);
        } else {
          toast.success(`${successCount} sent, ${failCount} failed.`);
        }
        router.push("/electricity");
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
      const res = await fetch("/api/electricity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: selectedSenderId,
          buildingId: selectedBuildingId,
          month,
          year,
          tenants: selected.map((s) => ({
            tenantId: s.tenantId,
            openingReading: s.openingReading,
            closingReading: s.closingReading,
            miscUnits: s.miscUnits,
            ratePerUnit: s.ratePerUnit,
            bwssbCharges: s.bwssbCharges,
            maintenance: s.maintenance,
            dgMaintenance: s.dgMaintenance,
            waterCharges: s.waterCharges,
            invoiceNo: s.invoiceNo,
          })),
        }),
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
        link.href = `/api/electricity/${bill.id}/pdf`;
        link.download = `Electricity-Bill-${bill.tenant.name}-${month}-${year}.pdf`;
        link.click();
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      toast.success(`${bills.length} bill(s) saved & PDF(s) downloaded!`);
      router.push("/electricity");
    } catch {
      toast.error("Failed to download PDFs.");
    }
    setSending(false);
    setSendProgress("");
  };

  const handleSaveDraft = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/electricity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: selectedSenderId,
          buildingId: selectedBuildingId,
          month,
          year,
          tenants: selected.map((s) => ({
            tenantId: s.tenantId,
            openingReading: s.openingReading,
            closingReading: s.closingReading,
            miscUnits: s.miscUnits,
            ratePerUnit: s.ratePerUnit,
            bwssbCharges: s.bwssbCharges,
            maintenance: s.maintenance,
            dgMaintenance: s.dgMaintenance,
            waterCharges: s.waterCharges,
            invoiceNo: s.invoiceNo,
          })),
        }),
      });

      if (res.ok) {
        toast.success("Bills saved as drafts!");
        router.push("/electricity");
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
        Create Electricity Bill
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
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-800">{tenant.name}</div>
                          <div className="text-sm text-gray-500">
                            {tenant.propertyAddress} | CT: x{tenant.elecMultiplier}
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
            onClick={goToDetails}
            disabled={selected.length === 0 || !selectedSenderId || !selectedBuildingId}
            className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Enter Readings
          </button>
        </>
      )}

      {/* Step 2: Enter Details */}
      {step === "details" && (
        <>
          <div className="space-y-4 mb-6">
            {selected.map((item) => {
              const calc = calcBill(item);
              return (
                <div
                  key={item.tenantId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5"
                >
                  <h3 className="font-semibold text-gray-800 mb-1">
                    {item.tenant.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {item.tenant.propertyAddress} | CT Ratio: x{item.tenant.elecMultiplier}
                  </p>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Invoice No
                    </label>
                    <input
                      type="text"
                      value={item.invoiceNo}
                      onChange={(e) => updateField(item.tenantId, "invoiceNo", e.target.value)}
                      className="w-full sm:w-1/2 px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Opening Reading {item.hasLastReading && <span className="text-xs text-green-600 font-normal">(auto-filled)</span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.openingReading || ""}
                        onChange={(e) => updateField(item.tenantId, "openingReading", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter opening reading"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Closing Reading *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.closingReading || ""}
                        onChange={(e) => updateField(item.tenantId, "closingReading", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter closing reading"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Rate per Unit *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.ratePerUnit || ""}
                        onChange={(e) => updateField(item.tenantId, "ratePerUnit", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g. 8.50"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Misc. Units
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.miscUnits || ""}
                        onChange={(e) => updateField(item.tenantId, "miscUnits", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        BWSSB Charges
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.bwssbCharges || ""}
                        onChange={(e) => updateField(item.tenantId, "bwssbCharges", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Maintenance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.maintenance || ""}
                        onChange={(e) => updateField(item.tenantId, "maintenance", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        DG Maintenance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.dgMaintenance || ""}
                        onChange={(e) => updateField(item.tenantId, "dgMaintenance", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Water Charges
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.waterCharges || ""}
                        onChange={(e) => updateField(item.tenantId, "waterCharges", parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {item.closingReading > 0 && item.ratePerUnit > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Units Consumed ({item.closingReading} - {item.openingReading})</span>
                        <span>{calc.unitsConsumed}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Total Units (x{item.tenant.elecMultiplier})</span>
                        <span>{calc.totalUnitsConsumed}</span>
                      </div>
                      {item.miscUnits > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>+ Misc. Units</span>
                          <span>{item.miscUnits}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Total Units Charged</span>
                        <span>{calc.totalUnitsCharged}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1 pt-2 border-t border-gray-200">
                        <span>Amount ({calc.totalUnitsCharged} x Rs.{item.ratePerUnit})</span>
                        <span>{formatCurrency(calc.totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Min Charge ({item.tenant.elecMinChargeUnits} x {item.tenant.elecKVA})</span>
                        <span>{formatCurrency(calc.minimumCharge)}</span>
                      </div>
                      {item.bwssbCharges > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>BWSSB</span>
                          <span>{formatCurrency(item.bwssbCharges)}</span>
                        </div>
                      )}
                      {item.maintenance > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Maintenance</span>
                          <span>{formatCurrency(item.maintenance)}</span>
                        </div>
                      )}
                      {item.dgMaintenance > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>DG Maintenance</span>
                          <span>{formatCurrency(item.dgMaintenance)}</span>
                        </div>
                      )}
                      {item.waterCharges > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Water Charges</span>
                          <span>{formatCurrency(item.waterCharges)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-gray-800 pt-2 border-t border-gray-300 mt-2">
                        <span>Net Payable</span>
                        <span>{formatCurrency(calc.netPayable)}</span>
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
              disabled={selected.some((s) => s.closingReading <= 0 || s.ratePerUnit <= 0)}
              className="flex-1 py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
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
            {selected.map((item) => {
              const calc = calcBill(item);
              return (
                <div
                  key={item.tenantId}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                  {/* Bill Header */}
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
                    <div className="text-lg font-bold underline">ELECTRICITY BILL</div>
                  </div>

                  <div className="flex justify-between text-sm mb-4">
                    <span>Bill for: {month} {year}</span>
                    <span>Date: 01/{String(MONTHS.indexOf(month) + 1).padStart(2, "0")}/{year}</span>
                  </div>

                  <div className="mb-4">
                    <div className="text-sm text-gray-500">To</div>
                    {item.invoiceNo && (
                      <div className="font-semibold text-sm">Invoice No: {item.invoiceNo}</div>
                    )}
                    <div className="font-semibold">{item.tenant.name}</div>
                    <div className="text-sm text-gray-600">{item.tenant.propertyAddress}</div>
                  </div>

                  {/* Readings Table */}
                  <table className="w-full border-collapse mb-4">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Particulars</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold w-32">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">Opening Reading</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{item.openingReading}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">Closing Reading</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{item.closingReading}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">Units Consumed</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{calc.unitsConsumed}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">Multiplication Factor (x{item.tenant.elecMultiplier})</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{calc.totalUnitsConsumed}</td>
                      </tr>
                      {item.miscUnits > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm">Misc. Units</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right">{item.miscUnits}</td>
                        </tr>
                      )}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="border border-gray-300 px-3 py-2 text-sm">Total Units Charged</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{calc.totalUnitsCharged}</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Charges Table */}
                  <table className="w-full border-collapse mb-4">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold">Charges</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-sm font-semibold w-32">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">{calc.totalUnitsCharged} units x Rs.{item.ratePerUnit}/unit</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(calc.totalAmount)}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2 text-sm">Minimum Charge ({item.tenant.elecMinChargeUnits} x {item.tenant.elecKVA})</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(calc.minimumCharge)}</td>
                      </tr>
                      {item.bwssbCharges > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm">BWSSB Charges</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(item.bwssbCharges)}</td>
                        </tr>
                      )}
                      {item.maintenance > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm">Maintenance</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(item.maintenance)}</td>
                        </tr>
                      )}
                      {item.dgMaintenance > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm">DG Maintenance</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(item.dgMaintenance)}</td>
                        </tr>
                      )}
                      {item.waterCharges > 0 && (
                        <tr>
                          <td className="border border-gray-300 px-3 py-2 text-sm">Water Charges</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(item.waterCharges)}</td>
                        </tr>
                      )}
                      <tr className="bg-gray-50 font-bold">
                        <td className="border border-gray-300 px-3 py-2 text-sm">Net Payable</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{formatCurrency(calc.netPayable)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="text-sm text-gray-600">Thanking You</div>
                  <div className="text-sm font-semibold mt-2">({selectedSender?.name})</div>
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
        title={`Send ${selected.length} Electricity Bill(s)`}
        recipientEmail={selected.map((s) => s.tenant.email).filter(Boolean).join(", ")}
        sending={sending}
      />
    </div>
  );
}
