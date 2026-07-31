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
    const socket = io(ENV.API_URL, { 
      transports: ["websocket"],
      auth: { userId: localUserId }
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketId(socket.id);
      setStatus("connected");
    });

    socket.on("disconnect", () => {
      setStatus("disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socketRef, status, socketId };
}
