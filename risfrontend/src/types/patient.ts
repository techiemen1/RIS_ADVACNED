// src/types/patient.ts

export type ClinicalInfo = {
  allergies?: string[];
  renalFunction?: string;
  alerts?: string[];
};

export type PatientStatus = 'scheduled' | 'checked_in' | 'in_progress' | 'completed';

export interface Patient {
  id: string;
  name: string; // aggregated first_name + last_name usually
  age?: number;
  gender: string;
  dob?: string;
  mrn?: string; // Medical Record Number
  studyDescription?: string;
  date?: string; // last visit or similar
  modality?: string;

  // New Enhanced Fields
  clinical_info?: ClinicalInfo;
  portal_access?: boolean;
  status?: PatientStatus; // Current journey status

  // Indian Context
  aadhaar_number?: string; // Legacy/Specific
  abha_id?: string;
  preferred_language?: string;

  // Enhanced Registration
  id_type?: string;
  id_number?: string;
  insurance_provider?: string;
  policy_type?: string;
  policy_validity?: string;

  // New Fields Requested
  title?: string;
  secondary_contact_name?: string;
  secondary_contact_phone?: string;
  modalities?: string[];

  // Pregnancy Module
  pregnancy_status?: string;
  lmp_date?: string;
  edd?: string;
  gestational_age?: string;
}
