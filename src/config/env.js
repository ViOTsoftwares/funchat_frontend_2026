export const ENV = {
    API_URL: import.meta.env.VITE_API_URL,
    SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
    APP_NAME: import.meta.env.VITE_APP_NAME,
    IMAGE_URL: import.meta.env.VITE_IMAGE_URL || import.meta.env.VITE_PUBLIC_IMAGE_URL,
    GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
};