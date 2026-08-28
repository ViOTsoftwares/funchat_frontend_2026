import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Stack,
  Button,
  CircularProgress,
  Alert,
  Fade,
  Paper,
  Chip,
} from "@mui/material";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import BoltIcon from "@mui/icons-material/Bolt";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SecurityRoundedIcon from "@mui/icons-material/SecurityRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import PublicRoundedIcon from "@mui/icons-material/PublicRounded";

import { useAuth } from "../context/AuthContext.jsx";
import { CheckUsernameApi, SendOtpApi, VerifyOtpApi } from "../Api.js";
import { toastMessage } from "../lib/toast.message.js";
import GoogleSignInButton from "../components/Auth/GoogleSignInButton.jsx";
import SEO from "../components/SEO.jsx";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: Success
  const [username, setUsername] = useState(() => {
    const saved =
      localStorage.getItem("funchat_saved_username") ||
      localStorage.getItem("funchat_profile_name") ||
      "";
    return saved !== "Stranger" ? saved : "";
  });
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

  // Pre-fill username on mount if changed
  useEffect(() => {
    const saved =
      localStorage.getItem("funchat_saved_username") ||
      localStorage.getItem("funchat_profile_name") ||
      "";
    if (saved && saved !== "Stranger" && !username) {
      setUsername(saved);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && step !== 3) {
      navigate("/");
    }
  }, [isAuthenticated, navigate, step]);

  // Handle Google OAuth Dynamic Redirect Return
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    const rawUser = params.get("user");
    const oauthError = params.get("error");

    if (token && rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        login(token, parsedUser);
        toastMessage(`Welcome back, ${parsedUser.username || "Friend"}!`, "success");
        navigate("/", { replace: true });
      } catch (err) {
        console.error("Failed to parse Google OAuth payload:", err);
      }
    } else if (oauthError) {
      setError(`Google OAuth Error: ${oauthError}`);
      toastMessage(`Google Sign-In failed: ${oauthError}`, "error");
    }
  }, [location.search, login, navigate]);

  // Clear errors when typing
  useEffect(() => {
    if (error) setError(null);
  }, [username, email]);

  // Auto-generate / fetch username suggestions
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

  // Focus inputs on transition
  useEffect(() => {
    if (step === 1) {
      setTimeout(() => emailInputRef.current?.focus(), 150);
    } else if (step === 2) {
      setTimeout(() => otpInputRefs.current[0]?.focus(), 200);
    }
  }, [step]);

  // Handle Send OTP
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
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Resend OTP
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

    // If full 6-digit code or pasted at index 0, populate from index 0
    // Otherwise populate starting at focused index
    const start = chars.length === 6 ? 0 : startIndex;

    for (let i = 0; i < 6; i++) {
      if (i >= start && chars[i - start] !== undefined) {
        updated[i] = chars[i - start];
      }
    }

    setOtpDigits(updated);

    // Focus the next empty box or the last box
    const focusIndex = Math.min(start + chars.length, 5);
    otpInputRefs.current[focusIndex]?.focus();

    // Auto submit if full 6 digits filled
    const fullOtp = updated.join("");
    if (fullOtp.length === 6 && !updated.includes("")) {
      handleVerifyOtp(fullOtp);
    }
  };

  // Handle OTP digit changes
  const handleOtpChange = (index, value) => {
    // Only allow numbers
    const cleanVal = value.replace(/\D/g, "");
    if (!cleanVal) {
      const updated = [...otpDigits];
      updated[index] = "";
      setOtpDigits(updated);
      return;
    }

    // If user pasted multi-digit string or autofilled
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

      // If full 6 digits entered via paste, auto submit
      const fullOtp = updated.join("");
      if (fullOtp.length === 6 && !updated.includes("")) {
        handleVerifyOtp(fullOtp);
      }
      return;
    }

    updated[index] = cleanVal[cleanVal.length - 1]; // take last char
    setOtpDigits(updated);

    // Auto-advance to next box
    if (index < 5 && cleanVal) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit if all 6 digits filled
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

  // Handle Verify OTP
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
        toastMessage(`Welcome to FunChat, ${res.user?.username || "Friend"}!`, "success");
        setTimeout(() => {
          login(res.token, res.user);
          navigate("/");
        }, 1200);
      } else {
        setError(res?.message || "Invalid or expired verification code.");
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Sign In - FunChat"
        description="Sign in to your FunChat account using secure one-time passcode or Google authentication."
      />

      <Box
        sx={{
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          pt: { xs: 8, sm: 10 },
          pb: { xs: 6, sm: 8 },
        }}
      >
        {/* Background Ambient Glows */}
        <Box
          sx={{
            position: "absolute",
            top: "10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: { xs: "300px", sm: "600px" },
            height: { xs: "250px", sm: "350px" },
            background:
              "radial-gradient(ellipse, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.1) 40%, rgba(15, 23, 42, 0) 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <Container maxWidth="sm" sx={{ position: "relative", zIndex: 1 }}>
          {/* Main Auth Card */}
          <Paper
            elevation={0}
            sx={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.95) 100%)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              borderRadius: { xs: "24px", sm: "32px" },
              p: { xs: 3, sm: 5 },
              boxShadow:
                "0 25px 70px rgba(0, 0, 0, 0.6), 0 0 50px rgba(99, 102, 241, 0.15)",
              color: "#fff",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top Badge & Header */}
            <Box sx={{ textAlign: "center", mb: 3.5 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 58,
                  height: 58,
                  borderRadius: "18px",
                  background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                  boxShadow: "0 12px 30px rgba(99, 102, 241, 0.45)",
                  color: "#fff",
                  mb: 2,
                }}
              >
                {step === 3 ? (
                  <CheckCircleRoundedIcon sx={{ fontSize: 36, color: "#86efac" }} />
                ) : (
                  <BoltIcon sx={{ fontSize: 34 }} />
                )}
              </Box>

              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "1.6rem", sm: "2rem" },
                  letterSpacing: "-0.5px",
                  color: "#fff",
                }}
              >
                {step === 1 && "Welcome to FunChat"}
                {step === 2 && "Enter Verification Code"}
                {step === 3 && "Verified Successfully!"}
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255, 255, 255, 0.65)",
                  fontSize: "14px",
                  mt: 1,
                  lineHeight: 1.5,
                  maxWidth: "380px",
                  mx: "auto",
                }}
              >
                {step === 1 &&
                  "Sign in to start private, fast, and encrypted video & text conversations."}
                {step === 2 && (
                  <>
                    We've sent a 6-digit code to{" "}
                    <strong style={{ color: "#a5b4fc" }}>{email}</strong>
                  </>
                )}
                {step === 3 && "Authentication complete. Redirecting you to the platform..."}
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert
                  severity="error"
                  onClose={() => setError(null)}
                  sx={{
                    mb: 3,
                    borderRadius: "14px",
                    background: "rgba(239, 68, 68, 0.12)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#fca5a5",
                    fontSize: "13px",
                    "& .MuiAlert-icon": { color: "#f87171" },
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 1: LOGIN CHOICES (GOOGLE + EMAIL)
            ═══════════════════════════════════════════════════════════════ */}
            {step === 1 && (
              <Box>
                {/* 1. Google One-Tap Sign In */}
                <GoogleSignInButton
                  text="Continue with Google"
                  onSuccess={() => {
                    setStep(3);
                    setTimeout(() => navigate("/"), 1200);
                  }}
                  onError={(msg) => setError(msg)}
                />

                {/* OR Divider */}
                <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
                  <Box sx={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
                  <Typography
                    variant="caption"
                    sx={{
                      px: 2,
                      color: "rgba(255, 255, 255, 0.4)",
                      fontWeight: 700,
                      fontSize: "11.5px",
                      letterSpacing: "1px",
                    }}
                  >
                    OR SIGN IN WITH EMAIL
                  </Typography>
                  <Box sx={{ flex: 1, height: "1px", background: "rgba(255, 255, 255, 0.1)" }} />
                </Box>

                {/* 2. Email OTP Form */}
                <Box component="form" onSubmit={handleSendOtp}>
                  {/* Username Field */}
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "rgba(255, 255, 255, 0.75)",
                          fontWeight: 600,
                          fontSize: "12.5px",
                        }}
                      >
                        Username / Display Name
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        borderRadius: "14px",
                        p: "8px 10px 8px 16px",
                        transition: "all 0.2s ease",
                        "&:focus-within": {
                          borderColor: "#818cf8",
                          background: "rgba(255, 255, 255, 0.08)",
                          boxShadow: "0 0 24px rgba(99, 102, 241, 0.25)",
                        },
                      }}
                    >
                      <PersonOutlineIcon
                        sx={{ color: "rgba(255, 255, 255, 0.45)", fontSize: 20, mr: 1.5 }}
                      />
                      <Box
                        component="input"
                        type="text"
                        placeholder="e.g. alex_hunter"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        sx={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "#fff",
                          fontSize: "15px",
                          width: "100%",
                          "&::placeholder": { color: "rgba(255, 255, 255, 0.35)" },
                        }}
                      />

                      {/* Suggest button */}
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
                          py: 0.6,
                          px: 1.4,
                          borderRadius: "10px",
                          background: "rgba(99, 102, 241, 0.15)",
                          border: "1px solid rgba(99, 102, 241, 0.3)",
                          color: "#c7d2fe",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "none",
                          whiteSpace: "nowrap",
                          "&:hover": {
                            background: "rgba(99, 102, 241, 0.28)",
                            borderColor: "#818cf8",
                            color: "#fff",
                          },
                        }}
                      >
                        Suggest
                      </Button>
                    </Box>

                    {/* Suggestions chips display */}
                    {suggestions.length > 0 && (
                      <Box
                        sx={{
                          mt: 1.4,
                          p: 1.4,
                          borderRadius: "12px",
                          background: "rgba(99, 102, 241, 0.08)",
                          border: "1px dashed rgba(99, 102, 241, 0.25)",
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 1 }}>
                          <AutoAwesomeIcon sx={{ fontSize: 14, color: "#818cf8" }} />
                          <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#a5b4fc" }}>
                            Suggested unique names (click to select):
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
                                height: "26px",
                                fontSize: "11.5px",
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
                        fontSize: "12.5px",
                        mb: 1,
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
                        p: "14px 16px",
                        transition: "all 0.2s ease",
                        "&:focus-within": {
                          borderColor: "#818cf8",
                          background: "rgba(255, 255, 255, 0.08)",
                          boxShadow: "0 0 24px rgba(99, 102, 241, 0.25)",
                        },
                      }}
                    >
                      <MailOutlineIcon
                        sx={{ color: "rgba(255, 255, 255, 0.45)", fontSize: 20, mr: 1.5 }}
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
                          fontSize: "15px",
                          width: "100%",
                          "&::placeholder": { color: "rgba(255, 255, 255, 0.35)" },
                        }}
                      />
                    </Box>
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    disabled={loading || !email}
                    sx={{
                      py: 1.5,
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "14.5px",
                      textTransform: "none",
                      boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
                        boxShadow: "0 12px 35px rgba(99, 102, 241, 0.5)",
                        transform: "translateY(-1px)",
                      },
                      "&:disabled": {
                        opacity: 0.5,
                        color: "rgba(255,255,255,0.5)",
                      },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={22} sx={{ color: "#fff" }} />
                    ) : (
                      "Send Verification Code"
                    )}
                  </Button>
                </Box>
              </Box>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STEP 2: OTP VERIFICATION CODE
            ═══════════════════════════════════════════════════════════════ */}
            {step === 2 && (
              <Box>
                {/* 6 Digit Input Grid */}
                <Stack
                  direction="row"
                  spacing={{ xs: 1, sm: 1.5 }}
                  justifyContent="center"
                  sx={{ mb: 3.5 }}
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
                        width: { xs: "44px", sm: "52px" },
                        height: { xs: "54px", sm: "62px" },
                        textAlign: "center",
                        fontSize: { xs: "22px", sm: "26px" },
                        fontWeight: 800,
                        color: "#818cf8",
                        fontFamily: "monospace",
                        background: digit
                          ? "rgba(99, 102, 241, 0.18)"
                          : "rgba(255, 255, 255, 0.05)",
                        border: digit
                          ? "2px solid #818cf8"
                          : "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "16px",
                        outline: "none",
                        transition: "all 0.2s ease",
                        "&:focus": {
                          borderColor: "#818cf8",
                          background: "rgba(99, 102, 241, 0.22)",
                          boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
                          transform: "scale(1.04)",
                        },
                      }}
                    />
                  ))}
                </Stack>

                <Button
                  fullWidth
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otpDigits.join("").length !== 6}
                  sx={{
                    py: 1.5,
                    borderRadius: "14px",
                    background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "14.5px",
                    textTransform: "none",
                    boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
                    },
                    "&:disabled": {
                      opacity: 0.5,
                      color: "rgba(255,255,255,0.5)",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={22} sx={{ color: "#fff" }} />
                  ) : (
                    "Verify & Sign In"
                  )}
                </Button>

                {/* Back / Resend Options */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ mt: 3, pt: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <Button
                    size="small"
                    startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
                    onClick={() => setStep(1)}
                    sx={{
                      color: "rgba(255,255,255,0.6)",
                      fontSize: "13px",
                      textTransform: "none",
                      "&:hover": { color: "#fff" },
                    }}
                  >
                    Change Email
                  </Button>

                  <Button
                    size="small"
                    startIcon={<RefreshIcon sx={{ fontSize: 15 }} />}
                    onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    sx={{
                      color: resendTimer > 0 ? "rgba(255,255,255,0.4)" : "#818cf8",
                      fontSize: "13px",
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
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Box
                  sx={{
                    display: "inline-flex",
                    p: 2.5,
                    borderRadius: "50%",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "2px solid #22c55e",
                    mb: 2.5,
                  }}
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 56, color: "#22c55e" }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff", mb: 0.5 }}>
                  Authentication Confirmed
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
                  Entering the chat network...
                </Typography>
              </Box>
            )}

            {/* Bottom Security Highlights */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              justifyContent="center"
              alignItems="center"
              sx={{ mt: 4, pt: 3, borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <SecurityRoundedIcon sx={{ fontSize: 15, color: "#818cf8" }} />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "11.5px" }}>
                  Zero-Knowledge Auth
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.2)", display: { xs: "none", sm: "block" } }}
              >
                •
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <SpeedRoundedIcon sx={{ fontSize: 15, color: "#38bdf8" }} />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "11.5px" }}>
                  Instant Access
                </Typography>
              </Stack>
              <Typography
                variant="caption"
                sx={{ color: "rgba(255,255,255,0.2)", display: { xs: "none", sm: "block" } }}
              >
                •
              </Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <ShieldOutlinedIcon sx={{ fontSize: 15, color: "#86efac" }} />
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "11.5px" }}>
                  End-to-End Encrypted
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Back to Home Link */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Button
              component={RouterLink}
              to="/"
              startIcon={<ArrowBackIcon sx={{ fontSize: 15 }} />}
              sx={{
                color: "rgba(255, 255, 255, 0.6)",
                fontSize: "13px",
                textTransform: "none",
                "&:hover": { color: "#fff" },
              }}
            >
              Return to Homepage
            </Button>
          </Box>
        </Container>
      </Box>
    </>
  );
}
