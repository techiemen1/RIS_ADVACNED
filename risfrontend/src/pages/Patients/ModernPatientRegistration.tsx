// src/pages/Patients/ModernPatientRegistration.tsx
import React, { useState, useEffect, useRef } from "react";
import { Patient } from "../../types/patient";
import {
    User, Phone, Calendar, Heart, Activity, FileText,
    CreditCard, CheckCircle, Search, ChevronRight, ChevronLeft,
    AlertCircle, ShieldCheck, Stethoscope, Users, MapPin,
    Camera, Fingerprint, Building, PenTool
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { cn } from "../../lib/utils";
import dayjs from "dayjs";
import { toast } from "react-hot-toast";

interface ModernPatientRegistrationProps {
    onSubmit: (data: any) => void;
    onCancel: () => void;
    initialData?: Patient | null;
}

const STEPS = [
    { id: 1, title: "Identity", icon: ShieldCheck, desc: "ABHA / Mobile / Voter ID" },
    { id: 2, title: "Demographics", icon: User, desc: "Personal Details" },
    { id: 3, title: "Clinical", icon: Stethoscope, desc: "Vitals, LMP, Creatinine" },
    { id: 4, title: "Workflow", icon: Building, desc: "Visit & Ward Info" },
    { id: 5, title: "Billing", icon: CreditCard, desc: "Payment & Insurance" },
    { id: 6, title: "Consent", icon: PenTool, desc: "Sign & Legal" },
];

const ModernPatientRegistration: React.FC<ModernPatientRegistrationProps> = ({ onSubmit, onCancel, initialData }) => {
    const [step, setStep] = useState(1);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);

    // Form Data State
    const [formData, setFormData] = useState<any>({
        // Identity
        phone: "",
        abha_number: "",
        abha_address: "",
        id_type: "AADHAAR",
        id_number: "",
        voter_id: "",
        biometric_flag: false,
        registration_channel: "DESK",
        photo_url: "",

        // Demographics
        title: "", // Dr., Mr., Ms. etc
        // firstName & lastName handled at bottom with initialData
        name: "", // Computed
        dob: "",
        age: "",
        gender: "Male",
        relationship_type: "S/O",
        relationship_name: "",
        marital_status: "Single",
        occupation: "",
        nationality: "Indian",
        preferred_language: "English",
        address: "",
        email: "",

        // Emergency & Secondary Contact
        emergency_contact_name: "",
        emergency_contact_phone: "",
        emergency_contact_relation: "",
        secondary_contact_name: "",
        secondary_contact_phone: "",

        // Clinical
        blood_group: "",
        height_cm: "",
        weight_kg: "",
        allergies: "",
        current_medications: "",
        medical_history: "",
        pregnancy_status: "None", // None, Pregnant, Post-Partum
        menstrual_status: "", // e.g. Regular, Irregular, Menopause
        lmp_date: "", // Female only
        edd: "", // Calculated
        gestational_age: "", // Calculated
        creatinine_level: "",
        contrast_safety_flag: true,
        modalities: [], // e.g. ["CT", "MRI"]

        // Workflow
        patient_type: "OPD",
        visit_type: "NEW",
        department: "General Medicine",
        attending_physician: "",
        ward_room_bed: "",

        // Billing
        billing_category: "Self-Pay",
        insurance_provider: "",
        insurance_id: "",

        // Consent
        consent_image_sharing: false,
        consent_research_ai: false,
        consent_telemedicine: false,
        data_privacy_accepted: true,
        digital_signature: "",

        // ABHA Verification State
        showAbhaOtp: false,
        abha_otp: "",
        abha_txn_id: "",
        is_abha_verified: false,

        // MRN & Search State
        mrn: "",
        mrnMode: "AUTO",

        // Merge Initial Data
        ...(initialData || {}),
        first_name: initialData?.name ? initialData.name.split(" ")[0] : "",
        last_name: initialData?.name ? initialData.name.split(" ").slice(1).join(" ") : "",
        referring_doctor: "",
        indication_for_scan: "",
    });

    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Calculate Age from DOB
    useEffect(() => {
        if (formData.dob) {
            const years = dayjs().diff(dayjs(formData.dob), 'year');
            if (years >= 0) setFormData((prev: any) => ({ ...prev, age: years }));
        }
    }, [formData.dob]);

    // Calculate EDD and GA from LMP
    useEffect(() => {
        if (formData.lmp_date) {
            const lmp = dayjs(formData.lmp_date);
            const edd = lmp.add(280, 'day'); // 40 weeks
            const now = dayjs();

            const diffDays = now.diff(lmp, 'day');
            const weeks = Math.floor(diffDays / 7);
            const days = diffDays % 7;

            // Only calc if positive and reasonable (< 44 weeks)
            if (diffDays >= 0 && diffDays < 308) {
                setFormData((prev: any) => ({
                    ...prev,
                    edd: edd.format('YYYY-MM-DD'),
                    gestational_age: `${weeks} Weeks ${days} Days`
                }));
            }
        }
    }, [formData.lmp_date]);

    // Intelligent Patient Search Debounce
    useEffect(() => {
        const query = formData.phone || formData.abha_number || formData.mrn;
        if (!query || query.length < 3) {
            setSearchResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearching(true);
            try {
                // In a real app, use axiosInstance or your configured fetch wrapper
                const token = localStorage.getItem('token'); 
                const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setSearchResults(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setIsSearching(false);
            }
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [formData.phone, formData.abha_number, formData.mrn]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        // Handle Checkbox
        const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
        setFormData((prev: any) => ({ ...prev, [name]: val }));
    };

    const handleMultiSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, options } = e.target;
        const value: string[] = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                value.push(options[i].value);
            }
        }
        setFormData((prev: any) => ({ ...prev, [name]: value }));

        // Trigger Pregnancy Check if USG selected for Female
        if (name === 'modalities' && value.includes('USG') && formData.gender === 'Female') {
            // Optional: could auto-set pregnancy_status, but better to let user confirm.
        }
    };

    const nextStep = () => setStep(prev => Math.min(prev + 1, STEPS.length));
    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    const handleSubmit = () => {
        // Construct full name
        const fullName = `${formData.first_name} ${formData.last_name}`.trim();
        const finalData = { ...formData, name: fullName };

        if (!finalData.name || !finalData.phone || !finalData.gender) {
            toast.error("Please fill mandatory fields (Name, Phone, Gender)");
            return;
        }

        // PCPNDT Compliance Check
        if (formData.pregnancy_status === 'Pregnant' && (!finalData.relationship_name || finalData.relationship_name.length < 3)) {
            toast.error("PCPNDT Compliance: Husband's Name is mandatory for pregnant patients.");
            // Optionally jump to Step 3
            setStep(3);
            return;
        }

        if (!finalData.digital_signature && !finalData.data_privacy_accepted) {
            toast.error("Signature and Privacy Acceptance required");
            return;
        }
        onSubmit(finalData);
    };

    // Signature Canvas Logic
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
        const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const rect = canvas.getBoundingClientRect();
        const x = ('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left;
        const y = ('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top;
        ctx.lineTo(x, y);
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            setFormData((prev: any) => ({ ...prev, digital_signature: canvas.toDataURL() }));
        }
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.clearRect(0, 0, canvas.width, canvas.height);
            setFormData((prev: any) => ({ ...prev, digital_signature: "" }));
        }
    }

    const handleVerifyAbha = async () => {
        if (!formData.abha_number) return toast.error("Enter ABHA Number first");
        toast.loading("Sending OTP...");
        try {
            // Mock API call to ABDM Service
            setTimeout(() => {
                setFormData((prev: any) => ({ ...prev, showAbhaOtp: true, abhaTxnId: "TXN-" + Date.now() }));
                toast.dismiss();
                toast.success("OTP sent to Aadhaar-linked mobile");
            }, 1000);
        } catch (e) {
            toast.dismiss();
            toast.error("ABHA Verification Failed");
        }
    };

    const handleConfirmAbhaOtp = async () => {
        if (!formData.abha_otp) return toast.error("Enter OTP");
        toast.loading("Verifying...");
        try {
            // Mock API call to confirm
            setTimeout(() => {
                setFormData((prev: any) => ({ ...prev, is_abha_verified: true, showAbhaOtp: false }));
                toast.dismiss();
                toast.success("ABHA Verified Successfully!");
            }, 1000);
        } catch (e) {
            toast.dismiss();
            toast.error("Invalid OTP");
        }
    };

    const renderStepContent = () => {
        switch (step) {
            case 1: // IDENTITY
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
                            <div className="p-2 bg-blue-100 rounded-lg"><ShieldCheck className="text-blue-600" size={24} /></div>
                            <div>
                                <h4 className="font-bold text-blue-900">Patient Identity Check</h4>
                                <p className="text-sm text-blue-700 mt-1">
                                    Capture Photo, scan ABHA, or enter ID details (Voter ID/Aadhaar) to prevent duplicates.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-center py-4">
                            <div className="w-24 h-24 bg-slate-100 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-indigo-500 cursor-pointer transition-colors relative overflow-hidden">
                                {formData.photo_url ? (
                                    <img src={formData.photo_url} alt="Patient" className="w-full h-full object-cover" />
                                ) : (
                                    <><Camera className="text-slate-400" /><span className="text-[10px] text-slate-500 mt-1">Add Photo</span></>
                                )}
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onloadend = () => setFormData((prev: any) => ({ ...prev, photo_url: reader.result }));
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Mobile Number <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                    <Input name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit Mobile" className="pl-10 font-mono text-lg" maxLength={10} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">MRN (Patient ID)</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Building className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                        <Input
                                            name="mrn"
                                            value={formData.mrnMode === "AUTO" ? (formData.mrn || "IPX[Auto]") : formData.mrn}
                                            onChange={handleChange}
                                            disabled={formData.mrnMode === "AUTO"}
                                            placeholder="Enter MRN"
                                            className="pl-10 font-mono"
                                        />
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-lg border">
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, mrnMode: "AUTO" }))}
                                            className={cn("px-2 py-1 text-[10px] font-bold rounded", formData.mrnMode === "AUTO" ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
                                        >
                                            AUTO
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(p => ({ ...p, mrnMode: "MANUAL" }))}
                                            className={cn("px-2 py-1 text-[10px] font-bold rounded", formData.mrnMode === "MANUAL" ? "bg-white shadow-sm text-blue-600" : "text-slate-500")}
                                        >
                                            MANUAL
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Search Results / Duplicate Warning */}
                        {searchResults.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 animate-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-2 text-amber-800 font-bold mb-3">
                                    <AlertCircle size={18} />
                                    Potential Existing Patient(s) Found
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {searchResults.map((p) => (
                                        <div key={p.id} className="bg-white border border-amber-100 p-3 rounded-lg flex items-center justify-between hover:border-amber-400 transition-colors">
                                            <div>
                                                <div className="font-bold text-slate-900">{p.name}</div>
                                                <div className="text-xs text-slate-500 flex gap-3">
                                                    <span>MRN: {p.mrn}</span>
                                                    <span>Phone: {p.phone}</span>
                                                    <span>DOB: {p.dob ? dayjs(p.dob).format('DD-MMM-YYYY') : 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => window.open(`/patients/${p.id}`, '_blank')}>
                                                    OPEN
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-[10px] h-7 px-2 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => {
                                                    setFormData((prev: any) => ({ ...prev, ...p, first_name: p.first_name, last_name: p.last_name }));
                                                    setStep(2); // Jump to demographics
                                                    toast.success("Loaded patient data for editing");
                                                }}>
                                                    EDIT
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-3 pt-3 border-t border-amber-100 flex justify-end">
                                    <Button variant="ghost" size="sm" className="text-xs text-amber-700 hover:bg-amber-100" onClick={() => setSearchResults([])}>
                                        Ignore & Create New Patient
                                    </Button>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">ABHA Number</label>
                                <div className="relative flex gap-2">
                                    <div className="relative flex-1">
                                        <Activity className="absolute left-3 top-2.5 text-orange-400" size={16} />
                                        <Input
                                            name="abha_number"
                                            value={formData.abha_number}
                                            onChange={handleChange}
                                            placeholder="XX-XXXX-XXXX-XXXX"
                                            className={cn("pl-10 font-mono text-lg", formData.isAbhaVerified && "border-green-500 bg-green-50")}
                                            disabled={formData.isAbhaVerified}
                                        />
                                        {formData.isAbhaVerified && <CheckCircle className="absolute right-3 top-2.5 text-green-500" size={16} />}
                                    </div>
                                    {!formData.isAbhaVerified && !formData.showAbhaOtp && (
                                        <Button type="button" onClick={handleVerifyAbha} variant="outline" className="border-orange-200 text-orange-600 hover:bg-orange-50">
                                            Verify
                                        </Button>
                                    )}
                                </div>
                                {formData.showAbhaOtp && (
                                    <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-lg animate-in slide-in-from-top-2">
                                        <label className="text-[10px] font-bold uppercase text-orange-700 block mb-1">Enter 6-digit OTP</label>
                                        <div className="flex gap-2">
                                            <Input
                                                value={formData.abhaOtp}
                                                onChange={(e) => setFormData(prev => ({ ...prev, abhaOtp: e.target.value }))}
                                                placeholder="000000"
                                                maxLength={6}
                                                className="font-mono text-center tracking-widest"
                                            />
                                            <Button type="button" onClick={handleConfirmAbhaOtp} className="bg-orange-600 hover:bg-orange-700 text-white">
                                                Confirm
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">Govt ID Type</label>
                                <select name="id_type" value={formData.id_type} onChange={handleChange} className="w-full p-2.5 bg-white border rounded-md text-sm font-mono">
                                    <option value="AADHAAR">Aadhaar Card</option>
                                    <option value="VOTER_ID">Voter ID</option>
                                    <option value="PAN">PAN Card</option>
                                    <option value="DRIVING_LICENSE">Driving License</option>
                                    <option value="PASSPORT">Passport</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold uppercase text-slate-500">ID Number</label>
                                <Input name="id_number" value={formData.id_number} onChange={handleChange} placeholder="Enter ID Number" className="font-mono" />
                            </div>
                            <div className="flex items-end pb-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" name="biometric_flag" checked={formData.biometric_flag} onChange={handleChange} />
                                    <span className="text-sm font-medium text-slate-700 flex gap-1"><Fingerprint size={16} /> Biometric Verified</span>
                                </label>
                            </div>
                        </div>

                    </div>

                );

            case 2: // DEMOGRAPHICS
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Row 1: Title | First Name | Last Name */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Title</label>
                                <select name="title" value={formData.title} onChange={handleChange} className="w-full p-2.5 bg-white border rounded-md text-sm mt-1">
                                    <option value="">Select</option>
                                    <option value="Dr.">Dr.</option>
                                    <option value="Mr.">Mr.</option>
                                    <option value="Mrs.">Mrs.</option>
                                    <option value="Ms.">Ms.</option>
                                    <option value="Prof.">Prof.</option>
                                    <option value="Baby">Baby</option>
                                    <option value="Master">Master</option>
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-5">
                                <label className="text-xs font-bold uppercase text-slate-500">First Name <span className="text-red-500">*</span></label>
                                <Input name="first_name" value={formData.first_name} onChange={handleChange} placeholder="First Name" className="mt-1" />
                            </div>
                            <div className="col-span-12 md:col-span-5">
                                <label className="text-xs font-bold uppercase text-slate-500">Last Name</label>
                                <Input name="last_name" value={formData.last_name} onChange={handleChange} placeholder="Surname" className="mt-1" />
                            </div>
                        </div>

                        {/* Row 2: Relation */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-3">
                                <label className="text-xs font-bold uppercase text-slate-500">Relation</label>
                                <select name="relationship_type" value={formData.relationship_type} onChange={handleChange} className="w-full p-2.5 bg-white border rounded-md text-sm mt-1">
                                    <option value="Self">Self</option>
                                    <option value="S/O">S/O (Son of)</option>
                                    <option value="D/O">D/O (Daughter of)</option>
                                    <option value="W/O">W/O (Wife of)</option>
                                    <option value="H/O">H/O (Husband of)</option>
                                    <option value="C/O">C/O (Care of)</option>
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-9">
                                <label className="text-xs font-bold uppercase text-slate-500">Relation Name</label>
                                <Input
                                    name="relationship_name"
                                    value={formData.relationship_name}
                                    onChange={handleChange}
                                    placeholder={formData.relationship_type === 'Self' ? "Not Applicable" : "Father/Husband Name"}
                                    disabled={formData.relationship_type === 'Self'}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        {/* Row 3: Gender | DOB | Age */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-3">
                                <label className="text-xs font-bold uppercase text-slate-500">Gender <span className="text-red-500">*</span></label>
                                <select name="gender" value={formData.gender} onChange={(e) => {
                                    const val = e.target.value;
                                    setFormData((prev: any) => ({ ...prev, gender: val }));
                                }} className="w-full p-2.5 bg-white border rounded-md text-sm mt-1">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <label className="text-xs font-bold uppercase text-slate-500">Date of Birth</label>
                                <Input type="date" name="dob" value={formData.dob} onChange={handleChange} className="mt-1" />
                            </div>
                            <div className="col-span-12 md:col-span-3">
                                <label className="text-xs font-bold uppercase text-slate-500">Age</label>
                                <Input name="age" value={formData.age} onChange={handleChange} placeholder="Yrs" type="number" className="mt-1" />
                            </div>
                        </div>

                        {/* Row 4: Marital & Occupation */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Marital Status</label>
                                <select name="marital_status" value={formData.marital_status} onChange={handleChange} className="w-full p-2.5 bg-white border rounded-md text-sm">
                                    <option>Single</option>
                                    <option>Married</option>
                                    <option>Divorced</option>
                                    <option>Widowed</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Occupation</label>
                                <Input name="occupation" value={formData.occupation} onChange={handleChange} placeholder="e.g. Engineer, Farmer" />
                            </div>
                        </div>

                        {/* Row 5: Language & Nationality */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Preferred Language</label>
                                <select name="preferred_language" value={formData.preferred_language} onChange={handleChange} className="w-full p-2.5 bg-white border rounded-md text-sm">
                                    <option>English</option>
                                    <option>Hindi</option>
                                    <option>Kannada</option>
                                    <option>Marathi</option>
                                    <option>Telugu</option>
                                    <option>Tamil</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Nationality</label>
                                <Input name="nationality" value={formData.nationality} onChange={handleChange} />
                            </div>
                        </div>

                        {/* Row 6: Address */}
                        <div className="pt-4 border-t border-slate-100">
                            <label className="text-xs font-bold uppercase text-slate-500">Postal Address</label>
                            <textarea name="address" value={formData.address} onChange={handleChange} className="w-full p-3 border rounded-md text-sm mt-1" rows={2} placeholder="House No, Street, City, State, Pincode" />
                        </div>

                        {/* Row 7: Secondary Contact (Moved from Step 1) */}
                        <div className="pt-4 border-t border-slate-100 mt-4">
                            <h5 className="font-bold text-slate-700 mb-3 text-sm">Secondary Contact</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Contact Name</label>
                                    <Input name="secondary_contact_name" value={formData.secondary_contact_name} onChange={handleChange} placeholder="Name" className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold uppercase text-slate-500">Contact Mobile</label>
                                    <Input name="secondary_contact_phone" value={formData.secondary_contact_phone} onChange={handleChange} placeholder="Mobile Number" className="mt-1" maxLength={10} />
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 3: // CLINICAL (ADVANCED)
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Vitals */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <h5 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><Activity size={16} /> Vitals & Measurements</h5>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-slate-500">Blood Group</label>
                                    <select name="blood_group" value={formData.blood_group} onChange={handleChange} className="w-full p-2 border rounded text-sm mt-1">
                                        <option value="">Unknown</option>
                                        <option>A+</option><option>A-</option>
                                        <option>B+</option><option>B-</option>
                                        <option>AB+</option><option>AB-</option>
                                        <option>O+</option><option>O-</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Height (cm)</label>
                                    <Input name="height_cm" type="number" value={formData.height_cm} onChange={handleChange} className="mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500">Weight (kg)</label>
                                    <Input name="weight_kg" type="number" value={formData.weight_kg} onChange={handleChange} className="mt-1" />
                                </div>
                            </div>
                        </div>

                        {/* Radiology Specifics */}
                        <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-200">
                            <h5 className="font-bold text-indigo-700 mb-3 flex items-center gap-2"><Stethoscope size={16} /> Radiology Context</h5>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-indigo-600 font-bold">Planned Modalities</label>
                                    <select multiple name="modalities" value={formData.modalities} onChange={handleMultiSelectChange} className="w-full p-2 border rounded text-sm mt-1 h-24">
                                        <option value="CT">CT Scan</option>
                                        <option value="MRI">MRI</option>
                                        <option value="X-RAY">X-Ray / DR</option>
                                        <option value="USG">Ultrasound</option>
                                        <option value="MAMO">Mammography</option>
                                        <option value="DEXA">BMD / DEXA</option>
                                    </select>
                                    <p className="text-[10px] text-indigo-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>
                                <div className="col-span-2 grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-indigo-600 font-bold">Creatinine (mg/dL)</label>
                                        <Input name="creatinine_level" value={formData.creatinine_level} onChange={handleChange} placeholder="e.g. 0.9" className="mt-1" />
                                    </div>

                                    {(formData.gender === 'Female' && (parseInt(formData.age || '0') > 12 && parseInt(formData.age || '0') < 60)) && (
                                        <>
                                            <div>
                                                <label className="text-xs text-pink-600 font-bold">LMP Date</label>
                                                <Input type="date" name="lmp_date" value={formData.lmp_date} onChange={handleChange} className="mt-1 border-pink-200 bg-pink-50" />

                                                {/* Calculated Pregnancy Metrics */}
                                                {formData.lmp_date && formData.gestational_age && (
                                                    <div className="mt-2 text-xs bg-pink-100/50 p-2 rounded border border-pink-200 text-pink-800 space-y-1">
                                                        <div className="flex justify-between">
                                                            <span className="font-semibold">EDD:</span>
                                                            <span>{dayjs(formData.edd).format('DD MMM YYYY')}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-semibold">Gestational Age:</span>
                                                            <span>{formData.gestational_age}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-2 pt-6">
                                                <label className="flex items-center gap-2 cursor-pointer bg-pink-50 p-2 rounded border border-pink-200 w-full animate-pulse">
                                                    <input 
                                                        type="checkbox" 
                                                        name="pregnancy_status" 
                                                        checked={formData.pregnancy_status === 'Pregnant'} 
                                                        onChange={(e) => setFormData((p: any) => ({ ...p, pregnancy_status: e.target.checked ? 'Pregnant' : 'None' }))} 
                                                    />
                                                    <span className="text-xs font-semibold text-pink-700">Confirm Pregnancy?</span>
                                                </label>

                                                {/* PCPNDT Compliance Field */}
                                                {formData.pregnancy_status === 'Pregnant' && (
                                                    <div className="animate-in slide-in-from-top-2 fade-in space-y-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                                                                Husband's Name <span className="text-red-500">*</span> (PCPNDT)
                                                            </label>
                                                            <Input
                                                                name="husband_name"
                                                                value={formData.husband_name || (['W/O', 'H/O'].includes(formData.relationship_type) ? formData.relationship_name : '')}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFormData((prev: any) => ({
                                                                        ...prev,
                                                                        husband_name: val,
                                                                        // Only switch to H/O if not already W/O (Wife of)
                                                                        ...(prev.relationship_type !== 'W/O' ? { relationship_type: 'H/O' } : {}),
                                                                        relationship_name: val
                                                                    }));
                                                                }}
                                                                placeholder="Mandatory for Form F"
                                                                className="border-red-200 bg-red-50 focus:border-red-400"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">
                                                                Indication for Scan <span className="text-red-500">*</span>
                                                            </label>
                                                            <select
                                                                name="indication_for_scan"
                                                                value={formData.indication_for_scan || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFormData((prev: any) => ({ ...prev, indication_for_scan: val }));
                                                                }}
                                                                className="w-full p-2 border border-red-200 rounded text-sm bg-red-50 focus:border-red-400"
                                                            >
                                                                <option value="">Select Indication...</option>
                                                                <option value="To diagnose intra-uterine and/or extra-uterine pregnancy and confirm viability">Diagnose Pregnancy/Viability</option>
                                                                <option value="Estimation of gestational age (dating)">Dating Scan</option>
                                                                <option value="Detection of number of fetuses and their chorionicity">Twin/Multiple Pregnancy</option>
                                                                <option value="Suspected pregnancy with IUCD position determination">IUCD Position</option>
                                                                <option value="Vaginal bleeding / leaking">Bleeding/Leaking</option>
                                                                <option value="Follow-up cases of abortion">Follow-up Abortion</option>
                                                                <option value="Assessment of cervical canal and diameter of internal os">Cervical Assessment</option>
                                                                <option value="Discrepancy between uterine size and period of amenorrhea">Size/Date Discrepancy</option>
                                                                <option value="Any other (Specify)">Any other</option>
                                                            </select>
                                                        </div>

                                                        <div className="pt-2">
                                                            {(() => {
                                                                const effectiveHusbandName = formData.husband_name || (['W/O', 'H/O'].includes(formData.relationship_type) ? formData.relationship_name : '');
                                                                const isReady = effectiveHusbandName && formData.indication_for_scan;

                                                                return (
                                                                    <Button
                                                                        type="button"
                                                                        onClick={async () => {
                                                                            if (!isReady) return toast.error("Please fill Husband Name & Indication first");

                                                                            // Ensure husband_name is definitely set in the payload/state for backend
                                                                            if (!formData.husband_name && effectiveHusbandName) {
                                                                                setFormData((prev: any) => ({ ...prev, husband_name: effectiveHusbandName }));
                                                                            }

                                                                            // Mock Download
                                                                            toast.success("Generating Form F...");

                                                                            // Lock
                                                                            setFormData((prev: any) => ({ ...prev, isFormFLocked: true, husband_name: effectiveHusbandName }));
                                                                            toast.success("Form F Generated & Record Locked!");
                                                                        }}
                                                                        className={cn(
                                                                            "w-full gap-2 mt-2 transition-all",
                                                                            formData.isFormFLocked ? "bg-slate-600 cursor-not-allowed" :
                                                                                !isReady ? "bg-slate-300 text-slate-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-700 text-white"
                                                                        )}
                                                                        disabled={formData.isFormFLocked || !isReady}
                                                                    >
                                                                        {formData.isFormFLocked ? (
                                                                            <><ShieldCheck size={16} /> Record Locked (Form F Generated)</>
                                                                        ) : (
                                                                            !isReady ? (
                                                                                <><FileText size={16} /> Missing: {!effectiveHusbandName ? "Husband Name" : "Indication"}</>
                                                                            ) : (
                                                                                <><FileText size={16} /> Generate Form F & Lock</>
                                                                            )
                                                                        )}
                                                                    </Button>
                                                                );
                                                            })()}

                                                            {formData.isFormFLocked && (
                                                                <div className="mt-2 flex justify-center">
                                                                    <Button
                                                                        type="button"
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={async () => {
                                                                            if (confirm("Confirm Delete Form F? This will unlock the patient record. (Admin Only)")) {
                                                                                // Call API
                                                                                // await axiosInstance.delete(`/compliance/form-f/${patientId}`);

                                                                                setFormData((prev: any) => ({ ...prev, isFormFLocked: false }));
                                                                                toast.success("Record Unlocked!");
                                                                            }
                                                                        }}
                                                                        className="text-xs text-red-400 hover:text-red-600 hover:bg-red-50"
                                                                    >
                                                                        <ShieldCheck size={12} className="mr-1" /> Unlock / Delete Form F (Admin)
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    <div className="flex items-end pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer bg-white p-2 rounded border border-indigo-100 w-full">
                                            <input type="checkbox" name="contrast_safety_flag" checked={formData.contrast_safety_flag} onChange={handleChange} />
                                            <span className="text-xs font-semibold text-slate-700">Contrast Safe?</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500 flex items-center gap-2">
                                    Allergies <AlertCircle size={14} className="text-red-500" />
                                </label>
                                <textarea name="allergies" value={formData.allergies} onChange={handleChange} className="w-full p-3 border rounded-md text-sm" rows={2} placeholder="NIL or list allergies..." />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Medical History</label>
                                <textarea name="medical_history" value={formData.medical_history} onChange={handleChange} className="w-full p-3 border rounded-md text-sm" rows={2} placeholder="Diabetes, Hypertension..." />
                            </div>
                        </div>
                    </div>
                );

            case 4: // WORKFLOW (ADVANCED)
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-4 border rounded-xl hover:border-blue-400 cursor-pointer transition-colors bg-blue-50/10">
                                <label className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                    <input type="radio" name="patient_type" value="OPD" checked={formData.patient_type === "OPD"} onChange={handleChange} />
                                    OPD (Outpatient)
                                </label>
                                <p className="text-xs text-slate-500 pl-6">Standard visit.</p>
                            </div>
                            <div className="p-4 border rounded-xl hover:border-purple-400 cursor-pointer transition-colors bg-purple-50/10">
                                <label className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                                    <input type="radio" name="patient_type" value="IPD" checked={formData.patient_type === "IPD"} onChange={handleChange} />
                                    IPD (Inpatient)
                                </label>
                                <p className="text-xs text-slate-500 pl-6">Admitted patient.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Visit Type</label>
                                <select name="visit_type" value={formData.visit_type} onChange={handleChange} className="w-full p-2.5 bg-white border rounded-md text-sm">
                                    <option value="NEW">New Visit</option>
                                    <option value="FOLLOW_UP">Follow Up</option>
                                    <option value="EMERGENCY">Emergency</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Department</label>
                                <Input name="department" value={formData.department} onChange={handleChange} placeholder="e.g. Cardiology" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Referring Physician (External)</label>
                                <Input name="referring_doctor" value={formData.referring_doctor} onChange={handleChange} placeholder="Dr. Name (External)" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Attending Radiologist (Internal)</label>
                                <Input name="attending_physician" value={formData.attending_physician} onChange={handleChange} placeholder="Dr. Name (Internal)" />
                            </div>
                        </div>

                        {formData.patient_type === "IPD" && (
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-500">Ward / Bed / Room</label>
                                <Input name="ward_room_bed" value={formData.ward_room_bed} onChange={handleChange} placeholder="e.g. Ward A / 102" />
                            </div>
                        )}
                    </div>
                );

            case 5: // BILLING
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                            <label className="text-sm font-bold uppercase text-orange-900 block mb-2">Billing Category</label>
                            <select name="billing_category" value={formData.billing_category} onChange={handleChange} className="w-full p-3 border rounded-md text-sm">
                                <option value="Self-Pay">Self-Pay / Cash</option>
                                <option value="Insurance">Private Insurance</option>
                                <option value="PMJAY">PMJAY / Ayushman Bharat</option>
                                <option value="CGHS">CGHS / ECHS</option>
                                <option value="Corporate">Corporate Tie-up</option>
                            </select>
                        </div>

                        {formData.billing_category !== "Self-Pay" && (
                            <div className="animate-in fade-in duration-300">
                                <h4 className="font-bold text-slate-700 text-sm mb-4">Insurance Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase">Provider</label>
                                        <Input name="insurance_provider" placeholder="Provider Name" onChange={handleChange} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 uppercase">Policy / Card No</label>
                                        <Input name="insurance_id" placeholder="Policy / Card Number" onChange={handleChange} className="mt-1" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 6: // CONSENT & SIGNATURE
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Checkboxes */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-800 border-b pb-2">Consent Declarations</h4>

                                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" name="data_privacy_accepted" checked={formData.data_privacy_accepted} onChange={handleChange} className="mt-1" />
                                    <div>
                                        <span className="font-semibold text-sm block">Data Privacy Acceptance</span>
                                        <span className="text-xs text-slate-500">I agree to the collection and storage of my medical data as per ABDM norms.</span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" name="consent_image_sharing" checked={formData.consent_image_sharing} onChange={handleChange} className="mt-1" />
                                    <div>
                                        <span className="font-semibold text-sm block">Image Sharing Consent</span>
                                        <span className="text-xs text-slate-500">I allow sharing of anonymized scans for tele-reporting or AI analysis.</span>
                                    </div>
                                </label>

                                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                    <input type="checkbox" name="consent_telemedicine" checked={formData.consent_telemedicine} onChange={handleChange} className="mt-1" />
                                    <span className="font-semibold text-sm">Consent for Telemedicine Services</span>
                                </label>
                            </div>

                            {/* Signature Pad */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center border-b pb-2">
                                    <h4 className="font-bold text-slate-800">Digital Signature</h4>
                                    <Button size="sm" variant="ghost" className="text-xs text-red-500 h-6" onClick={clearSignature}>Clear</Button>
                                </div>
                                <div className="border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 touch-none relative overflow-hidden h-40">
                                    <canvas
                                        ref={canvasRef}
                                        width={400}
                                        height={160}
                                        className="w-full h-full cursor-crosshair"
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    {!formData.digital_signature && !isDrawing && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-sm">
                                            Sign Here
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 text-center">
                                    Use mouse or touch to sign above.
                                </p>
                            </div>
                        </div>
                    </div>
                );

            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-[85vh] bg-white">
            {/* HEADER */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">New Patient Registration</h2>
                    <p className="text-sm text-slate-500">Step {step} of {STEPS.length}: {STEPS[step - 1].title}</p>
                </div>

                {/* STEPS INDICATOR */}
                <div className="flex items-center gap-2">
                    {STEPS.map((s) => (
                        <div key={s.id} className={cn(
                            "w-2.5 h-2.5 rounded-full transition-all duration-300",
                            step === s.id ? "bg-indigo-600 w-8" :
                                step > s.id ? "bg-emerald-500" : "bg-slate-200"
                        )} />
                    ))}
                </div>
            </div>

            {/* BODY */}
            <div className="flex-1 overflow-y-auto p-6 md:px-12 bg-slate-50/30">
                <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
                    {renderStepContent()}
                </div>
            </div>

            {/* FOOTER */}
            <div className="p-6 border-t border-slate-100 bg-white flex justify-between items-center">
                <Button variant="ghost" onClick={step === 1 ? onCancel : prevStep} className="gap-2">
                    {step === 1 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}
                </Button>

                <div className="flex gap-4">
                    {step < STEPS.length ? (
                        <Button onClick={nextStep} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                            Next Step <ChevronRight size={16} />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 gap-2 shadow-lg shadow-emerald-200">
                            <CheckCircle size={16} /> Complete Registration
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModernPatientRegistration;
