import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Stack,
  IconButton,
  Button,
  CircularProgress,
  Alert,
  Fade,
  Chip,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BoltIcon from "@mui/icons-material/Bolt";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import KeyOutlinedIcon from "@mui/icons-material/KeyOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";

import { useAuth } from "../../context/AuthContext.jsx";
import { CheckUsernameApi, SendOtpApi, VerifyOtpApi } from "../../Api.js";
import { toastMessage } from "../../lib/toast.message.js";
import GoogleSignInButton from "./GoogleSignInButton.jsx";

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, login } = useAuth();

  const [step, setStep] = useState(1); // 1: Credentials, 2: OTP Verification, 3: Success
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resendTimer, setResendTimer] = useState(0);

  const emailInputRef = useRef(null);
  const otpInputRefs = useRef([]);

  // Reset state & pre-fill saved username on modal toggle
  useEffect(() => {
    if (isLoginModalOpen) {
      setStep(1);
      setError(null);
      const savedName =
        localStorage.getItem("funchat_saved_username") ||
        localStorage.getItem("funchat_profile_name") ||
        "";
      setUsername(savedName !== "Stranger" ? savedName : "");
      setUsernameStatus(null);
      setSuggestions([]);
      setEmail("");
      setOtpDigits(["", "", "", "", "", ""]);
      setTimeout(() => {
        emailInputRef.current?.focus();
      }, 150);
    }
  }, [isLoginModalOpen]);

  // Clear errors when typing
  useEffect(() => {
    if (error) setError(null);
  }, [username, email]);

  // Auto-generate / fetch natural username suggestions
  const handleFetchSuggestions = async (e) => {
    if (e) e.preventDefault();
    setSuggestLoading(true);
    setError(null);
    try {
      const seed = username || (email ? email.split("@")[0] : "user");
      const res = await CheckUsernameApi({ username: seed, suggest: "true" });
      if (res?.suggestions?.length > 0) {
        setSuggestions(res.suggestions);
      }
    } catch (err) {
      // ignore
    } finally {
      setSuggestLoading(false);
    }
  };

  // Select a suggestion
  const handleSelectSuggestion = (sugg) => {
    setUsername(sugg);
    setUsernameStatus("available");
    setError(null);
  };

  // Resend Countdown Timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Focus first OTP box on step 2 transition
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 200);
    }
  }, [step]);

  // Handle Step 1: Send OTP
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      setError("Please enter your email address or username.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await SendOtpApi({ email, username });
      if (res?.success) {
        if (res.email) setEmail(res.email);
        if (res.username) setUsername(res.username);
        setStep(2);
        setResendTimer(60);
      } else {
        setError(res?.message || "Failed to send verification code.");
        if (res?.suggestions?.length > 0) {
          setSuggestions(res.suggestions);
          setUsernameStatus("taken");
        }
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Step 2: Resend OTP
  const handleResend = async () => {
    if (resendTimer > 0 || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await SendOtpApi({ email, username });
      if (res?.success) {
        setResendTimer(60);
        setOtpDigits(["", "", "", "", "", ""]);
        otpInputRefs.current[0]?.focus();
        toastMessage("Verification code resent to your email", "info");
      } else {
        setError(res?.message || "Failed to resend code.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle paste in OTP inputs
  const handleOtpPaste = (e, startIndex = 0) => {
    e.preventDefault();
    const pastedData = (e.clipboardData || window.clipboardData)?.getData("text") || "";
    const cleanVal = pastedData.replace(/\D/g, "");
    if (!cleanVal) return;

    const chars = cleanVal.slice(0, 6).split("");
    const updated = [...otpDigits];
    const start = chars.length === 6 ? 0 : startIndex;

    for (let i = 0; i < 6; i++) {
      if (i >= start && chars[i - start] !== undefined) {
        updated[i] = chars[i - start];
      }
    }

    setOtpDigits(updated);
    const focusIndex = Math.min(start + chars.length, 5);
    otpInputRefs.current[focusIndex]?.focus();

    const fullOtp = updated.join("");
    if (fullOtp.length === 6 && !updated.includes("")) {
      handleVerifyOtp(fullOtp);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    const updated = [...otpDigits];
    if (cleanVal.length > 1) {
      const chars = cleanVal.slice(0, 6).split("");
      const start = chars.length === 6 ? 0 : index;
      for (let i = 0; i < 6; i++) {
        if (i >= start && chars[i - start] !== undefined) {
          updated[i] = chars[i - start];
        }
      }
      setOtpDigits(updated);
      const nextIndex = Math.min(start + chars.length, 5);
      otpInputRefs.current[nextIndex]?.focus();

      const fullOtp = updated.join("");
      if (fullOtp.length === 6 && !updated.includes("")) {
        handleVerifyOtp(fullOtp);
      }
      return;
    }

    updated[index] = cleanVal[cleanVal.length - 1];
    setOtpDigits(updated);

    if (index < 5 && cleanVal) {
      otpInputRefs.current[index + 1]?.focus();
    }

    const fullOtp = updated.join("");
    if (fullOtp.length === 6 && !updated.includes("")) {
      handleVerifyOtp(fullOtp);
    }
  };

  // Handle backspace and navigation in OTP
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        e.preventDefault();
        const updated = [...otpDigits];
        updated[index - 1] = "";
        setOtpDigits(updated);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Step 2: Verify OTP
  const handleVerifyOtp = async (otpString) => {
    const code = typeof otpString === "string" ? otpString : otpDigits.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await VerifyOtpApi({ email, otp: code, username });
      if (res?.success && res?.token) {
        setStep(3);
        setTimeout(() => {
          login(res.token, res.user);
          toastMessage(`Welcome back, ${res.user?.username || "Friend"}!`, "success");
        }, 1100);
      } else {
        setError(res?.message || "Invalid or expired verification code.");
        if (res?.suggestions?.length > 0) {
          setSuggestions(res.suggestions);
        }
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isLoginModalOpen}
      onClose={closeLoginModal}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, #101626 0%, #0a0e1a 100%)",
          border: "1px solid rgba(99, 102, 241, 0.22)",
          borderRadius: { xs: "22px", sm: "28px" },
          boxShadow:
            "0 25px 70px rgba(0, 0, 0, 0.85), 0 0 50px rgba(99, 102, 241, 0.12)",
          color: "#fff",
          overflow: "hidden",
          p: 0,
          position: "relative",
          maxWidth: { xs: "calc(100vw - 32px)", sm: "440px" },
          mx: "auto",
        },
      }}
    >
      {/* Dynamic ambient backdrop lights */}
      <Box
        sx={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "320px",
          height: "160px",
          background:
            "radial-gradient(ellipse, rgba(99, 102, 241, 0.35) 0%, rgba(59, 130, 246, 0.12) 50%, transparent 75%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Top Close Button */}
      <Tooltip title="Close">
        <IconButton
          onClick={closeLoginModal}
          size="small"
          aria-label="Close dialog"
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            color: "rgba(255, 255, 255, 0.5)",
            background: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "12px",
            p: 0.8,
            zIndex: 10,
            transition: "all 0.2s ease",
            "&:hover": {
              background: "rgba(255, 255, 255, 0.12)",
              color: "#fff",
              transform: "rotate(90deg)",
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Tooltip>

      <DialogContent sx={{ p: { xs: 2.5, sm: 3.5 }, position: "relative", zIndex: 2 }}>
        {/* Step Indicator Header Pills */}
        <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mb: 2.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.2,
              py: 0.4,
              borderRadius: "20px",
              background: step === 1 ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${step === 1 ? "#818cf8" : "rgba(255, 255, 255, 0.1)"}`,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: step === 1 ? "#818cf8" : step > 1 ? "#4ade80" : "rgba(255,255,255,0.4)",
              }}
            />
            <Typography
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                color: step === 1 ? "#c7d2fe" : "rgba(255,255,255,0.5)",
              }}
            >
              1. Account
            </Typography>
          </Box>

          <Box sx={{ width: 16, height: 1, background: "rgba(255,255,255,0.15)" }} />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.2,
              py: 0.4,
              borderRadius: "20px",
              background: step === 2 ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.05)",
              border: `1px solid ${step === 2 ? "#818cf8" : "rgba(255, 255, 255, 0.1)"}`,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: step === 2 ? "#818cf8" : step === 3 ? "#4ade80" : "rgba(255,255,255,0.4)",
              }}
            />
            <Typography
              sx={{
                fontSize: "11px",
                fontWeight: 700,
                color: step === 2 ? "#c7d2fe" : "rgba(255,255,255,0.5)",
              }}
            >
              2. Security Code
            </Typography>
          </Box>
        </Stack>

        {/* Brand Icon & Heading */}
        <Box sx={{ textAlign: "center", mb: 2.8 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: "18px",
              background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
              boxShadow: "0 12px 28px rgba(99, 102, 241, 0.4)",
              color: "#fff",
              mb: 1.5,
              position: "relative",
            }}
          >
            {step === 3 ? (
              <CheckCircleRoundedIcon sx={{ fontSize: 32, color: "#86efac" }} />
            ) : step === 2 ? (
              <KeyOutlinedIcon sx={{ fontSize: 28 }} />
            ) : (
              <BoltIcon sx={{ fontSize: 30 }} />
            )}
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.25rem", sm: "1.42rem" },
              letterSpacing: "-0.5px",
              color: "#fff",
            }}
          >
            {step === 1 && "Welcome to FunChat"}
            {step === 2 && "Enter Security Code"}
            {step === 3 && "Verified Successfully!"}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "rgba(255, 255, 255, 0.62)",
              fontSize: "13px",
              mt: 0.5,
              lineHeight: 1.45,
            }}
          >
            {step === 1 && "Sign in or register with email to start chatting instantly."}
            {step === 2 && (
              <>
                We sent a 6-digit security code to{" "}
                <Box
                  component="span"
                  sx={{
                    color: "#a5b4fc",
                    fontWeight: 700,
                    wordBreak: "break-all",
                  }}
                >
                  {email}
                </Box>
              </>
            )}
            {step === 3 && "Setting up your secure session..."}
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Fade in>
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: "14px",
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                color: "#fca5a5",
                fontSize: "12.5px",
                "& .MuiAlert-icon": { color: "#f87171" },
              }}
            >
              {error}
            </Alert>
          </Fade>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 1: USERNAME & EMAIL INPUT
        ═══════════════════════════════════════════════════════════════ */}
        {step === 1 && (
          <Box component="form" onSubmit={handleSendOtp}>
            {/* Username Field */}
            <Box sx={{ mb: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 0.8,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255, 255, 255, 0.75)",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  Username / Display Handle
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "14px",
                  p: "7px 10px 7px 14px",
                  transition: "all 0.2s ease",
                  "&:focus-within": {
                    borderColor: "#818cf8",
                    background: "rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 0 20px rgba(99, 102, 241, 0.25)",
                  },
                }}
              >
                <PersonOutlineIcon
                  sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 20, mr: 1.5 }}
                />
                <Box
                  component="input"
                  type="text"
                  placeholder="e.g. alex_dev or your_name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  sx={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: "14px",
                    width: "100%",
                    "&::placeholder": { color: "rgba(255, 255, 255, 0.35)" },
                  }}
                />

                {/* Auto-suggest button */}
                <Tooltip title="Generate natural, unique username suggestions">
                  <Button
                    size="small"
                    type="button"
                    onClick={handleFetchSuggestions}
                    disabled={loading || suggestLoading}
                    startIcon={
                      suggestLoading ? (
                        <CircularProgress size={12} sx={{ color: "#a5b4fc" }} />
                      ) : (
                        <AutoAwesomeIcon sx={{ fontSize: "14px !important", color: "#a5b4fc" }} />
                      )
                    }
                    sx={{
                      minWidth: "auto",
                      py: 0.5,
                      px: 1.2,
                      borderRadius: "10px",
                      background: "rgba(99, 102, 241, 0.15)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      color: "#c7d2fe",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "none",
                      whiteSpace: "nowrap",
                      "&:hover": {
                        background: "rgba(99, 102, 241, 0.3)",
                        borderColor: "#818cf8",
                        color: "#fff",
                      },
                    }}
                  >
                    Suggest
                  </Button>
                </Tooltip>
              </Box>

              {/* Natural Suggestions Chips */}
              {suggestions.length > 0 && (
                <Box
                  sx={{
                    mt: 1.2,
                    p: 1.2,
                    borderRadius: "14px",
                    background: "rgba(99, 102, 241, 0.08)",
                    border: "1px dashed rgba(99, 102, 241, 0.28)",
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.8 }}>
                    <AutoAwesomeIcon sx={{ fontSize: 13, color: "#818cf8" }} />
                    <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#a5b4fc" }}>
                      Pick an available name:
                    </Typography>
                  </Stack>
                  <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                    {suggestions.map((sugg) => (
                      <Chip
                        key={sugg}
                        label={`@${sugg}`}
                        size="small"
                        onClick={() => handleSelectSuggestion(sugg)}
                        clickable
                        sx={{
                          height: "25px",
                          fontSize: "11px",
                          fontWeight: 600,
                          background:
                            username === sugg
                              ? "rgba(99, 102, 241, 0.4)"
                              : "rgba(255, 255, 255, 0.06)",
                          border: `1px solid ${
                            username === sugg ? "#818cf8" : "rgba(255, 255, 255, 0.15)"
                          }`,
                          color: username === sugg ? "#fff" : "rgba(255, 255, 255, 0.85)",
                          transition: "all 0.15s ease",
                          "&:hover": {
                            background: "rgba(99, 102, 241, 0.25)",
                            borderColor: "#818cf8",
                            color: "#fff",
                            transform: "translateY(-1px)",
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Box>

            {/* Email Field */}
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "rgba(255, 255, 255, 0.75)",
                  fontWeight: 600,
                  fontSize: "12px",
                  mb: 0.8,
                }}
              >
                Email Address
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: "14px",
                  p: "12px 14px",
                  transition: "all 0.2s ease",
                  "&:focus-within": {
                    borderColor: "#818cf8",
                    background: "rgba(255, 255, 255, 0.08)",
                    boxShadow: "0 0 20px rgba(99, 102, 241, 0.25)",
                  },
                }}
              >
                <MailOutlineIcon
                  sx={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 20, mr: 1.5 }}
                />
                <Box
                  component="input"
                  ref={emailInputRef}
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  sx={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: "#fff",
                    fontSize: "14px",
                    width: "100%",
                    "&::placeholder": { color: "rgba(255, 255, 255, 0.35)" },
                  }}
                />
              </Box>
            </Box>

            {/* Submit Action Button */}
            <Button
              type="submit"
              fullWidth
              disabled={loading || !email}
              sx={{
                py: 1.5,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3b82f6 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                textTransform: "none",
                boxShadow: "0 10px 25px rgba(99, 102, 241, 0.35)",
                transition: "all 0.2s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #2563eb 100%)",
                  boxShadow: "0 12px 30px rgba(99, 102, 241, 0.45)",
                  transform: "translateY(-1px)",
                },
                "&:disabled": {
                  opacity: 0.5,
                  color: "rgba(255,255,255,0.5)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                "Send Verification Code"
              )}
            </Button>

            {/* Divider */}
            <Box sx={{ display: "flex", alignItems: "center", my: 2.2 }}>
              <Box sx={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
              <Typography
                variant="caption"
                sx={{
                  px: 2,
                  color: "rgba(255, 255, 255, 0.4)",
                  fontWeight: 700,
                  fontSize: "11px",
                  letterSpacing: "1px",
                }}
              >
                OR
              </Typography>
              <Box sx={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
            </Box>

            {/* Google OAuth Login */}
            <GoogleSignInButton
              onSuccess={() => {
                setStep(3);
              }}
              onError={(err) => {
                setError(err);
              }}
            />

            {/* Professional Trust Badges */}
            <Stack
              direction="row"
              spacing={1.2}
              justifyContent="center"
              alignItems="center"
              sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <LockOutlinedIcon sx={{ fontSize: 13, color: "#818cf8" }} />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                  Passwordless
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.2)" }}>•</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <VerifiedUserOutlinedIcon sx={{ fontSize: 13, color: "#86efac" }} />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                  Encrypted OTP
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.2)" }}>•</Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <BoltIcon sx={{ fontSize: 13, color: "#facc15" }} />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                  Instant Login
                </Typography>
              </Stack>
            </Stack>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 2: OTP INPUT
        ═══════════════════════════════════════════════════════════════ */}
        {step === 2 && (
          <Box>
            {/* Email Edit Header Chip */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: "12px",
                p: "8px 12px",
                mb: 2.5,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <MailOutlineIcon sx={{ fontSize: 16, color: "#818cf8", flexShrink: 0 }} />
                <Typography
                  sx={{
                    fontSize: "12.5px",
                    color: "rgba(255,255,255,0.85)",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {email}
                </Typography>
              </Stack>

              <Button
                size="small"
                startIcon={<EditOutlinedIcon sx={{ fontSize: "13px !important" }} />}
                onClick={() => setStep(1)}
                sx={{
                  color: "#a5b4fc",
                  fontSize: "11.5px",
                  fontWeight: 600,
                  textTransform: "none",
                  py: 0.2,
                  px: 0.8,
                  minWidth: "auto",
                  "&:hover": { color: "#fff", background: "rgba(255,255,255,0.06)" },
                }}
              >
                Change
              </Button>
            </Box>

            {/* 6 Digit Input Grid */}
            <Stack
              direction="row"
              spacing={{ xs: 0.8, sm: 1.2 }}
              justifyContent="center"
              sx={{ mb: 3 }}
            >
              {otpDigits.map((digit, idx) => (
                <Box
                  key={idx}
                  component="input"
                  ref={(el) => (otpInputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  autoComplete={idx === 0 ? "one-time-code" : "off"}
                  value={digit}
                  disabled={loading}
                  onPaste={(e) => handleOtpPaste(e, idx)}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onFocus={(e) => e.target.select()}
                  sx={{
                    width: { xs: "42px", sm: "48px" },
                    height: { xs: "52px", sm: "58px" },
                    textAlign: "center",
                    fontSize: { xs: "22px", sm: "24px" },
                    fontWeight: 800,
                    color: "#818cf8",
                    fontFamily: "monospace",
                    background: digit
                      ? "rgba(99, 102, 241, 0.15)"
                      : "rgba(255, 255, 255, 0.05)",
                    border: digit
                      ? "2px solid #818cf8"
                      : "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "14px",
                    outline: "none",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#818cf8",
                      background: "rgba(99, 102, 241, 0.2)",
                      boxShadow: "0 0 16px rgba(99, 102, 241, 0.4)",
                      transform: "scale(1.05)",
                    },
                  }}
                />
              ))}
            </Stack>

            {/* Verify Button */}
            <Button
              fullWidth
              onClick={() => handleVerifyOtp()}
              disabled={loading || otpDigits.join("").length !== 6}
              sx={{
                py: 1.5,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3b82f6 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "14px",
                textTransform: "none",
                boxShadow: "0 10px 25px rgba(99, 102, 241, 0.35)",
                transition: "all 0.2s ease",
                "&:hover": {
                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #2563eb 100%)",
                },
                "&:disabled": {
                  opacity: 0.5,
                  color: "rgba(255,255,255,0.5)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                "Verify & Sign In"
              )}
            </Button>

            {/* Resend Actions Footer */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Button
                size="small"
                startIcon={<ArrowBackIcon sx={{ fontSize: 14 }} />}
                onClick={() => setStep(1)}
                sx={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "12px",
                  textTransform: "none",
                  "&:hover": { color: "#fff" },
                }}
              >
                Back to Edit
              </Button>

              <Button
                size="small"
                startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                onClick={handleResend}
                disabled={resendTimer > 0 || loading}
                sx={{
                  color: resendTimer > 0 ? "rgba(255,255,255,0.4)" : "#818cf8",
                  fontSize: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": { color: "#a5b4fc" },
                }}
              >
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Code"}
              </Button>
            </Stack>
          </Box>
        )}

        {/* ═══════════════════════════════════════════════════════════════
            STEP 3: SUCCESS ANIMATION
        ═══════════════════════════════════════════════════════════════ */}
        {step === 3 && (
          <Box sx={{ textAlign: "center", py: 3 }}>
            <Box
              sx={{
                display: "inline-flex",
                p: 2,
                borderRadius: "50%",
                background: "rgba(34, 197, 94, 0.15)",
                border: "2px solid #22c55e",
                boxShadow: "0 0 30px rgba(34, 197, 94, 0.35)",
                mb: 2,
              }}
            >
              <CheckCircleRoundedIcon sx={{ fontSize: 48, color: "#22c55e" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff", mb: 0.5 }}>
              Authentication Confirmed
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.65)" }}>
              Welcome back to FunChat Connect. Redirecting...
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
