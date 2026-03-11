// src/pages/MWL/MWLTable.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";

type MWLEntry = {
  id: number;
  patient_id: number | string;
  patient_name: string;
  patient_id_str: string;
  accession_number: string;
  study_instance_uid: string;
  modality: string;
  scheduled_datetime: string;
  created_at: string;
};

export default function MWLTable() {
  const [data, setData] = useState<MWLEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await axiosInstance.get("/mwl");
      setData(r.data?.data || []);
    } catch (err) {
      console.error("Failed to load MWL", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete MWL entry?")) return;
    try {
      await axiosInstance.delete(`/mwl/${id}`);
      load();
    } catch (err) {
      console.error("delete failed", err);
      alert("Delete failed");
    }
  };

  return (
    <div className="bg-white p-3 rounded shadow">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold">Modality Worklist (MWL)</h3>
        <button className="px-2 py-1 bg-gray-200 rounded" onClick={load}>Refresh</button>
      </div>

      {loading ? <div>Loading…</div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2">Patient</th>
                <th className="p-2">Patient ID</th>
                <th className="p-2">Accession</th>
                <th className="p-2">SUID</th>
                <th className="p-2">Modality</th>
                <th className="p-2">Scheduled</th>
                <th className="p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="p-2">{d.patient_name || "—"}</td>
                  <td className="p-2">{d.patient_id_str || d.patient_id || "—"}</td>
                  <td className="p-2">{d.accession_number || "—"}</td>
                  <td className="p-2">{d.study_instance_uid || "—"}</td>
                  <td className="p-2">{d.modality || "—"}</td>
                  <td className="p-2">{d.scheduled_datetime ? new Date(d.scheduled_datetime).toLocaleString() : "—"}</td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => handleDelete(d.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={7} className="text-center p-4 text-gray-500">No entries</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
