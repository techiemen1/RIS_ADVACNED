import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useRBAC } from "../../context/RoleContext";
import { Trash2 } from "lucide-react";

interface Consent {
    id: number;
    patient_id: number;
    consent_type: string;
    status: 'PENDING' | 'SIGNED' | 'REVOKED';
    signed_by: string;
    signed_at: string;
    consent_text: string;
}

interface ConsentManagerProps {
    patientId: string;
    patientName: string;
    onClose: () => void;
}

const ConsentManager: React.FC<ConsentManagerProps> = ({ patientId, patientName, onClose }) => {
    const { user } = useRBAC();
    const role = user?.role ?? "viewer";

    const [consents, setConsents] = useState<Consent[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newConsentType, setNewConsentType] = useState('GENERAL');
    const [signerName, setSignerName] = useState('');
    const [isAgreed, setIsAgreed] = useState(false);

    const fetchConsents = useCallback(async () => {
        try {
            const res = await axios.get(`/api/consents/${patientId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            setConsents(res.data);
        } catch (err) {
            console.error(err);
            toast.error("Failed to load consents");
        }
    }, [patientId]);

    useEffect(() => {
        fetchConsents();
    }, [fetchConsents]);

    const handleSign = async () => {
        if (!isAgreed || !signerName) return toast.error("Please agree and sign");

        try {
            await axios.post(`/api/consents`, {
                patient_id: patientId,
                consent_type: newConsentType,
                signed_by: signerName,
                consent_text: `I, ${signerName}, hereby consent to ${newConsentType} procedure for patient ${patientName}.`
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success("Consent Signed");
            setShowAddForm(false);
            setSignerName('');
            setIsAgreed(false);
            fetchConsents();
        } catch (err) {
            console.error(err);
            toast.error("Failed to sign consent");
        }
    };

    const handleRevoke = async (id: number) => {
        if (!window.confirm("Are you sure you want to revoke this consent?")) return;
        try {
            await axios.put(`/api/consents/${id}/revoke`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success("Consent Revoked");
            fetchConsents();
        } catch (err) {
            toast.error("Failed to revoke consent");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("PERMANENTLY DELETE this consent? This cannot be undone.")) return;
        try {
            await axios.delete(`/api/consents/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });
            toast.success("Consent Deleted");
            fetchConsents();
        } catch (err) {
            toast.error("Failed to delete consent");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl w-3/4 max-w-2xl">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-xl font-bold">Consent Management for {patientName}</h3>
                    <button onClick={onClose} className="text-gray-500 text-2xl">&times;</button>
                </div>

                {!showAddForm ? (
                    <div>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="bg-green-600 text-white px-4 py-2 rounded mb-4 hover:bg-green-700"
                        >
                            + New Consent
                        </button>

                        {consents.length === 0 ? (
                            <p className="text-gray-500 italic">No consents recorded.</p>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="p-2 border">Type</th>
                                        <th className="p-2 border">Status</th>
                                        <th className="p-2 border">Signed By</th>
                                        <th className="p-2 border">Date</th>
                                        <th className="p-2 border">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consents.map(c => (
                                        <tr key={c.id} className="border-b">
                                            <td className="p-2 border">{c.consent_type}</td>
                                            <td className="p-2 border">
                                                <span className={`px-2 py-1 rounded text-xs ${c.status === 'SIGNED' ? 'bg-green-100 text-green-800' :
                                                    c.status === 'REVOKED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="p-2 border">{c.signed_by}</td>
                                            <td className="p-2 border">{new Date(c.signed_at).toLocaleDateString()}</td>
                                            <td className="p-2 border flex gap-2">
                                                {c.status === 'SIGNED' && (
                                                    <button onClick={() => handleRevoke(c.id)} className="text-red-600 text-sm hover:underline">Revoke</button>
                                                )}
                                                {role === 'admin' && (
                                                    <button onClick={() => handleDelete(c.id)} className="text-red-800 text-sm hover:underline flex items-center gap-1" title="Hard Delete">
                                                        <Trash2 size={12} /> Del
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    <div className="border p-4 rounded bg-gray-50">
                        <h4 className="font-semibold mb-3">Sign New Consent</h4>

                        <label className="block mb-2">
                            Consent Type:
                            <select
                                value={newConsentType}
                                onChange={(e) => setNewConsentType(e.target.value)}
                                className="block w-full border p-2 rounded mt-1"
                            >
                                <option value="GENERAL">General Consent</option>
                                <option value="CONTRAST">Contrast Enhanced Scan</option>
                                <option value="ANESTHESIA">Anesthesia / Sedation</option>
                                <option value="DATA_SHARING">NDHM Data Sharing</option>
                                <option value="SURGERY">Interventional Procedure</option>
                            </select>
                        </label>

                        <div className="bg-white border p-3 rounded mb-3 text-sm h-32 overflow-y-auto">
                            <p><strong>Terms & Conditions:</strong></p>
                            <p>I hereby confirm that I have explained the procedure, risks, and alternatives to the patient/guardian...</p>
                            <p className="mt-2 text-gray-500">[Full legal text would appear here dynamically based on type]</p>
                        </div>

                        <label className="flex items-center gap-2 mb-3">
                            <input type="checkbox" checked={isAgreed} onChange={(e) => setIsAgreed(e.target.checked)} />
                            <span>I confirm that the patient/guardian has understood and provided verbal consent.</span>
                        </label>

                        <label className="block mb-4">
                            Signed By (Staff Name):
                            <input
                                type="text"
                                value={signerName}
                                onChange={(e) => setSignerName(e.target.value)}
                                className="block w-full border p-2 rounded mt-1"
                                placeholder="e.g. Dr. Radiologist"
                            />
                        </label>

                        <div className="flex gap-2 justify-end">
                            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border rounded bg-white hover:bg-gray-100">Cancel</button>
                            <button
                                onClick={handleSign}
                                disabled={!isAgreed || !signerName}
                                className={`px-4 py-2 rounded text-white ${(!isAgreed || !signerName) ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                Digitally Sign & Save
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConsentManager;
