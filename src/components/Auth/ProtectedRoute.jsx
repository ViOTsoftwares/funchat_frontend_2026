import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { toastMessage } from "../../lib/toast.message.js";

export default function ProtectedRoute({ children }) {
  const savedName =
    localStorage.getItem("funchat_saved_username") ||
    localStorage.getItem("funchat_profile_name");

  const hasUsername = Boolean(savedName && savedName !== "Stranger");

  useEffect(() => {
    if (!hasUsername) {
      toastMessage("Please choose a handle first to access this page!", "warning");
      localStorage.removeItem("funchat_profile_popup_seen");
      setTimeout(() => {
        window.dispatchEvent(new Event("openProfileWelcomeModal"));
      }, 100);
    }
  }, [hasUsername]);

  if (!hasUsername) {
    return <Navigate to="/" replace />;
  }

  return children;
}
