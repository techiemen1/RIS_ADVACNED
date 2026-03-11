import axios from '../hooks/useAxios';

export const login = (username: string, password: string) =>
  axios.post('/auth/login', { username, password });

export {};
