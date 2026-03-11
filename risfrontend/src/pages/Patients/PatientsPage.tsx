// src/pages/Patients/PatientsPage.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Users, Search } from "lucide-react";
import { Input } from "../../components/ui/input";

interface Patient {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
  mrn?: string;
}

const PatientsPage: React.FC = () => {
  const [list, setList] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      try {
        const r = await axiosInstance.get("/api/patients");
        const data = Array.isArray(r.data) ? r.data : [];
        setList(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filtered = list.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.mrn || "").includes(search)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] w-full bg-slate-50 p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Patients Directory</h1>
            <p className="text-sm text-slate-500">Manage patient records and history</p>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            className="pl-9 w-64 bg-white"
            placeholder="Search patients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400">Loading patients...</div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <Users className="w-12 h-12 mb-2 opacity-20" />
            <p>No patients found</p>
          </div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="px-6 py-3">Patient Name</th>
                  <th className="px-6 py-3">DOB</th>
                  <th className="px-6 py-3">Gender</th>
                  <th className="px-6 py-3">MRN</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p, idx) => (
                  <tr key={p.id || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-700">{p.name}</td>
                    <td className="px-6 py-3 text-slate-500">{p.dob || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">{p.gender || "—"}</td>
                    <td className="px-6 py-3 font-mono text-slate-500">{p.mrn || "—"}</td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-xs">View History</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientsPage;
