// src/pages/MWL/MWLRegister.tsx
import React, { useState, useEffect } from "react";
import axiosInstance from "../../services/axiosInstance";

type Props = {
  onCreated?: () => void;
  patients?: any[]; // pass patient list or load here
};

export default function MWLRegister({ onCreated, patients = [] }: Props) {
  const [patientId, setPatientId] = useState<string | number>("");
  const [patientName, setPatientName] = useState("");
  const [accession, setAccession] = useState("");
  const [suid, setSuid] = useState("");
  const [modality, setModality] = useState("CT");
  const [scheduled, setScheduled] = useState<string>(new Date().toISOString().slice(0,16));
  const [stationAET, setStationAET] = useState("IPACX_MWL");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // you may fetch patients from /api/patients here if not passed
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return alert("Select patient (patient_id required)");
    setSaving(true);
    try {
      const payload = {
        patient_id: patientId,
        patient_name: patientName,
        patient_id_str: String(patientId),
        accession_number: accession,
        study_instance_uid: suid,
        modality,
        scheduled_datetime: new Date(scheduled).toISOString(),
        station_aet: stationAET,
        description: "From MWL Register UI"
      };
      const r = await axiosInstance.post("/mwl/register", payload);
      if (r.data?.success) {
        alert("MWL registered");
        setPatientId("");
        setPatientName("");
        setAccession("");
        setSuid("");
        if (onCreated) onCreated();
      } else {
        alert("Failed: " + JSON.stringify(r.data));
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.message || err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-semibold mb-2">Register MWL Entry</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm">Patient</label>
          <select className="w-full border p-1" value={patientId} onChange={(e)=> setPatientId(e.target.value)}>
            <option value="">-- select patient --</option>
            {patients.map((p:any) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} ({p.id})</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm">Patient name</label>
          <input className="w-full border p-1" value={patientName} onChange={(e)=>setPatientName(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Accession</label>
          <input className="w-full border p-1" value={accession} onChange={(e)=>setAccession(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Study UID</label>
          <input className="w-full border p-1" value={suid} onChange={(e)=>setSuid(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Modality</label>
          <input className="w-full border p-1" value={modality} onChange={(e)=>setModality(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Scheduled</label>
          <input type="datetime-local" className="w-full border p-1" value={scheduled} onChange={(e)=>setScheduled(e.target.value)} />
        </div>

        <div>
          <label className="text-sm">Station AET</label>
          <input className="w-full border p-1" value={stationAET} onChange={(e)=>setStationAET(e.target.value)} />
        </div>

        <div className="col-span-2 flex gap-2 mt-2">
          <button className="px-3 py-1 bg-blue-600 text-white rounded" disabled={saving}>Register</button>
          <button type="button" className="px-3 py-1 bg-gray-200 rounded" onClick={() => { setPatientId(""); setPatientName(""); setAccession(""); setSuid(""); }}>Clear</button>
        </div>
      </form>
    </div>
  );
}
