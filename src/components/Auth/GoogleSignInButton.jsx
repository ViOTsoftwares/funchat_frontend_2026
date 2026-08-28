import React, { useState } from "react";
import { Button, CircularProgress, Box, Typography } from "@mui/material";
import { useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../../context/AuthContext.jsx";
import { GoogleLoginApi } from "../../Api.js";
import { ENV } from "../../config/env.js";
import { toastMessage } from "../../lib/toast.message.js";

// Official Google G Logo SVG
export const GoogleLogoIcon = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{ display: "block" }}
  >
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export default function GoogleSignInButton({
  onSuccess,
  onError,
  text = "Continue with Google",
  variant = "full", // "full" or "compact"
}) {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    try {
      const accessToken = tokenResponse?.access_token;
      const idToken = tokenResponse?.id_token || tokenResponse?.credential;

      const res = await GoogleLoginApi({
        access_token: accessToken,
        credential: idToken,
      });

      if (res?.success && res?.token) {
        login(res.token, res.user);
        toastMessage(`Welcome, ${res.user?.username || "Friend"}!`, "success");
        if (onSuccess) onSuccess(res.user);
      } else {
        const msg = res?.message || "Failed to sign in with Google";
        toastMessage(msg, "error");
        if (onError) onError(msg);
      }
    } catch (err) {
      if (onError) onError("Google Sign-In encountered an error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.warn("Google OAuth popup failed or cancelled:", error);
    // If client ID is dummy / mock in dev mode, prompt helpful message
    if (!ENV.GOOGLE_CLIENT_ID || ENV.GOOGLE_CLIENT_ID.includes("dummy") || ENV.GOOGLE_CLIENT_ID.includes("funchat.apps")) {
      if (onError) {
        onError("Google Client ID not configured yet in environment. Use Email OTP to sign in.");
      }
    } else if (onError) {
      onError("Google Sign-In was cancelled or failed.");
    }
  };

  // Google Login Hook
  const googleLoginTrigger = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
    flow: "implicit",
  });

  return (
    <Button
      fullWidth
      variant="outlined"
      disabled={loading}
      onClick={() => {
        try {
          googleLoginTrigger();
        } catch (e) {
          handleGoogleError(e);
        }
      }}
      sx={{
        py: variant === "compact" ? 1 : 1.4,
        px: 2,
        borderRadius: "14px",
        background: "rgba(255, 255, 255, 0.06)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        color: "#ffffff",
        fontWeight: 600,
        fontSize: "13.5px",
        textTransform: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1.5,
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          background: "rgba(255, 255, 255, 0.12)",
          borderColor: "rgba(255, 255, 255, 0.3)",
          transform: "translateY(-1px)",
          boxShadow: "0 6px 20px rgba(0, 0, 0, 0.4)",
        },
        "&:active": {
          transform: "translateY(0)",
        },
        "&:disabled": {
          background: "rgba(255, 255, 255, 0.02)",
          borderColor: "rgba(255, 255, 255, 0.06)",
          color: "rgba(255, 255, 255, 0.4)",
        },
      }}
    >
      {loading ? (
        <CircularProgress size={20} sx={{ color: "#818cf8" }} />
      ) : (
        <>
          <GoogleLogoIcon size={20} />
          <Typography
            component="span"
            sx={{
              fontWeight: 600,
              fontSize: "13.5px",
              color: "#fff",
              letterSpacing: "0.2px",
            }}
          >
            {text}
          </Typography>
        </>
      )}
    </Button>
  );
}
