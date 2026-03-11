// src/hooks/usePatients.ts
import { useState, useEffect, useCallback } from "react";
import axios from "../services/axiosInstance";
import { Patient } from "../types/patient";
import { toast } from "react-hot-toast";

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/patients");
      // Handle both array and { data: [] } formats for robustness
      // Handle both array and { data: [] } formats for robustness
      const rawData = Array.isArray(res.data) ? res.data : (res.data.data || []);
      const data = rawData.map((p: any) => ({
        ...p,
        id: p.id.toString(),
        name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown Patient'
      }));
      setPatients(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch patients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const addPatient = async (patient: Omit<Patient, "id">) => {
    try {
      const res = await axios.post("/patients", patient);
      setPatients((prev) => [res.data, ...prev]);
      toast.success("Patient registered");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add patient");
      throw err;
    }
  };

  const updatePatient = async (id: string, updated: Partial<Patient>) => {
    try {
      const res = await axios.put(`/patients/${id}`, updated);
      setPatients((prev) => prev.map((p) => (p.id === id ? res.data : p)));
      toast.success("Patient updated");
    } catch (err) {
      toast.error("Failed to update patient");
    }
  };

  const deletePatient = async (id: string) => {
    try {
      await axios.delete(`/patients/${id}`);
      setPatients((prev) => prev.filter((p) => p.id !== id));
      toast.success("Patient deleted");
    } catch (err) {
      toast.error("Failed to delete patient");
    }
  };

  return { patients, loading, addPatient, updatePatient, deletePatient, refresh: fetchPatients };
}
