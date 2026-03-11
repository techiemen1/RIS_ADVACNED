// src/hooks/useAxios.ts
import axios from 'axios';

// Use environment variable or default to relative /api for proxy support
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "/api";

const instance = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json' },
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

export default instance;
