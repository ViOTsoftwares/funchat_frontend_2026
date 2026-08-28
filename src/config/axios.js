import axios from "axios";

import { ENV } from "./env.js";

const api = axios.create({
    baseURL: ENV.API_URL,
});
console.log("ENV.API_URL", ENV.API_URL);
api.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
        const token =
            localStorage.getItem("funchat_user_token") ||
            localStorage.getItem("token") ||
            localStorage.getItem("adminToken");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default api;
