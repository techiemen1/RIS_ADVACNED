import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import dayjs from "dayjs";

type CriticalItem = {
  id: string;
  study_instance_uid: string;
  severity: string;
  reason: string;
  notified_at: string;
};

export default function CriticalAckDashboard() {
  const [items, setItems] = useState<CriticalItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const r = await axiosInstance.get("/critical/pending");
    setItems(r.data?.data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const acknowledge = async (criticalId: string) => {
    await axiosInstance.post("/critical/acknowledge", { criticalId });
    load();
  };

  if (loading) return <div>Loading critical results…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-4 text-red-700">
        🚨 Pending Critical Results
      </h1>

      {items.length === 0 && (
        <div className="text-green-600">
          No pending critical results 🎉
        </div>
      )}

      {items.map((c) => (
        <div
          key={c.id}
          className="border border-red-500 bg-red-50 p-4 mb-4 rounded"
        >
          <div className="text-sm text-gray-600">
            Study UID: {c.study_instance_uid}
          </div>

          <div className="font-semibold">
            Severity: {c.severity.toUpperCase()}
          </div>

          <div className="mt-2 whitespace-pre-wrap">
            {c.reason}
          </div>

          <div className="text-xs text-gray-500 mt-1">
            Notified:{" "}
            {dayjs(c.notified_at).format("DD MMM YYYY HH:mm")}
          </div>

          <Button
            onClick={() => acknowledge(c.id)}
            className="mt-3 bg-red-600"
          >
            Acknowledge
          </Button>
        </div>
      ))}
    </div>
  );
}
