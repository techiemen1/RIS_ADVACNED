import React, { useEffect, useState } from "react";
import PACSOverview from "../components/PACSOverview";

interface Stat {
  label: string;
  value: number | string;
}

const DashboardV4: React.FC = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🔹 TEMP DEMO DATA (replace with /analytics/dashboard later)
    setTimeout(() => {
      setStats([
        { label: "Patients Today", value: 128 },
        { label: "Studies Today", value: 46 },
        { label: "Pending Reports", value: 11 },
        { label: "Active Users", value: 19 },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">
          Dashboard
        </h1>
        <p className="text-sm text-gray-500">
          RIS & PACS operational overview
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white rounded shadow p-4"
          >
            <div className="text-sm text-gray-500">{s.label}</div>
            <div className="text-2xl font-bold text-gray-800">
              {loading ? "—" : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* PACS Overview */}
      <PACSOverview />
    </div>
  );
};

export default DashboardV4;

