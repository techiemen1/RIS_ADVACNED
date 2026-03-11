// src/types/index.ts

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  contact?: string;            // optional for patientService
  studyCount?: number;         // optional for patientService
  studyDescription?: string;   // optional for dicomService
  date?: string;               // optional for dicomService
}
