import React, { useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";

type Props = {
  studyUID: string;
  reportId: string;
  disabled?: boolean;
};

export default function CriticalResultPanel({
  studyUID,
  reportId,
  disabled = false,
}: Props) {
  const [severity, setSeverity] = useState<
    "moderate" | "high" | "life_threatening"
  >("high");
  const [reason, setReason] = useState("");
  const [notifyTo, setNotifyTo] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason || !notifyTo) {
      alert("Reason and recipient are required");
      return;
    }

    try {
      setSaving(true);
      await axiosInstance.post("/critical/mark", {
        studyUID,
        reportId,
        severity,
        reason,
        notifyTo,
      });
      alert("Critical result sent for acknowledgement");
    } catch (err) {
      console.error("Critical submit failed", err);
      alert("Failed to send critical result");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-red-600 bg-red-50 p-4 mt-6 rounded">
      <h3 className="font-bold text-red-700 mb-2">
        🚨 Critical Result (Phase-3)
      </h3>

      <div className="space-y-3">
        <select
          className="w-full border p-2"
          value={severity}
          onChange={(e) => setSeverity(e.target.value as any)}
          disabled={disabled}
        >
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
          <option value="life_threatening">Life Threatening</option>
        </select>

        <textarea
          className="w-full border p-2"
          placeholder="Describe critical finding"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={disabled}
        />

        <input
          className="w-full border p-2"
          placeholder="Notify clinician user ID"
          value={notifyTo}
          onChange={(e) => setNotifyTo(e.target.value)}
          disabled={disabled}
        />

        <Button
          onClick={submit}
          disabled={saving || disabled}
          className="bg-red-600"
        >
          {saving ? "Sending…" : "Send Critical Result"}
        </Button>
      </div>
    </div>
  );
}
