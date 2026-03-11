import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Trash2, Plus, Save, BookOpen, MessageSquare, Zap, CheckCircle2 } from "lucide-react";

export default function VocabularySettings() {
    const [dictionary, setDictionary] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState("terms");

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await axiosInstance.get("/dictation/dictionary");
            setDictionary(data.data);
        } catch (err: any) {
            setError("Failed to load dictionary: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const saveDict = async () => {
        setSaving(true);
        try {
            await axiosInstance.put("/dictation/dictionary", dictionary);
            setSuccess("Dictionary saved successfully");
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const addItem = (category: string) => {
        const value = prompt(`Add new item to ${category}:`);
        if (!value) return;
        setDictionary({
            ...dictionary,
            [category]: [...(dictionary[category] || []), value]
        });
    };

    const removeItem = (category: string, index: number) => {
        const list = [...dictionary[category]];
        list.splice(index, 1);
        setDictionary({ ...dictionary, [category]: list });
    };

    const addKeyValue = (category: string) => {
        const key = prompt("Enter Shortcut (e.g. nad):");
        if (!key) return;
        const value = prompt("Enter Expansion (e.g. No Abnormality Detected):");
        if (!value) return;
        setDictionary({
            ...dictionary,
            [category]: { ...dictionary[category], [key.toLowerCase()]: value }
        });
    };

    const removeKey = (category: string, key: string) => {
        const newCat = { ...dictionary[category] };
        delete newCat[key];
        setDictionary({ ...dictionary, [category]: newCat });
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Loading Medical Lexicon...</div>;
    if (!dictionary) return (
        <div className="p-8 flex flex-col items-center gap-4">
            <p className="text-slate-400 italic">Dictionary not available. Verify backend API.</p>
            <Button onClick={load}>Retry</Button>
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Medical Lexicon Command Center</h1>
                    <p className="text-slate-500 text-sm italic">Teach the system your specific clinical vocabulary and shortcuts.</p>
                </div>
                <div className="flex gap-2">
                    {success && <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold animate-in fade-in duration-300"><CheckCircle2 size={14} /> {success}</span>}
                    <Button onClick={saveDict} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20">
                        <Save size={16} /> {saving ? "Saving..." : "Commit Changes"}
                    </Button>
                </div>
            </div>

            <div className="w-full">
                <div className="flex bg-slate-100 p-1 mb-6 rounded-xl w-full max-w-md">
                    <button
                        onClick={() => setActiveTab("terms")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'terms' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <BookOpen size={14} /> Clinical Terms
                    </button>
                    <button
                        onClick={() => setActiveTab("shortcuts")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'shortcuts' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Zap size={14} /> Voice Shortcuts
                    </button>
                    <button
                        onClick={() => setActiveTab("phrases")}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'phrases' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <MessageSquare size={14} /> Local Phrasing
                    </button>
                </div>

                {activeTab === "terms" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        {['body_parts', 'impressions_findings', 'patterns_descriptors'].map(cat => (
                            <Card key={cat} className="border-slate-200 shadow-sm overflow-hidden bg-white/50 backdrop-blur">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-black">{cat.replace('_', ' ')}</CardTitle>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={() => addItem(cat)}><Plus size={14} /></Button>
                                </CardHeader>
                                <CardContent className="p-0 h-[300px] overflow-y-auto custom-scrollbar">
                                    <div className="divide-y divide-slate-50">
                                        {dictionary[cat]?.map((item: string, i: number) => (
                                            <div key={i} className="flex items-center justify-between px-4 py-2 hover:bg-white group transition-colors">
                                                <span className="text-sm text-slate-700 font-medium">{item}</span>
                                                <button onClick={() => removeItem(cat, i)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === "shortcuts" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                        {['voice_variants', 'expansions'].map(cat => (
                            <Card key={cat} className="border-slate-200 shadow-sm overflow-hidden bg-white/50 backdrop-blur">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
                                    <CardTitle className="text-xs uppercase tracking-widest text-slate-500 font-black">{cat.replace('_', ' ')}</CardTitle>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600" onClick={() => addKeyValue(cat)}><Plus size={14} /></Button>
                                </CardHeader>
                                <CardContent className="p-0 h-[400px] overflow-y-auto custom-scrollbar">
                                    <div className="divide-y divide-slate-50">
                                        {Object.entries(dictionary[cat] || {}).map(([k, v]: [string, any]) => (
                                            <div key={k} className="flex items-center justify-between px-4 py-3 hover:bg-white group transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-blue-700 uppercase tracking-tighter">{k}</span>
                                                    <span className="text-xs text-slate-500 italic">{v}</span>
                                                </div>
                                                <button onClick={() => removeKey(cat, k)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {activeTab === "phrases" && (
                    <div className="animate-in fade-in duration-300">
                        <Card className="border-slate-200 shadow-sm bg-white/50 backdrop-blur">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="text-sm font-bold">Indian Specific Phrasing & Common Closures</CardTitle>
                                <Button onClick={() => addItem('indian_specific')} className="bg-slate-900 text-white gap-2"><Plus size={14} /> Add Phrase</Button>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {dictionary['indian_specific']?.map((p: string, i: number) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl group hover:border-blue-200 transition-all shadow-sm">
                                        <span className="text-xs text-slate-600 font-medium">{p}</span>
                                        <button onClick={() => removeItem('indian_specific', i)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
            {error && <div className="text-red-500 text-sm mt-4">{error}</div>}
        </div>
    );
}
