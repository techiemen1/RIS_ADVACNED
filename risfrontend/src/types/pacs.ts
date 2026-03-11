// src/types/pacs.ts
export interface PACSServer {
  id: string;
  name: string;         // Friendly name e.g. "Orthanc Local"
  host: string;         // hostname or IP
  port: number;         // port (e.g. 8042 or 11112 for DICOM)
  aet?: string;         // AE Title (for DICOM association)
  username?: string;    // optional auth for PACS HTTP API (Orthanc, DCM4CHEE)
  password?: string;    // optional auth
  description?: string; // free text
  lastSynced?: string;  // ISO timestamp
  autoSync?: boolean;   // whether auto-sync is enabled
}
