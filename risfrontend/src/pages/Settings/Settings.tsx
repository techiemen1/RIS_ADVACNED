// inside SettingsPage (or a new Admin -> Settings panel)
const [modalities, setModalities] = useState<string[]>([]);
useEffect(() => { axiosInstance.get('/settings/modalities').then(r => setModalities(r.data?.data || [])).catch(() => setModalities([])); }, []);
const saveModalities = async () => { await axiosInstance.post('/settings/modalities', { modalities }); alert('Saved'); };

{/* Modalities editor */ }
<div>
  <label className="block text-sm mb-1">Modalities (comma separated)</label>
  <input value={modalities.join(',')} onChange={(e) => setModalities(e.target.value.split(',').map(s => s.trim()))} className="border px-2 py-1 w-full" />
  <div className="mt-2"><Button onClick={saveModalities}>Save Modalities</Button></div>
</div>
