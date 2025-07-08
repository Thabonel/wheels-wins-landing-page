export const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://pam-backend.onrender.com';

// Allow overriding the WebSocket endpoint separately if needed
const WS_OVERRIDE = import.meta.env.VITE_PAM_WEBSOCKET_URL;

export function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, options);
}

export function getWebSocketUrl(path: string) {
  // Use explicit WebSocket override if provided
  if (WS_OVERRIDE) {
    return WS_OVERRIDE;
  }

  // Otherwise derive from the HTTP base URL
  const baseUrl = API_BASE_URL.replace(/^http/, 'ws');
  return `${baseUrl}${path}`;
}
