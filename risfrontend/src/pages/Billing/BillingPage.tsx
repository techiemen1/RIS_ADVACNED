/* eslint-disable no-restricted-globals */
import React, { useCallback, useEffect, useState } from "react";
import axiosInstance from "../../services/axiosInstance";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Plus, X, Trash2, Printer } from "lucide-react"; // Added Printer
import dayjs from "dayjs";
import { toast } from "react-hot-toast";
import { InvoiceTemplate } from "../../components/billing/InvoiceTemplate"; // Import
import { cn } from "../../lib/utils";
import { getModalityColors } from "../../utils/modalityColors";




import PatientSearch from "../../components/Patients/PatientSearch"; // Import Search
import { Patient } from "../../types/patient";

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchedPatient, setSearchedPatient] = useState<Patient | null>(null); // State for search

  // Inventory
  const [inventory, setInventory] = useState<any[]>([]);

  // Invoice Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  // Invoice Form State
  const [procedurePrice, setProcedurePrice] = useState(1000); // Default base price
  const [discount, setDiscount] = useState(0);
  const [selectedConsumables, setSelectedConsumables] = useState<any[]>([]); // { id, name, price, qty }
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [previewInvoice, setPreviewInvoice] = useState<any>(null);

  // Hospital Settings for Branding
  const [hospitalInfo, setHospitalInfo] = useState<any>({});
  // Tax Settings
  const [gstConfig, setGstConfig] = useState({ cgstRate: 9, sgstRate: 9, igstRate: 18, gstin: "", state: "India" });

  const loadSettings = async () => {
    try {
      const r = await axiosInstance.get("/settings");
      const s = r.data?.data || {};
      setHospitalInfo(s);

      // Map GST config
      setGstConfig({
        cgstRate: 9, // Default to 9/9/18 for India standard if not specific
        sgstRate: 9,
        igstRate: 18,
        gstin: s.gstin || "",
        state: s.state || "India"
      });
    } catch (e) { console.error(e); }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === "pending") {
        const r = await axiosInstance.get("/orders");
        // Filter locally for now
        setOrders((r.data?.data || []).filter((o: any) => o.status !== "COMPLETED" && o.status !== "CANCELLED"));
      } else if (activeTab === "history") {
        const r = await axiosInstance.get("/billing");
        setOrders(r.data?.data || []);
      }

      // Load inventory for the dropdown
      const invRes = await axiosInstance.get("/inventory");
      setInventory(invRes.data || []);

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
    loadSettings();
  }, [loadData]);

  // Open Modal
  const openInvoiceModal = (order: any) => {
    setSelectedOrder(order);
    setProcedurePrice(1000); // Reset base price (could fetch from a Service Master later)
    setDiscount(0);
    setSelectedConsumables([]);
    setShowModal(true);
  };

  // Add Consumable
  const addConsumable = () => {
    if (!selectedInventoryId) return;
    const item = inventory.find(i => i.id.toString() === selectedInventoryId);
    if (!item) return;

    // Check if already added
    if (selectedConsumables.find(c => c.id === item.id)) {
      toast.error("Item already added");
      return;
    }

    setSelectedConsumables([...selectedConsumables, {
      id: item.id,
      name: item.name,
      price: parseFloat(item.unit_price) || 0,
      qty: 1,
      unit: item.measure_unit
    }]);
    setSelectedInventoryId("");
  };

  const removeConsumable = (id: number) => {
    setSelectedConsumables(prev => prev.filter(c => c.id !== id));
  };

  // Calculate Totals
  const calculateTotals = () => {
    const consumablesTotal = selectedConsumables.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const subtotal = procedurePrice + consumablesTotal;
    const taxable = Math.max(0, subtotal - discount);

    // Simple IGST logic: if patient state exists and is different from hospital state
    const isIGST = selectedOrder?.patient_state && hospitalInfo.state && selectedOrder.patient_state !== hospitalInfo.state;

    const cgst = isIGST ? 0 : (taxable * gstConfig.cgstRate) / 100;
    const sgst = isIGST ? 0 : (taxable * gstConfig.sgstRate) / 100;
    const igst = isIGST ? (taxable * gstConfig.igstRate) / 100 : 0;

    return { taxable, cgst, sgst, igst, isIGST, total: taxable + cgst + sgst + igst };
  };

  const totals = calculateTotals();

  // Submit Invoice
  const handleGenerateInvoice = async () => {
    if (!selectedOrder) return;
    if (!confirm(`Confirm Invoice Total: ₹${totals.total.toFixed(2)}?`)) return;

    try {
      await axiosInstance.post("/billing", {
        patient_id: selectedOrder.patient_id,
        order_id: selectedOrder.id,
        invoice_number: `INV-${Date.now()}`,
        hsn_code: "999333",
        taxable_amount: totals.taxable,
        cgst_rate: gstConfig.cgstRate,
        sgst_rate: gstConfig.sgstRate,
        igst_rate: gstConfig.igstRate,
        cgst_amount: totals.cgst,
        sgst_amount: totals.sgst,
        igst_amount: totals.igst,
        total_amount: totals.total,
        discount: discount,
        payment_status: "paid",
        payment_method: "cash",
        created_by: "1",
        meta: {
          procedure_price: procedurePrice,
          consumables: selectedConsumables
        }
      });

      toast.success("Invoice Generated");
      setShowModal(false);
      loadData();
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate invoice");
    }
  };

  // Function to handle patient selection from search
  const handlePatientSelect = (patient: Patient) => {
    setSearchedPatient(patient);
    toast.success(`Patient Selected: ${patient.name}`);
  };

  const startDirectBilling = () => {
    if (!searchedPatient) return;
    // Mock an order object to reuse the modal
    const mockOrder = {
      id: `WALK-IN-${Date.now()}`,
      patient_id: searchedPatient.id,
      patient_name: searchedPatient.name,
      patient_state: "India", // Default or from patient record
      modality: "Gen",
      procedure_description: "Walk-in Service",
      created_at: new Date().toISOString()
    };
    openInvoiceModal(mockOrder);
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen font-sans">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Billing & Invoicing</h1>
          <p className="text-sm text-slate-500 mt-1">Generate invoices for completed or scheduled procedures</p>
        </div>

        {/* Patient Search Integration */}
        <div className="flex flex-col items-end gap-2 z-20">
          <div className="flex items-center gap-2">
            <PatientSearch onSelect={handlePatientSelect} className="w-80 shadow-sm" />
            {searchedPatient && (
              <Button onClick={startDirectBilling} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white whitespace-nowrap">
                <Plus size={16} className="mr-1" /> Bill {searchedPatient.name.split(' ')[0]}
              </Button>
            )}
          </div>
          {searchedPatient && searchedPatient.isPregnant && (
            <div className="bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-xs font-bold border border-pink-200 animate-in fade-in slide-in-from-right-4">
              ⚠️ Pregnant (GA: {searchedPatient.gestational_age || 'Unknown'}) - Check Insurance Maternity Cover
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "pending" ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100"}`}
        >
          Pending Orders
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "history" ? "bg-blue-600 text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-100"}`}
        >
          Invoice History
        </button>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          {activeTab === "pending" && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-10 text-center text-slate-400">Loading pending orders...</div>
              ) : (
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Acc #</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Patient</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Modality / Exam</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="p-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-sm font-mono text-slate-600">{o.accession_number}</td>
                        <td className="p-4">
                          <div className="text-sm font-medium text-slate-900">{o.patient_name}</div>
                          <div className="text-xs text-slate-400">ID: {o.patient_id}</div>
                        </td>
                        <td className="p-4">
                          <div className={cn("text-xs font-black inline-block px-1.5 py-0.5 rounded border mb-1 tracking-wider", getModalityColors(o.modality).bg, getModalityColors(o.modality).text, getModalityColors(o.modality).border)}>
                            {o.modality}
                          </div>
                          <div className="text-xs text-slate-500 font-bold">{o.procedure_description || "—"}</div>
                        </td>
                        <td className="p-4 text-sm text-slate-500">{dayjs(o.scheduled_time || o.created_at).format("DD MMM, HH:mm")}</td>
                        <td className="p-4">
                          <Button size="sm" onClick={() => openInvoiceModal(o)}>
                            Generate Invoice
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-slate-400">No pending orders found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Invoice #</th>
                    <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Patient</th>
                    <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Service Provided</th>
                    <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Amount</th>
                    <th className="p-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="p-4 text-right text-xs font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="p-4 text-center text-xs font-black text-slate-400 uppercase tracking-widest">Print</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {orders.map((inv: any) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 text-sm font-mono text-indigo-600 font-bold">{inv.invoice_number}</td>
                      <td className="p-4">
                        <p className="text-sm font-black text-slate-800">{inv.patient_name}</p>
                        <p className="text-xs text-slate-400 font-medium">MRN: {inv.mrn || 'N/A'}</p>
                      </td>
                      <td className="p-4">
                        <p className={cn("text-[10px] font-black uppercase tracking-wider mb-0.5", getModalityColors(inv.modality).text)}>{inv.modality}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px] font-medium">{inv.procedure_description}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-black text-emerald-600">₹{parseFloat(inv.total_amount).toFixed(2)}</p>
                        <p className="text-[10px] text-slate-400 uppercase">Inc. Tax</p>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="p-4 text-right text-xs font-bold text-slate-500">
                        {dayjs(inv.created_at).format("DD MMM YYYY")}
                      </td>
                      <td className="p-4 text-center">
                        <button onClick={() => setPreviewInvoice(inv)} className="text-slate-400 hover:text-indigo-600 transition-colors bg-white p-2 rounded shadow-sm border border-slate-200">
                          <Printer size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} className="p-20 text-center text-slate-300 font-black text-xl italic uppercase">No Invoice Records Found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* INVOICE GENERATION MODAL */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Generate Invoice</h3>
                <p className="text-xs text-gray-500">{selectedOrder.patient_name} — {selectedOrder.procedure_description}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Base Procedure Cost */}
              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                <label className="block text-sm font-semibold text-blue-900 mb-2">Procedure Charge ({selectedOrder.modality})</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">₹</span>
                  <Input
                    type="number"
                    className="bg-white border-blue-200"
                    value={procedurePrice}
                    onChange={e => setProcedurePrice(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Discount Field */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Discount Amount</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">₹</span>
                  <Input
                    type="number"
                    className="bg-white border-slate-300"
                    value={discount}
                    onChange={e => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Consumables Section */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-gray-700">Add Inventory / Consumables</label>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">{selectedConsumables.length} items added</span>
                </div>

                <div className="flex gap-2 mb-3">
                  <select
                    className="flex-1 rounded-md border border-gray-300 p-2 text-sm"
                    value={selectedInventoryId}
                    onChange={e => setSelectedInventoryId(e.target.value)}
                  >
                    <option value="">Select Item...</option>
                    {inventory
                      .filter(i => i.modality === 'ALL' || i.modality === selectedOrder.modality)
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name} [{item.modality || 'ALL'}] - ₹{item.unit_price} (Stock: {item.quantity})
                        </option>
                      ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={addConsumable} disabled={!selectedInventoryId}>
                    <Plus size={16} /> Add
                  </Button>
                </div>

                {/* Added Items List */}
                {selectedConsumables.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Item</th>
                          <th className="px-3 py-2 text-center">Qty</th>
                          <th className="px-3 py-2 text-right">Price</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedConsumables.map(item => (
                          <tr key={item.id} className="group">
                            <td className="px-3 py-2 font-medium">{item.name}</td>
                            <td className="px-3 py-2 text-center">
                              <input
                                type="number"
                                className="w-12 text-center border rounded p-1 text-xs"
                                value={item.qty}
                                onChange={(e) => {
                                  const newQty = Math.max(1, Number(e.target.value));
                                  setSelectedConsumables(prev => prev.map(c => c.id === item.id ? { ...c, qty: newQty } : c));
                                }}
                              />
                            </td>
                            <td className="px-3 py-2 text-right text-gray-500">₹{item.price}</td>
                            <td className="px-3 py-2 text-right font-medium">₹{(item.price * item.qty).toFixed(2)}</td>
                            <td className="px-3 py-2 text-center">
                              <button onClick={() => removeConsumable(item.id)} className="text-red-400 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-4 border border-dashed rounded-lg text-gray-400 text-xs italic">
                    No consumables added.
                  </div>
                )}
              </div>
            </div>

            {/* Footer / Calculation */}
            <div className="bg-gray-50 p-5 border-t border-gray-200">
              <div className="flex justify-end text-sm space-y-1 flex-col items-end mb-4">
                <div className="flex justify-between w-48">
                  <span className="text-gray-500">Taxable Amount:</span>
                  <span className="font-medium">₹{totals.taxable.toFixed(2)}</span>
                </div>
                {totals.isIGST ? (
                  <div className="flex justify-between w-48 text-gray-400 text-xs border-b border-gray-200 pb-1">
                    <span>IGST ({gstConfig.igstRate}%):</span>
                    <span>+ ₹{totals.igst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between w-48 text-gray-400 text-xs">
                      <span>CGST ({gstConfig.cgstRate}%):</span>
                      <span>+ ₹{totals.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between w-48 text-gray-400 text-xs border-b border-gray-200 pb-1">
                      <span>SGST ({gstConfig.sgstRate}%):</span>
                      <span>+ ₹{totals.sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between w-48 text-lg font-bold text-gray-800 pt-1">
                  <span>Total:</span>
                  <span>₹{totals.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleGenerateInvoice} className="bg-green-600 hover:bg-green-700 text-white min-w-[150px]">
                  Create Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* PRINT PREVIEW MODAL */}
      {previewInvoice && (
        <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto w-auto max-w-4xl relative flex flex-col print:shadow-none print:w-full print:max-w-none print:max-h-none print:overflow-visible">

            <div className="p-4 border-b flex justify-between items-center bg-slate-50 print:hidden sticky top-0 z-10">
              <h3 className="font-bold text-slate-700">Invoice Preview</h3>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPreviewInvoice(null)}>Close</Button>
                <Button onClick={() => window.print()} className="bg-indigo-600 text-white gap-2"><Printer size={16} /> Print</Button>
              </div>
            </div>

            <div className="p-8 print:p-0">
              <InvoiceTemplate invoice={previewInvoice} hospitalInfo={hospitalInfo} />
            </div>

          </div>

          <style>{`
             @media print {
               body > * { display: none !important; }
               body > div.fixed.z-\\[100\\] { display: flex !important; }
               div.fixed.z-\\[100\\] > div { box-shadow: none !important; max-height: none !important; overflow: visible !important; }
             }
           `}</style>
        </div>
      )}
    </div>
  );
}





