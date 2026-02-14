"use client";

import { calculateGST } from "@/lib/gst";
import { formatCurrency, formatInvoiceAmount } from "@/lib/formatCurrency";

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

const MONTHS = [
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
];

interface InvoiceFormProps {
  senders: Sender[];
  buildings: Building[];
  senderId: string;
  buildingId: string;
  invoiceNumber: string;
  month: string;
  year: number;
  baseRent: number;
  description: string;
  onSenderChange: (id: string) => void;
  onBuildingChange: (id: string) => void;
  onInvoiceNumberChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onYearChange: (value: number) => void;
  onBaseRentChange: (value: number) => void;
  onDescriptionChange: (value: string) => void;
}

const inputClass =
  "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

export default function InvoiceForm({
  senders,
  buildings,
  senderId,
  buildingId,
  invoiceNumber,
  month,
  year,
  baseRent,
  description,
  onSenderChange,
  onBuildingChange,
  onInvoiceNumberChange,
  onMonthChange,
  onYearChange,
  onBaseRentChange,
  onDescriptionChange,
}: InvoiceFormProps) {
  const gst = calculateGST(baseRent);

  return (
    <>
      {/* Sender Selection */}
      <div className="mb-4">
        <label className={labelClass} id="sender-label">Sender (Landlord)</label>
        <div className="flex gap-2 flex-wrap" role="radiogroup" aria-labelledby="sender-label">
          {senders.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={senderId === s.id}
              onClick={() => onSenderChange(s.id)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                senderId === s.id
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Building Selection */}
      <div className="mb-4">
        <label className={labelClass} id="building-label">Building / Property</label>
        <div className="flex gap-2 flex-wrap" role="radiogroup" aria-labelledby="building-label">
          {buildings.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={buildingId === b.id}
              onClick={() => onBuildingChange(b.id)}
              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                buildingId === b.id
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Number */}
      <div className="mb-4">
        <label htmlFor="invoiceNumber" className={labelClass}>Invoice Number *</label>
        <input
          id="invoiceNumber"
          type="text"
          value={invoiceNumber}
          onChange={(e) => onInvoiceNumberChange(e.target.value)}
          className={inputClass}
          placeholder="e.g. 47"
        />
      </div>

      {/* Month / Year */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="month" className={labelClass}>Month</label>
          <select
            id="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className={inputClass}
          >
            {MONTHS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="year" className={labelClass}>Year</label>
          <input
            id="year"
            type="number"
            value={year}
            onChange={(e) => onYearChange(parseInt(e.target.value))}
            className={inputClass}
          />
        </div>
      </div>

      {/* Base Rent */}
      <div className="mb-4">
        <label htmlFor="baseRent" className={labelClass}>Base Rent Amount *</label>
        <input
          id="baseRent"
          type="number"
          step="0.01"
          value={baseRent || ""}
          onChange={(e) => onBaseRentChange(parseFloat(e.target.value) || 0)}
          className={`${inputClass} text-lg`}
          placeholder="Enter rent amount"
        />
      </div>

      {/* GST Breakdown */}
      {baseRent > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4" aria-label="GST breakdown">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Base Rent</span>
            <span>{formatInvoiceAmount(baseRent)}</span>
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

      {/* Description */}
      <div className="mb-6">
        <label htmlFor="description" className={labelClass}>Description</label>
        <input
          id="description"
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={inputClass}
        />
      </div>
    </>
  );
}
