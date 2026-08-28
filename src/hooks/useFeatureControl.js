import { useState, useEffect } from "react";
import { GetFeatureControlApi } from "../Api.js";

const DEFAULT_FEATURE_CONTROL = {
  chat: "live",
  video: "live",
  community: "live",
};

export function useFeatureControl(socketRef) {
  const [featureControl, setFeatureControl] = useState(DEFAULT_FEATURE_CONTROL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial REST fetch via Axios API
    const fetchFeatureControl = async () => {
      try {
        const data = await GetFeatureControlApi();
        if (isMounted && data?.result) {
          setFeatureControl(data.result);
          setLoaded(true);
        }
      } catch (err) {
        console.warn("Could not fetch feature control, using defaults:", err?.message);
        if (isMounted) setLoaded(true);
      }
    };

    fetchFeatureControl();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time updates via Socket.IO
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleUpdate = (data) => {
      if (data && typeof data === "object") {
        setFeatureControl((prev) => ({
          ...prev,
          ...data,
        }));
      }
    };

    socket.on("feature_control_updated", handleUpdate);
    socket.on("feature_control_init", handleUpdate);

    return () => {
      socket.off("feature_control_updated", handleUpdate);
      socket.off("feature_control_init", handleUpdate);
    };
  }, [socketRef?.current]);

  const isLive = (feature) => (featureControl[feature] ?? "live") === "live";
  const isComingSoon = (feature) => featureControl[feature] === "coming_soon";
  const isMaintenance = (feature) => featureControl[feature] === "maintenance";
  const getStatus = (feature) => featureControl[feature] ?? "live";

  return {
    featureControl,
    loaded,
    isLive,
    isComingSoon,
    isMaintenance,
    getStatus,
  };
}
