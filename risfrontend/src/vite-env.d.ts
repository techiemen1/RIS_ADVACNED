/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_ORTHANC_URL?: string;
  readonly VITE_DCM4CHEE_URL?: string;
  readonly VITE_OHIF_VIEWER_URL?: string;
  readonly VITE_APP_NAME?: string;
  // add more as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
