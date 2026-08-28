import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { ENV } from "../config/env.js";

// Generate or retrieve stable user ID
let localUserId = "";
if (typeof window !== "undefined") {
  localUserId = localStorage.getItem("funchat_user_id");
  if (!localUserId) {
    localUserId = "user_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("funchat_user_id", localUserId);
  }
}

export function useSocket() {
  const socketRef = useRef(null);
  const [status, setStatus] = useState("disconnected");
  const [socketId, setSocketId] = useState("");

  useEffect(() => {
    // Robust backend socket URL fallback
    const targetUrl =
      ENV.SOCKET_URL ||
      ENV.API_URL ||
      (typeof window !== "undefined"
        ? `${window.location.protocol}//${window.location.hostname}:4000`
        : "http://localhost:4000");

    const socket = io(targetUrl, {
      transports: ["polling", "websocket"],
      auth: { userId: localUserId },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket Connected] ID:", socket.id, "URL:", targetUrl);
      setSocketId(socket.id);
      setStatus("connected");
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket Connect Error]", err.message, "URL:", targetUrl);
      setStatus("disconnected");
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket Disconnected] Reason:", reason);
      setStatus("disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socketRef, status, socketId };
}
