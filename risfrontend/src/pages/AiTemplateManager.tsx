// src/pages/TemplateManager.tsx
import React, { useEffect, useState } from "react";
import axiosInstance from "../services/axiosInstance";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

export default function TemplateManager() {
  const [list, setList] = useState([]);
  const [editing, setEditing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await axiosInstance.get('/ai/templates');
      setList(r.data?.data || []);
    } catch (e) { setList([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (editing?.id) await axiosInstance.put(`/ai/templates/${editing.id}`, editing);
      else await axiosInstance.post('/ai/templates', editing);
      setEditing(null); load();
    } catch (e) { alert('Save failed'); }
  };

  const remove = async (id:number) => {
    if (!confirm('Delete template?')) return;
    try { await axiosInstance.delete(`/ai/templates/${id}`); load(); } catch(e){ alert('Delete failed'); }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Template Manager</h2>
        <Button onClick={()=> setEditing({name:'',modality:'',content:''})}>New</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Input placeholder="Search..." value={q} onChange={(e)=> setQ(e.target.value)} />
          <div className="mt-3 space-y-2">
            {list.filter((t:any)=> (t.name+t.modality).toLowerCase().includes(q.toLowerCase())).map((t:any)=> (
              <div key={t.id} className="p-2 bg-white rounded shadow-sm flex justify-between">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.modality}</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={()=> setEditing(t)}>Edit</Button>
                  <Button variant="destructive" onClick={()=> remove(t.id)}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          {editing ? (
            <div className="bg-white p-3 rounded shadow">
              <label className="block text-sm">Name</label>
              <Input value={editing.name} onChange={(e:any)=> setEditing({...editing, name: e.target.value})}/>
              <label className="block text-sm mt-2">Modality</label>
              <Input value={editing.modality} onChange={(e:any)=> setEditing({...editing, modality: e.target.value})}/>
              <label className="block text-sm mt-2">Content</label>
              <textarea className="w-full border rounded p-2" rows={10} value={editing.content} onChange={(e:any)=> setEditing({...editing, content: e.target.value})}/>
              <div className="flex gap-2 mt-3">
                <Button onClick={save}>Save</Button>
                <Button variant="outline" onClick={()=> setEditing(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Select a template or click New</div>
          )}
        </div>
      </div>
    </div>
  );
}
