import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { BACKEND_URL } from "../lib/constants";

export function useSocket() {
  const socketRef = useRef(null);
  const [status, setStatus] = useState("disconnected");
  const [socketId, setSocketId] = useState("");

  useEffect(() => {
    const socket = io(BACKEND_URL, { transports: ["websocket"] });
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
