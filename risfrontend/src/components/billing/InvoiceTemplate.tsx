import React from "react";
import dayjs from "dayjs";
import { FileText, Smartphone, Mail, MapPin, Hospital } from "lucide-react";

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, { invoice: any, hospitalInfo: any }>(({ invoice, hospitalInfo }, ref) => {
    if (!invoice) return null;

    const isIGST = invoice.igst_amount > 0 || (hospitalInfo.state && invoice.patient_state && hospitalInfo.state !== invoice.patient_state);

    return (
        <div ref={ref} className="bg-white p-10 max-w-[210mm] mx-auto min-h-[297mm] text-slate-800 font-sans print:p-0">

            {/* 1. Header Branding */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900">{hospitalInfo.name || 'IPACX DIAGNOSTICS'}</h1>
                    <div className="text-sm text-slate-500 mt-2 space-y-1">
                        <p className="flex items-center gap-2 max-w-sm"><MapPin size={14} className="shrink-0" /> {hospitalInfo.address}</p>
                        <p className="flex items-center gap-2"><Smartphone size={14} /> {hospitalInfo.phone}</p>
                        <p className="flex items-center gap-2"><Mail size={14} /> {hospitalInfo.email}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="bg-slate-900 text-white px-4 py-1 text-sm font-bold uppercase tracking-widest inline-block mb-2">
                        Tax Invoice
                    </div>
                    <p className="text-sm font-bold text-slate-600 uppercase">GSTIN: {hospitalInfo.gstin || 'N/A'}</p>
                    <p className="text-sm font-bold text-slate-600 uppercase">PAN: {hospitalInfo.pan || 'N/A'}</p>
                    <p className="text-xs text-slate-400 mt-1">Original for Recipient</p>
                </div>
            </div>

            {/* 2. Meta Grid */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="border p-4 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Billed To</p>
                    <p className="font-bold text-lg text-slate-900 uppercase">{invoice.patient_name}</p>
                    <p className="text-sm text-slate-600">MRN: {invoice.mrn || 'N/A'}</p>
                    <p className="text-sm text-slate-600">Age/Sex: {invoice.patient_age || 'N/A'}</p>
                    {invoice.patient_state && <p className="text-xs text-slate-500 mt-1 uppercase font-bold">State: {invoice.patient_state}</p>}
                </div>
                <div className="border p-4 rounded-lg bg-slate-50">
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Invoice No.</span>
                        <span className="font-mono font-bold text-slate-900">{invoice.invoice_number}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Date</span>
                        <span className="font-mono font-bold text-slate-900">{dayjs(invoice.created_at).format("DD MMM YYYY")}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Pay Mode</span>
                        <span className="font-bold text-slate-900 uppercase">{invoice.payment_method}</span>
                    </div>
                </div>
            </div>

            {/* 3. Items Table */}
            <table className="w-full mb-8 border-collapse">
                <thead className="bg-slate-100 border-y border-slate-200">
                    <tr>
                        <th className="py-3 px-4 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Description</th>
                        <th className="py-3 px-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest">HSN</th>
                        <th className="py-3 px-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {/* Main Procedure */}
                    <tr>
                        <td className="py-4 px-4">
                            <p className="font-bold text-slate-800 uppercase tracking-tight">{invoice.procedure_description || 'Radiology Service'}</p>
                            <p className="text-xs text-slate-500 font-bold">{invoice.modality} SCAN</p>
                        </td>
                        <td className="py-4 px-4 text-center text-sm font-mono text-slate-500">{invoice.hsn_code || '9993'}</td>
                        <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                            ₹{parseFloat(invoice.taxable_amount || 0).toFixed(2)}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* 4. Totals */}
            <div className="flex justify-between mb-12">
                <div className="w-1/2">
                    {hospitalInfo.bank_name && (
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[10px] space-y-1">
                            <p className="font-black text-slate-400 uppercase tracking-widest mb-1">Bank Details for RTGS/NEFT</p>
                            <p><span className="text-slate-500">Bank:</span> <span className="font-bold">{hospitalInfo.bank_name}</span></p>
                            <p><span className="text-slate-500">A/C:</span> <span className="font-bold">{hospitalInfo.account_number}</span></p>
                            <p><span className="text-slate-500">IFSC:</span> <span className="font-bold">{hospitalInfo.ifsc_code}</span></p>
                        </div>
                    )}
                </div>
                <div className="w-1/3 space-y-3">
                    <div className="flex justify-between text-sm text-slate-600">
                        <span>Taxable Amount</span>
                        <span className="font-mono">₹{parseFloat(invoice.taxable_amount || 0).toFixed(2)}</span>
                    </div>
                    {Number(invoice.discount) > 0 && (
                        <div className="flex justify-between text-sm text-emerald-600 font-bold">
                            <span>Discount</span>
                            <span className="font-mono">- ₹{parseFloat(invoice.discount).toFixed(2)}</span>
                        </div>
                    )}

                    {isIGST ? (
                        <div className="flex justify-between text-sm text-slate-500">
                            <span>IGST ({invoice.igst_rate || 18}%)</span>
                            <span className="font-mono">₹{parseFloat(invoice.igst_amount || 0).toFixed(2)}</span>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>CGST ({invoice.cgst_rate || 9}%)</span>
                                <span className="font-mono">₹{parseFloat(invoice.cgst_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500 pb-3 border-b border-slate-200">
                                <span>SGST ({invoice.sgst_rate || 9}%)</span>
                                <span className="font-mono">₹{parseFloat(invoice.sgst_amount || 0).toFixed(2)}</span>
                            </div>
                        </>
                    )}

                    <div className="flex justify-between text-xl font-black text-slate-900 pt-2">
                        <span>Total Due</span>
                        <span>₹{parseFloat(invoice.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* 5. Footer */}
            <div className="pt-8 border-t-2 border-slate-100 flex justify-between items-end">
                <div className="text-[10px] text-slate-400 max-w-sm leading-relaxed">
                    <p className="font-black text-slate-600 uppercase mb-2 tracking-widest border-b border-slate-100 pb-1">Declarations & Terms</p>
                    <ol className="list-decimal pl-4 space-y-1 font-medium">
                        <li>Certified that the particulars given above are true and correct.</li>
                        <li>This is a computer generated tax invoice and does not require a physical signature.</li>
                        <li>Interest @18% p.a will be charged if payment is not made within 7 days.</li>
                    </ol>
                </div>
                <div className="text-center">
                    <div className="h-16 w-32 mb-2 flex items-end justify-center grayscale opacity-50">
                        <Hospital size={48} className="text-slate-200" />
                    </div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Authorized Signatory</p>
                    <p className="text-[8px] text-slate-400 mt-1 uppercase font-bold">{hospitalInfo.name}</p>
                </div>
            </div>

        </div>
    );
});
