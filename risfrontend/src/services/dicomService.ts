// src/services/dicomService.ts
import axiosInstance from './axiosInstance';

export type PACSServer = {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  aetitle?: string;
  username?: string;
  password?: string;
  base_url?: string;
  is_active?: boolean;
};

// admin: list/add/edit/delete
export const fetchPACSServers = async (): Promise<PACSServer[]> => {
  const r = await axiosInstance.get('/pacs/admin');
  return r.data;
};

export const createPACSServer = async (payload: Partial<PACSServer>) => {
  const r = await axiosInstance.post('/pacs/admin', payload);
  return r.data;
};

export const updatePACSServer = async (id: number, payload: Partial<PACSServer>) => {
  const r = await axiosInstance.put(`/pacs/admin/${id}`, payload);
  return r.data;
};

export const deletePACSServer = async (id: number) => {
  const r = await axiosInstance.delete(`/pacs/admin/${id}`);
  return r.data;
};

export const testPACSServer = async (id: number) => {
  const r = await axiosInstance.get(`/pacs/test/${id}`);
  return r.data;
};

// PACS browsing
export const fetchPatients = async (pacsId: number, q = '') => {
  const r = await axiosInstance.get(`/pacs/patients/${pacsId}`, { params: { q } });
  return r.data;
};

export const fetchStudies = async (pacsId: number, patientId: string) => {
  const r = await axiosInstance.get(`/pacs/studies/${pacsId}/${encodeURIComponent(patientId)}`);
  return r.data;
};

export const fetchInstances = async (pacsId: number, studyId: string) => {
  const r = await axiosInstance.get(`/pacs/instances/${pacsId}/${encodeURIComponent(studyId)}`);
  return r.data;
};

export const getInstanceThumbnail = (pacsId: number | undefined, instanceId: string) => {
  if (!pacsId) return '';
  return `${import.meta.env.VITE_API_URL || ''}/api/pacs/thumbnail/${pacsId}/${encodeURIComponent(instanceId)}`;
};
