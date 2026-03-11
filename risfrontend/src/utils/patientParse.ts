// src/utils/patientParse.ts

export type ParsedPatient = {
  name?: string;
  age?: string;
  sex?: string;
  id?: string;
  accession?: string;
  modality?: string;
  bodyPart?: string;
  refBy?: string;
};

export function normalizeUpper(val?: string): string {
  if (!val) return "";
  return String(val).trim().toUpperCase();
}

// Clinical age/sex extraction
export function extractAgeSex(input: string) {
  if (!input) return {};

  const s = normalizeUpper(input);

  // Pattern A: 8Y/F or 8Y-M
  let m = s.match(/(\d+)\s*Y\s*[-\/]?\s*([MF])/);
  if (m) return { age: `${m[1]}Y`, sex: m[2] };

  // Pattern B: 8/M
  m = s.match(/(\d+)\s*[-\/]\s*([MF])/);
  if (m) return { age: `${m[1]}Y`, sex: m[2] };

  // Pattern C: 8Y
  m = s.match(/(\d+)\s*Y/);
  if (m) return { age: `${m[1]}Y` };

  // Pattern D: 8F or 8M
  m = s.match(/(\d+)\s*([MF])/);
  if (m) return { age: `${m[1]}Y`, sex: m[2] };

  return {};
}

// DICOM compatibility cleanup (e.g. "008Y" -> "8Y")
export function normalizeDicomAge(age?: string) {
  if (!age) return "";
  const s = normalizeUpper(age);
  const m = s.match(/^0*(\d+)\s*Y$/);
  if (m) return `${m[1]}Y`;
  return s;
}

// Final field-level enforcement
export function enrichPatientPatch(prev: any, key: string, rawVal: string) {
  let val = normalizeUpper(rawVal);

  const next = { ...(prev || {}) };

  if (key === "patientName") {
    next.patientName = val;

    const parsed = extractAgeSex(val);

    if (parsed.age && (!next.patientAge || next.patientAge === "")) {
      next.patientAge = parsed.age;
    }
    if (parsed.sex && (!next.patientSex || next.patientSex === "")) {
      next.patientSex = parsed.sex;
    }
    return next;
  }

  if (key === "patientAge") {
    next.patientAge = normalizeDicomAge(val);
    return next;
  }

  if (key === "patientSex") {
    next.patientSex = val === "MALE" ? "M" : val === "FEMALE" ? "F" : val;
    return next;
  }

  if (key === "referringPhysician") {
    next.referringPhysician = val;
    return next;
  }

  if (key === "bodyPart") {
    next.bodyPart = val;
    return next;
  }

  if (key === "accessionNumber") {
    next.accessionNumber = val;
    return next;
  }

  if (key === "patientID") {
    next.patientID = val;
    return next;
  }

  if (key === "modality") {
    next.modality = val;
    return next;
  }

  return { ...next, [key]: val };
}
