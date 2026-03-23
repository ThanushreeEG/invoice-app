"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import dynamic from "next/dynamic";

const SignaturePad = dynamic(() => import("@/components/SignaturePad"), {
  ssr: false,
  loading: () => <div className="h-[150px] border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-sm">Loading signature pad...</div>,
});

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

interface AllowedEmail {
  id: string;
  email: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    senderPhone: "",
    senderEmail: "",
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    paymentTerms: "Payment due within 15 days of invoice date.",
    bankDetails: "",
  });
  const [senders, setSenders] = useState<Sender[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newSender, setNewSender] = useState({ name: "", gstNumber: "" });
  const [showAddSender, setShowAddSender] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ name: "", address: "" });
  const [showAddBuilding, setShowAddBuilding] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [newAllowedEmail, setNewAllowedEmail] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/senders").then((r) => r.json()),
      fetch("/api/buildings").then((r) => r.json()),
      fetch("/api/auth/me").then((r) => r.json()),
    ]).then(([settingsData, sendersData, buildingsData, meData]) => {
      setSettings((prev) => ({ ...prev, ...settingsData }));
      setSenders(sendersData);
      setBuildings(buildingsData);
      if (meData?.user?.role === "admin") {
        setIsAdmin(true);
        fetch("/api/auth/allowed-emails")
          .then((r) => r.json())
          .then((emails) => setAllowedEmails(emails))
          .catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success("Settings saved!");
      } else {
        toast.error("Failed to save settings.");
      }
    } catch {
      toast.error("Failed to save settings.");
    }
    setSaving(false);
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/settings/test-email", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error("Failed to send test email.");
    }
    setTesting(false);
  };

  const handleAddSender = async () => {
    if (!newSender.name) {
      toast.error("Please enter a name.");
      return;
    }
    try {
      const res = await fetch("/api/senders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSender),
      });
      if (res.ok) {
        const sender = await res.json();
        setSenders([...senders, sender]);
        setNewSender({ name: "", gstNumber: "" });
        setShowAddSender(false);
        toast.success("Sender added!");
      }
    } catch {
      toast.error("Failed to add sender.");
    }
  };

  const handleUpdateSender = async (sender: Sender) => {
    try {
      await fetch(`/api/senders/${sender.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sender),
      });
      toast.success("Sender updated!");
    } catch {
      toast.error("Failed to update sender.");
    }
  };

  const handleAddBuilding = async () => {
    if (!newBuilding.name) {
      toast.error("Please enter a building name.");
      return;
    }
    try {
      const res = await fetch("/api/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBuilding),
      });
      if (res.ok) {
        const building = await res.json();
        setBuildings([...buildings, building]);
        setNewBuilding({ name: "", address: "" });
        setShowAddBuilding(false);
        toast.success("Building added!");
      }
    } catch {
      toast.error("Failed to add building.");
    }
  };

  const handleUpdateBuilding = async (building: Building) => {
    try {
      await fetch(`/api/buildings/${building.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(building),
      });
      toast.success("Building updated!");
    } catch {
      toast.error("Failed to update building.");
    }
  };

  const handleDeleteBuilding = async (id: string) => {
    if (!confirm("Remove this building?")) return;
    try {
      await fetch(`/api/buildings/${id}`, { method: "DELETE" });
      setBuildings(buildings.filter((b) => b.id !== id));
      toast.success("Building removed!");
    } catch {
      toast.error("Failed to remove building.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-lg text-gray-500">Loading settings...</div>
      </div>
    );
  }

  const inputClass =
    "w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block text-sm font-semibold text-gray-700 mb-1";

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Settings</h1>

      {/* Senders / Landlords */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Senders (Landlords)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Each sender has their own name, GST number, and signature.
        </p>

        <div className="space-y-4">
          {senders.map((sender, idx) => (
            <div key={sender.id} className="border border-gray-200 rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sender.name}
                    onChange={(e) => {
                      const updated = [...senders];
                      updated[idx] = { ...sender, name: e.target.value };
                      setSenders(updated);
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>GST Number</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={sender.gstNumber}
                    onChange={(e) => {
                      const updated = [...senders];
                      updated[idx] = { ...sender, gstNumber: e.target.value };
                      setSenders(updated);
                    }}
                  />
                </div>
                <div>
                  <label className={labelClass}>Signature</label>
                  {sender.signature ? (
                    <div className="mb-2">
                      <img
                        src={sender.signature}
                        alt="Signature"
                        className="h-16 border border-gray-200 rounded bg-white p-1"
                      />
                      <button
                        onClick={async () => {
                          const updatedSender = { ...sender, signature: "" };
                          const updated = [...senders];
                          updated[idx] = updatedSender;
                          setSenders(updated);
                          await handleUpdateSender(updatedSender);
                        }}
                        className="text-xs text-red-500 mt-1 hover:text-red-700"
                      >
                        Remove signature
                      </button>
                    </div>
                  ) : (
                    <SignaturePad
                      onSave={async (dataUrl) => {
                        const updatedSender = { ...sender, signature: dataUrl };
                        const updated = [...senders];
                        updated[idx] = updatedSender;
                        setSenders(updated);
                        await handleUpdateSender(updatedSender);
                      }}
                    />
                  )}
                </div>
                <button
                  onClick={() => handleUpdateSender(sender)}
                  className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  Save Sender
                </button>
              </div>
            </div>
          ))}

          {showAddSender ? (
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Name *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={newSender.name}
                    onChange={(e) => setNewSender({ ...newSender, name: e.target.value })}
                    placeholder="E R GAJENDRA NAIDU"
                  />
                </div>
                <div>
                  <label className={labelClass}>GST Number</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={newSender.gstNumber}
                    onChange={(e) => setNewSender({ ...newSender, gstNumber: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddSender}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    Add Sender
                  </button>
                  <button
                    onClick={() => setShowAddSender(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddSender(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              + Add Another Sender
            </button>
          )}
        </div>
      </div>

      {/* Buildings / Properties */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Buildings / Properties
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Add all your buildings here. When creating an invoice, you will select which building it is for.
        </p>

        <div className="space-y-4">
          {buildings.map((building, idx) => (
            <div key={building.id} className="border border-gray-200 rounded-lg p-4">
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Building Name</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={building.name}
                    onChange={(e) => {
                      const updated = [...buildings];
                      updated[idx] = { ...building, name: e.target.value };
                      setBuildings(updated);
                    }}
                    placeholder="S.V.TOWERS"
                  />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={building.address}
                    onChange={(e) => {
                      const updated = [...buildings];
                      updated[idx] = { ...building, address: e.target.value };
                      setBuildings(updated);
                    }}
                    placeholder="No. 942 16th Main BTM LYT, 2nd Stage, BANGALORE- 560 076"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateBuilding(building)}
                    className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                  >
                    Save Building
                  </button>
                  <button
                    onClick={() => handleDeleteBuilding(building.id)}
                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}

          {showAddBuilding ? (
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="space-y-3">
                <div>
                  <label className={labelClass}>Building Name *</label>
                  <input
                    type="text"
                    className={inputClass}
                    value={newBuilding.name}
                    onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })}
                    placeholder="S.V.TOWERS"
                  />
                </div>
                <div>
                  <label className={labelClass}>Address</label>
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={newBuilding.address}
                    onChange={(e) => setNewBuilding({ ...newBuilding, address: e.target.value })}
                    placeholder="No. 942 16th Main BTM LYT, 2nd Stage, BANGALORE- 560 076"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddBuilding}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                  >
                    Add Building
                  </button>
                  <button
                    onClick={() => setShowAddBuilding(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddBuilding(true)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              + Add Another Building
            </button>
          )}
        </div>
      </div>

      {/* General Contact Info */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          General Contact Info
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone</label>
            <input
              type="text"
              className={inputClass}
              value={settings.senderPhone}
              onChange={(e) =>
                setSettings({ ...settings, senderPhone: e.target.value })
              }
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={settings.senderEmail}
              onChange={(e) =>
                setSettings({ ...settings, senderEmail: e.target.value })
              }
            />
          </div>
        </div>
      </div>

      {/* Email Configuration */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Email (Gmail)
        </h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <p className="text-sm text-gray-700">
            Emails are sent via your Google account. No extra configuration needed.
          </p>
        </div>

        <button
          onClick={handleTestEmail}
          disabled={testing}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {testing ? "Sending..." : "Send Test Email to Myself"}
        </button>
      </div>

      {/* Allowed Users (Admin only) */}
      {isAdmin && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">
            Allowed Users
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Only these email addresses can sign in. You (admin) always have access.
          </p>

          <div className="space-y-3">
            {allowedEmails.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                <span className="text-sm text-gray-700">{item.email}</span>
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/allowed-emails", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: item.id }),
                      });
                      setAllowedEmails(allowedEmails.filter((e) => e.id !== item.id));
                      toast.success("Removed!");
                    } catch {
                      toast.error("Failed to remove.");
                    }
                  }}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="flex gap-2">
              <input
                type="email"
                className={inputClass}
                value={newAllowedEmail}
                onChange={(e) => setNewAllowedEmail(e.target.value)}
                placeholder="user@gmail.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById("addEmailBtn")?.click();
                  }
                }}
              />
              <button
                id="addEmailBtn"
                onClick={async () => {
                  if (!newAllowedEmail) return;
                  try {
                    const res = await fetch("/api/auth/allowed-emails", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: newAllowedEmail }),
                    });
                    if (res.ok) {
                      const added = await res.json();
                      setAllowedEmails([added, ...allowedEmails]);
                      setNewAllowedEmail("");
                      toast.success("Email added!");
                    } else {
                      const data = await res.json();
                      toast.error(data.error || "Failed to add.");
                    }
                  } catch {
                    toast.error("Failed to add email.");
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 mb-8"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
