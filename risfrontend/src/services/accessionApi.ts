// src/services/accessionApi.ts
import axiosInstance from "./axiosInstance";

export async function previewAccession(prefix = "ACC") {
  const r = await axiosInstance.get(`/accession/preview?prefix=${encodeURIComponent(prefix)}`);
  return r.data?.data || null;
}

export async function nextAccession(prefix = "ACC", modality?: string) {
  const r = await axiosInstance.post(`/accession/next`, { prefix, modality });
  return r.data?.data || null;
}
