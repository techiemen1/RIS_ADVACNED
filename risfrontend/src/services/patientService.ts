// src/services/patientService.ts
import { Patient } from "../types/patient";

const KEY = "ipacx:patients";

const read = (): Patient[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Patient[]) : [];
  } catch {
    return [];
  }
};

const write = (arr: Patient[]) => localStorage.setItem(KEY, JSON.stringify(arr, null, 2));

export const getPatients = async (): Promise<Patient[]> => {
  await new Promise((r) => setTimeout(r, 150));
  return read();
};

export const addPatient = async (p: Patient): Promise<Patient> => {
  const arr = read();
  arr.unshift(p);
  write(arr);
  return p;
};

export const updatePatient = async (id: string, patch: Partial<Patient>): Promise<Patient | null> => {
  const arr = read();
  const idx = arr.findIndex((x) => x.id === id);
  if (idx === -1) return null;
  arr[idx] = { ...arr[idx], ...patch };
  write(arr);
  return arr[idx];
};

export const deletePatient = async (id: string): Promise<boolean> => {
  let arr = read();
  const before = arr.length;
  arr = arr.filter((x) => x.id !== id);
  write(arr);
  return arr.length < before;
};
