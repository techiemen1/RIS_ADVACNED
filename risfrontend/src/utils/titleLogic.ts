// src/utils/titleLogic.ts

export function buildDefaultTitle(bodyPart?: string, modality?: string) {
  const bp = (bodyPart || "").trim().toUpperCase();
  const mod = (modality || "").trim().toUpperCase();

  if (!bp && !mod) return "RADIOLOGY REPORT";
  if (bp && !mod) return `${bp} RADIOLOGY REPORT`;
  if (!bp && mod) return `${mod} STUDY RADIOLOGY REPORT`;

  return `${bp} ${mod} STUDY RADIOLOGY REPORT`;
}

export function ensureTitleUpper(s: string) {
  return (s || "").trim().toUpperCase();
}

// If user edits manually, we keep manual
export function resolveFinalTitle(state: any) {
  if (state?.manualTitle && state.manualTitle.trim() !== "") {
    return ensureTitleUpper(state.manualTitle);
  }
  return ensureTitleUpper(buildDefaultTitle(state.bodyPart, state.modality));
}
