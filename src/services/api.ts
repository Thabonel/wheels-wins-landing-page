export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';

export function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, options);
}

export function getWebSocketUrl(path: string) {
  // Convert HTTP base URL to WebSocket protocol
  const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  return `${baseUrl}${path}`;
}
