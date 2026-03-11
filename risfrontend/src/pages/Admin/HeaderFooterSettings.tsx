
// src/pages/admin/HeaderFooterSettings.tsx
import React, { useEffect, useState } from 'react';
import axiosInstance from '../../services/axiosInstance';

export default function HeaderFooterSettings() {
  const [settings, setSettings] = useState<any>({});
  const [hospitalName, setHospitalName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const r = await axiosInstance.get('/api/settings');
    setSettings(r.data.data || {});
    setHospitalName(r.data.data?.['hospital.name'] || '');
  };

  const save = async () => {
    await axiosInstance.post('/api/settings/save', { 'hospital.name': hospitalName });
    alert('Saved');
    load();
  };

  const upload = async (url: string, file: File | null) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const r = await axiosInstance.post(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    alert('Uploaded');
    load();
  };

  return (
    <div className="p-4">
      <h3 className="font-semibold">Hospital Header / Footer</h3>
      <div className="mt-2">
        <label className="block text-sm">Hospital Name</label>
        <input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className="border rounded px-2 py-1 w-full" />
      </div>

      <div className="mt-3">
        <label className="block text-sm">Logo</label>
        <input type="file" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} />
        <button className="ml-2 px-3 py-1 border" onClick={() => upload('/api/settings/upload/logo', logoFile)}>Upload Logo</button>
        <div className="text-xs text-gray-600 mt-1">Current: {settings['hospital.logo']}</div>
      </div>

      <div className="mt-3">
        <label className="block text-sm">Signature Image</label>
        <input type="file" onChange={(e) => setSignatureFile(e.target.files?.[0] ?? null)} />
        <button className="ml-2 px-3 py-1 border" onClick={() => upload('/api/settings/upload/signature', signatureFile)}>Upload Signature</button>
        <div className="text-xs text-gray-600 mt-1">Current: {settings['hospital.signature']}</div>
      </div>

      <div className="mt-4">
        <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={save}>Save</button>
      </div>
    </div>
  );
}
