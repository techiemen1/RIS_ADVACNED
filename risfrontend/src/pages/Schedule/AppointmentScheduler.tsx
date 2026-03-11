// src/pages/Schedule/AppointmentScheduler.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";

type Props = { prefill?: any | null; onSaved?: () => void };

export default function AppointmentScheduler({ prefill, onSaved }: Props) {
  const [patientId, setPatientId] = useState(prefill?.patient_id ?? '');
  const [patientName, setPatientName] = useState(prefill?.patient_name ?? '');
  const [modality, setModality] = useState(prefill?.modality ?? 'CR');
  const [accession, setAccession] = useState(prefill?.accession_number ?? '');
  const [scheduledStart, setScheduledStart] = useState((prefill?.scheduled_start ? prefill.scheduled_start.slice(0, 16) : new Date().toISOString().slice(0, 16)));
  const [bodyPart, setBodyPart] = useState(prefill?.body_part ?? '');
  const [scanType, setScanType] = useState(prefill?.scan_type ?? '');
  const [saving, setSaving] = useState(false);
  const [modalities, setModalities] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await axiosInstance.get('/modalities');
        const list = r.data?.data ?? r.data ?? [];
        setModalities(Array.isArray(list) ? list : []);
      } catch {
        setModalities([]);
      }
    })();
  }, []);

  const previewAcc = async () => {
    try {
      const r = await axiosInstance.get('/accession/preview');
      setAccession(r.data?.accession ?? r.data?.data?.accession ?? '');
    } catch (e) { console.error(e); alert('Preview failed'); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let acc = accession;
      if (!acc) {
        const r = await axiosInstance.post('/accession/next');
        acc = r.data?.accession ?? r.data?.data?.accession;
        setAccession(acc);
      }
      await axiosInstance.post('/accession/uid/reserve', { count: 1 }).catch(() => { });
      const payload = {
        patient_id: patientId || null,
        patient_name: patientName || null,
        modality,
        accession_number: acc,
        requested_procedure_id: '',
        scheduled_start: scheduledStart,
        scheduled_end: null,
        station_aet: null,
        status: 'SCHEDULED',
        study_instance_uid: prefill?.study_instance_uid ?? prefill?.studyUID ?? null,
        body_part: bodyPart || null,
        scan_type: scanType || null
      };
      if (prefill?.id) await axiosInstance.put(`/appointments/${prefill.id}`, payload);
      else await axiosInstance.post('/appointments', payload);
      alert('Saved');
      onSaved && onSaved();
    } catch (err: any) {
      console.error(err);
      alert('Save failed: ' + (err?.response?.data?.message ?? err.message));
    } finally { setSaving(false); }
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-1 h-6 bg-indigo-600 rounded-full"></span>
        {prefill?.id ? 'Edit Booking' : 'Schedule New Scan'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Patient ID</label><Input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="bg-slate-50" /></div>
        <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Patient Name</label><Input value={patientName} onChange={(e) => setPatientName(e.target.value)} className="bg-slate-50" /></div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Modality</label>
          <select 
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
            value={modality} 
            onChange={(e) => {
              setModality(e.target.value);
              setBodyPart('');
              setScanType('');
            }}
          >
            <option value="">Select...</option>
            {modalities.map(m => <option key={m.id || m.name} value={m.name}>{m.name}</option>)}
            {!modalities.length && ["CR", "CT", "MR", "US", "DX", "MG", "NM"].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Body Part</label>
          <select 
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
            value={bodyPart} 
            onChange={(e) => {
              setBodyPart(e.target.value);
              setScanType('');
            }}
          >
            <option value="">Select Region...</option>
            {(() => {
              const mData = modalities.find(m => m.name === modality);
              if (!mData?.body_parts) return null;
              const bp = typeof mData.body_parts === 'string' ? JSON.parse(mData.body_parts) : mData.body_parts;
              return Array.isArray(bp) ? bp.map((b: any) => <option key={b.name} value={b.name}>{b.name}</option>) : null;
            })()}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Scan Type</label>
          <select 
            className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" 
            value={scanType} 
            onChange={(e) => setScanType(e.target.value)}
            disabled={!bodyPart}
          >
            <option value="">Select Protocol...</option>
            {(() => {
              const mData = modalities.find(m => m.name === modality);
              if (!mData?.body_parts) return null;
              const bp = typeof mData.body_parts === 'string' ? JSON.parse(mData.body_parts) : mData.body_parts;
              const activeBP = Array.isArray(bp) ? bp.find((b: any) => b.name === bodyPart) : null;
              return activeBP?.scans?.map((s: string) => <option key={s} value={s}>{s}</option>);
            })()}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Scheduled Start</label>
          <input type="datetime-local" value={scheduledStart} onChange={(e) => setScheduledStart(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Accession</label>
          <div className="flex gap-2">
            <Input value={accession} onChange={(e) => setAccession(e.target.value)} className="bg-slate-50 font-mono" />
            <Button onClick={previewAcc} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">Generate</Button>
          </div>
        </div>
      </div>
      <div className="mt-6 text-right pt-4 border-t border-slate-100">
        <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 font-semibold px-8">
          {saving ? 'Processing...' : 'Confirm Booking'}
        </Button>
      </div>
    </div>
  );
}
