export const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';

export function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, options);
}

export function getWebSocketUrl(path: string) {
  return (API_BASE_URL || '').replace(/^http/, 'ws') + path;
}
