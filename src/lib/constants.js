import { ENV } from "../config/env";
export const BACKEND_URL = ENV.API_URL;
export const ICE_CONFIG = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};
