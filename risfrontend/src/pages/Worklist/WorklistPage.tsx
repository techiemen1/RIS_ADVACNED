import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { toast } from "react-hot-toast";
import dayjs from "dayjs";
import { ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "../../components/ui/button";

const WorklistPage: React.FC = () => {
  const [worklist, setWorklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWorklist = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/worklist");
      setWorklist(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load worklist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorklist();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Radiology Worklist
          </h1>
          <p className="text-sm text-gray-500 mt-1">Technician and Radiologist task list</p>
        </div>
        <Button onClick={loadWorklist} variant="outline" className="gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left">Patient</th>
              <th className="px-6 py-3 text-left">Modality</th>
              <th className="px-6 py-3 text-left">Intelligence</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">Assigned</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading worklist...</td></tr>
            ) : worklist.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-400">No pending worklist items.</td></tr>
            ) : (
              worklist.map((item: any) => (
                <tr key={item.id} className={cn("hover:bg-gray-50", item.is_critical && "bg-red-50/30")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.is_critical && <AlertTriangle className="w-4 h-4 text-red-600 animate-pulse shrink-0" />}
                      <div>
                        <div className="font-bold text-slate-800">{item.first_name} {item.last_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">#{item.patient_id?.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase">
                      {item.modality}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.ai_status === 'analyzed' ? (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <Activity size={12} /> AI ANALYZED
                        </span>
                        {item.ai_findings && (
                          <div className="text-[9px] text-slate-400 truncate max-w-[150px] italic">"{item.ai_findings}"</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300">WAITING</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter
                          ${item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                    {item.assigned_to || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WorklistPage;
