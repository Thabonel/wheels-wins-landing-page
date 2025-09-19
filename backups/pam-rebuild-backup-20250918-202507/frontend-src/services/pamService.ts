// PAM Service Configuration - WebSocket handled by usePamWebSocketCore hook

export const PAM_CONFIG = {
  // Primary PAM WebSocket endpoints (production ready)
  WEBSOCKET_ENDPOINTS: [
    import.meta.env.VITE_PAM_WEBSOCKET_URL || 'wss://pam-backend.onrender.com',
    'wss://api.wheelsandwins.com/pam',  // Alternate production endpoint
  ],
  
  // Fallback HTTP endpoints for when WebSocket isn't available
  HTTP_ENDPOINTS: [
    'https://api.wheelsandwins.com/pam/chat'
  ],
  
  // Connection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 2000,
  HEARTBEAT_INTERVAL: 30000,
  CONNECTION_TIMEOUT: 5000,
};

// Export configuration for use in hooks and components
export default PAM_CONFIG;