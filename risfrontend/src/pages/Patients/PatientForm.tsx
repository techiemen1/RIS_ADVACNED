// src/pages/Patients/PatientForm.tsx
import React, { useState, useEffect } from "react";
import { Patient } from "../../types/patient";

interface PatientFormProps {
  onSubmit: (data: Omit<Patient, "id">) => void;
  initialData?: Patient | null;
  onCancel?: () => void;
}

const PatientForm: React.FC<PatientFormProps> = ({ onSubmit, initialData, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Patient, "id">>({
    name: "",
    age: 0,
    gender: "Male",
    studyDescription: "",
    date: "",
    idType: "AADHAAR",
    idNumber: "",
    insuranceProvider: "",
    policyType: "Private",
    policyValidity: "",
    mrn: ""
  });

  useEffect(() => {
    if (initialData) {
      const { id, ...rest } = initialData;
      setFormData(rest);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "age" ? Number(value) : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Map idType/Number to legacy if Aadhaar selected for backward compat if needed,
    // or just send as-is. Backend handles mapping.
    // If idType is AADHAAR, backend likely expects it in `id_number` and we might strictly check.
    const submissionData = { ...formData };
    if (formData.idType === 'AADHAAR') {
      submissionData.aadhaarNumber = formData.idNumber;
    }
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md space-y-4 text-sm">
      <h3 className="font-semibold text-gray-700 border-b pb-2 mb-4">Demographics</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-gray-600 mb-1">Patient ID / MRN <span className="text-xs text-gray-400">(Optional - Auto-generated if blank)</span></label>
          <input name="mrn" value={formData.mrn ?? ""} onChange={handleChange} className="w-full border p-2 rounded bg-yellow-50" placeholder="e.g. MRN-202X-XXXX (Leave blank for auto-gen)" />
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Full Name</label>
          <input name="name" value={formData.name} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Age</label>
          <input name="age" type="number" value={formData.age} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Gender</label>
          <select name="gender" value={formData.gender} onChange={handleChange} className="w-full border p-2 rounded">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Study Description</label>
          <input name="studyDescription" value={formData.studyDescription} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Visit Date</label>
          <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full border p-2 rounded" required />
        </div>
      </div>

      <h3 className="font-semibold text-gray-700 border-b pb-2 mb-4 mt-6">Identity & Verification</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-gray-600 mb-1">ID Document Type</label>
          <select name="idType" value={formData.idType} onChange={handleChange} className="w-full border p-2 rounded bg-gray-50">
            <option value="AADHAAR">Aadhaar Card (UIDAI)</option>
            <option value="PAN">PAN Card</option>
            <option value="VOTER_ID">Voter ID</option>
            <option value="DRIVING_LICENSE">Driving License</option>
            <option value="PASSPORT">Passport</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-600 mb-1">ID Number</label>
          <input
            name="idNumber"
            value={formData.idNumber || ''}
            onChange={handleChange}
            placeholder={formData.idType === 'AADHAAR' ? "12 Digit Aadhaar Number" : "Document Number"}
            className="w-full border p-2 rounded"
          />
          {formData.idType === 'AADHAAR' && <p className="text-xs text-blue-500 mt-1">* Simulated Verification Active</p>}
        </div>
        <div>
          <label className="block text-gray-600 mb-1">ABHA / NDHM Health ID</label>
          <input name="abhaId" value={formData.abhaId || ''} onChange={handleChange} placeholder="e.g. 12-34-56-78-9012" className="w-full border p-2 rounded" />
        </div>
      </div>

      <h3 className="font-semibold text-gray-700 border-b pb-2 mb-4 mt-6">Insurance Details</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-gray-600 mb-1">Provider / Scheme</label>
          <input name="insuranceProvider" list="providers" value={formData.insuranceProvider || ''} onChange={handleChange} className="w-full border p-2 rounded" placeholder="Select or type..." />
          <datalist id="providers">
            <option value="PM-JAY (Ayushman Bharat)" />
            <option value="HDFC Ergo" />
            <option value="Star Health" />
            <option value="CGHS" />
            <option value="Corporate TPA" />
          </datalist>
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Policy Type</label>
          <select name="policyType" value={formData.policyType || 'Private'} onChange={handleChange} className="w-full border p-2 rounded">
            <option value="Private">Private / Personal</option>
            <option value="Government">Government Scheme</option>
            <option value="Corporate">Corporate Group</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-600 mb-1">Validity (Expiry)</label>
          <input name="policyValidity" type="date" value={formData.policyValidity || ''} onChange={handleChange} className="w-full border p-2 rounded" />
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t mt-4 justify-end">
        {onCancel && (
          <button type="button" onClick={onCancel} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded">
            Cancel
          </button>
        )}
        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium shadow-sm">
          {initialData ? "Update Patient" : "Register Patient"}
        </button>
      </div>
    </form>
  );
};

export default PatientForm;
