export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const ICE_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};
