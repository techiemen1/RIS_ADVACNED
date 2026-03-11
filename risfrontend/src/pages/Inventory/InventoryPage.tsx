import React, { useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Plus, Search, Package, Trash2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { getModalityColors } from "../../utils/modalityColors";

interface InventoryItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
  modality: string;
  created_at: string;
}

interface Modality {
  name: string;
  color: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [modalities, setModalities] = useState<Modality[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "", category: "Consumable", quantity: 0, unit_price: 0, modality: "ALL"
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, modRes] = await Promise.all([
        axiosInstance.get("/inventory"),
        axiosInstance.get("/modalities")
      ]);
      setItems(invRes.data || []);
      setModalities(modRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    try {
      await axiosInstance.post("/inventory", newItem);
      setShowModal(false);
      setNewItem({ name: "", category: "Consumable", quantity: 0, unit_price: 0, modality: "ALL" });
      loadData();
    } catch (e) {
      alert("Failed to create item");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete item?")) return;
    try {
      await axiosInstance.delete(`/inventory/${id}`);
      loadData();
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const filteredItems = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.modality.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Supply Chain</h1>
            </div>
            <p className="text-slate-500 font-medium ml-1">Monitor clinical consumables and equipment inventory across modalities.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 px-6 py-6 rounded-2xl shadow-xl shadow-indigo-100 font-bold uppercase tracking-widest text-xs transition-all active:scale-95">
            <Plus className="w-4 h-4" /> Provision Item
          </Button>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Inventory Sync...</span>
            </div>
          )}

          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search inventory matrix..."
                className="pl-12 bg-white border-transparent h-12 rounded-2xl shadow-inner focus:ring-2 focus:ring-indigo-500/10 placeholder:text-slate-300 font-medium"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Stock Level Stable
              </div>
              <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Reorder Required
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Item Specification</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Modality</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Available Qty</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Unit Valuation</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredItems.map(item => (
                  <tr key={item.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                    <td className="px-8 py-6 font-black text-slate-800 uppercase tracking-tight text-sm">
                      {item.name}
                      {item.quantity < 10 && (
                        <span className="ml-3 px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black uppercase tracking-widest border border-amber-200">Low Stock</span>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">{item.category}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm",
                        item.modality === 'ALL'
                          ? "bg-slate-100 text-slate-600 border-slate-200"
                          : cn(getModalityColors(item.modality).bg, getModalityColors(item.modality).text, getModalityColors(item.modality).border)
                      )}>
                        {item.modality}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col items-center gap-1">
                        <span className={cn(
                          "font-mono text-lg font-black",
                          item.quantity < 10 ? "text-amber-600" : "text-slate-900"
                        )}>{item.quantity}</span>
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full transition-all duration-1000", item.quantity < 10 ? "bg-amber-500" : "bg-emerald-500")}
                            style={{ width: `${Math.min(100, (item.quantity / 50) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 font-mono font-bold text-slate-600 text-sm">₹{item.unit_price.toLocaleString('en-IN')}</td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-300 hover:text-red-600 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-lg transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-20 text-center animate-in fade-in duration-1000">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-slate-200" />
                      </div>
                      <h3 className="text-slate-400 font-black uppercase tracking-widest text-xs">No Inventory Detected</h3>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h2 className="text-lg font-bold mb-4">Add Inventory Item</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Item Name</label>
                  <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Contrast Dye" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Category</label>
                    <select
                      className="w-full border rounded h-9 px-2 text-sm"
                      value={newItem.category}
                      onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                    >
                      <option>Consumable</option>
                      <option>Equipment</option>
                      <option>Service</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Modality Link</label>
                    <select
                      className="w-full border rounded h-9 px-2 text-sm font-semibold"
                      value={newItem.modality}
                      onChange={e => setNewItem({ ...newItem, modality: e.target.value })}
                    >
                      <option value="ALL">ALL (General)</option>
                      {modalities.map(m => (
                        <option key={m.name} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Quantity</label>
                    <Input type="number" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Unit Price (₹)</label>
                    <Input type="number" step="0.01" value={newItem.unit_price} onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
                  <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button onClick={handleCreate} className="bg-slate-800 text-white">Save Item</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
