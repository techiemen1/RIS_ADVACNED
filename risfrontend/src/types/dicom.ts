export interface Patient {
  id: string;
  name: string;
  dob?: string;
  gender?: string;
  studies?: Study[];
}

export interface Study {
  id: string;
  description: string;
  date: string;
  instances?: Instance[];
}

export interface Instance {
  id: string;
  sopInstanceUID: string;
  thumbnailUrl?: string; // generated via backend or Orthanc
}
