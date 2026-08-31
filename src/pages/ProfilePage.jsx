import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  Stack,
  Avatar,
  Button,
  CircularProgress,
  Alert,
  Fade,
  Chip,
  Tooltip,
  Grid,
  IconButton,
  Divider,
  Tabs,
  Tab,
} from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import EditIcon from "@mui/icons-material/Edit";
import LogoutIcon from "@mui/icons-material/Logout";
import BoltIcon from "@mui/icons-material/Bolt";
import BadgeOutlinedIcon from "@mui/icons-material/BadgeOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import GroupsIcon from "@mui/icons-material/Groups";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import SecurityIcon from "@mui/icons-material/Security";
import AlternateEmailIcon from "@mui/icons-material/AlternateEmail";
import ColorLensOutlinedIcon from "@mui/icons-material/ColorLensOutlined";
import FormatQuoteIcon from "@mui/icons-material/FormatQuote";
import SaveIcon from "@mui/icons-material/Save";

import { useAuth } from "../context/AuthContext.jsx";
import { CheckUsernameApi, UpdateProfileApi } from "../Api.js";
import { toastMessage } from "../lib/toast.message.js";
import SEO from "../components/SEO.jsx";

const AVATAR_PRESETS = [
  "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
  "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
  "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
  "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
  "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, login } = useAuth();

  const [tabIndex, setTabIndex] = useState(0);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [bio, setBio] = useState("");
  const [selectedAvatarBg, setSelectedAvatarBg] = useState(AVATAR_PRESETS[0]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  // Populate profile fields from user session or localStorage
  useEffect(() => {
    if (user) {
      const currentName =
        user.username ||
        localStorage.getItem("funchat_saved_username") ||
        localStorage.getItem("funchat_profile_name") ||
        "";
      if (currentName && currentName !== "Stranger") {
        setUsername(currentName);
      }
      setBio(user.bio || "");
      if (user.avatar && user.avatar.startsWith("linear-gradient")) {
        setSelectedAvatarBg(user.avatar);
      }
    }
  }, [user]);

  // Debounced live username availability check
  useEffect(() => {
    const clean = username.trim();
    if (!clean || clean.length < 2) {
      setUsernameStatus(null);
      return;
    }

    // Don't flag as taken if it matches current saved username
    if (clean.toLowerCase() === (user?.username || "").toLowerCase()) {
      setUsernameStatus("available");
      return;
    }

    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      try {
        const res = await CheckUsernameApi({ username: clean });
        if (res?.available) {
          setUsernameStatus("available");
        } else {
          setUsernameStatus("taken");
          if (res?.suggestions?.length > 0) {
            setSuggestions(res.suggestions);
          }
        }
      } catch (err) {
        setUsernameStatus(null);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [username, user]);

  // Suggest handle ideas
  const handleFetchSuggestions = async (e) => {
    if (e) e.preventDefault();
    setSuggestLoading(true);
    setError(null);
    try {
      const seed = username || (user?.email ? user.email.split("@")[0] : "user");
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

  // Select a suggestion chip
  const handleSelectSuggestion = (sugg) => {
    setUsername(sugg);
    setUsernameStatus("available");
    setError(null);
  };

  // Save Profile Changes
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const clean = username.trim();
    if (!clean) {
      setError("Please enter a valid handle.");
      return;
    }

    if (usernameStatus === "taken") {
      setError("This username handle is already taken. Please choose another.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await UpdateProfileApi({
        username: clean,
        bio: bio.trim(),
        avatar: selectedAvatarBg,
      });

      if (res?.success && res?.user) {
        localStorage.setItem("funchat_saved_username", res.user.username);
        localStorage.setItem("funchat_profile_name", res.user.username);
        window.dispatchEvent(new Event("profileNameChanged"));

        setSuccessMsg("Profile updated successfully!");
        toastMessage("Profile updated successfully!", "success");

        // Keep local auth token active while updating user session
        const currentToken = localStorage.getItem("funchat_token") || localStorage.getItem("funchat_user_token");
        if (currentToken) {
          login(currentToken, res.user);
        }
      } else {
        setError(res?.message || "Failed to update profile.");
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

  const initialLetter = username
    ? username.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : "U";

  return (
    <>
      <SEO
        title="My Profile - FunChat"
        description="Manage your FunChat handle, bio, avatar, and account settings."
      />

      <Box
        sx={{
          minHeight: "calc(100vh - 100px)",
          pt: { xs: 9, sm: 11 },
          pb: { xs: 8, sm: 10 },
          position: "relative",
          background: "radial-gradient(ellipse at 50% 0%, #0f172a 0%, #090d16 100%)",
        }}
      >
        {/* Background Ambient Glow Effects */}
        <Box
          sx={{
            position: "absolute",
            top: "5%",
            left: "50%",
            transform: "translateX(-50%)",
            width: { xs: "360px", sm: "750px" },
            height: { xs: "300px", sm: "450px" },
            background:
              "radial-gradient(ellipse, rgba(99, 102, 241, 0.22) 0%, rgba(168, 85, 247, 0.12) 45%, rgba(15, 23, 42, 0) 75%)",
            filter: "blur(70px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, rgba(15, 23, 42, 0) 70%)",
            filter: "blur(80px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          {/* Cover Header Banner Card */}
          <Paper
            elevation={0}
            sx={{
              mb: 3.5,
              borderRadius: { xs: "24px", sm: "32px" },
              overflow: "hidden",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.95) 100%)",
              backdropFilter: "blur(28px)",
              border: "1px solid rgba(129, 140, 248, 0.25)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.12)",
              position: "relative",
            }}
          >
            {/* Top Gradient Banner Art */}
            <Box
              sx={{
                height: { xs: "120px", sm: "160px" },
                background: selectedAvatarBg,
                position: "relative",
                overflow: "hidden",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(15, 23, 42, 0.8) 100%)",
                },
              }}
            >
              {/* Decorative Mesh Overlay */}
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
                  backgroundSize: "20px 20px",
                  opacity: 0.6,
                }}
              />
              <Chip
                icon={<SparklesIcon sx={{ fontSize: "14px !important", color: "#fef08a !important" }} />}
                label="Pro Member"
                size="small"
                sx={{
                  position: "absolute",
                  top: 16,
                  right: 16,
                  zIndex: 2,
                  background: "rgba(15, 23, 42, 0.65)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(254, 240, 138, 0.4)",
                  color: "#fef08a",
                  fontWeight: 800,
                  fontSize: "11px",
                  letterSpacing: "0.5px",
                }}
              />
            </Box>

            {/* Profile Avatar Header Bar */}
            <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: 3, pt: 0, mt: { xs: -5, sm: -6.5 }, position: "relative" }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "center", sm: "flex-end" }}
                justifyContent="space-between"
                spacing={2}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  alignItems={{ xs: "center", sm: "flex-end" }}
                  spacing={{ xs: 1.5, sm: 2.5 }}
                >
                  {/* Large Avatar Container */}
                  <Box sx={{ position: "relative" }}>
                    <Avatar
                      sx={{
                        width: { xs: 90, sm: 110 },
                        height: { xs: 90, sm: 110 },
                        background: selectedAvatarBg,
                        fontSize: { xs: "36px", sm: "44px" },
                        fontWeight: 800,
                        border: "4px solid #0f172a",
                        boxShadow: "0 12px 35px rgba(0, 0, 0, 0.6), 0 0 25px rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      {initialLetter}
                    </Avatar>
                    {/* Live Online Indicator */}
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 6,
                        right: 6,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: "#22c55e",
                        border: "3px solid #0f172a",
                        boxShadow: "0 0 10px #22c55e",
                      }}
                    />
                  </Box>

                  {/* User Name & Handle Badge */}
                  <Box sx={{ textAlign: { xs: "center", sm: "left" } }}>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      justifyContent={{ xs: "center", sm: "flex-start" }}
                    >
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 800,
                          color: "#fff",
                          fontSize: { xs: "1.4rem", sm: "1.75rem" },
                          letterSpacing: "-0.5px",
                        }}
                      >
                        @{username || "username"}
                      </Typography>
                      <VerifiedUserIcon sx={{ color: "#818cf8", fontSize: 20 }} />
                    </Stack>
                    <Typography
                      variant="body2"
                      sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "13px", fontWeight: 500 }}
                    >
                      {user?.email || "Live FunChat Account"}
                    </Typography>
                  </Box>
                </Stack>

                {/* Sign Out Button */}
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
                  onClick={() => {
                    logout();
                    toastMessage("Signed out successfully", "info");
                    navigate("/");
                  }}
                  sx={{
                    borderRadius: "14px",
                    borderColor: "rgba(239, 68, 68, 0.35)",
                    color: "#f87171",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: "13px",
                    px: 2.2,
                    py: 0.9,
                    backdropFilter: "blur(8px)",
                    "&:hover": {
                      background: "rgba(239, 68, 68, 0.15)",
                      borderColor: "#ef4444",
                    },
                  }}
                >
                  Sign Out
                </Button>
              </Stack>

              {/* Stat Chips Bar */}
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  mt: 3,
                  pt: 2,
                  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                  overflowX: "auto",
                  pb: 0.5,
                }}
              >
                <Chip
                  icon={<CheckCircleRoundedIcon sx={{ fontSize: "15px !important", color: "#4ade80 !important" }} />}
                  label="Verified Member"
                  size="small"
                  sx={{
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.28)",
                    color: "#86efac",
                    fontWeight: 700,
                    fontSize: "11.5px",
                  }}
                />
                <Chip
                  icon={<BoltIcon sx={{ fontSize: "15px !important", color: "#a5b4fc !important" }} />}
                  label={`Auth: ${user?.authProvider || "Email OTP"}`}
                  size="small"
                  sx={{
                    background: "rgba(99, 102, 241, 0.12)",
                    border: "1px solid rgba(99, 102, 241, 0.28)",
                    color: "#c7d2fe",
                    fontWeight: 700,
                    fontSize: "11.5px",
                    textTransform: "uppercase",
                  }}
                />
                <Chip
                  icon={<ShieldOutlinedIcon sx={{ fontSize: "15px !important", color: "#38bdf8 !important" }} />}
                  label="Protected Profile"
                  size="small"
                  sx={{
                    background: "rgba(56, 189, 248, 0.12)",
                    border: "1px solid rgba(56, 189, 248, 0.28)",
                    color: "#7dd3fc",
                    fontWeight: 700,
                    fontSize: "11.5px",
                  }}
                />
              </Stack>
            </Box>
          </Paper>

          {/* Alert Banners */}
          {error && (
            <Fade in>
              <Alert
                severity="error"
                onClose={() => setError(null)}
                sx={{
                  mb: 3,
                  borderRadius: "16px",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "#fca5a5",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  "& .MuiAlert-icon": { color: "#f87171" },
                }}
              >
                {error}
              </Alert>
            </Fade>
          )}

          {successMsg && (
            <Fade in>
              <Alert
                severity="success"
                onClose={() => setSuccessMsg(null)}
                sx={{
                  mb: 3,
                  borderRadius: "16px",
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.35)",
                  color: "#86efac",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  "& .MuiAlert-icon": { color: "#4ade80" },
                }}
              >
                {successMsg}
              </Alert>
            </Fade>
          )}

          {/* Navigation Tabs */}
          <Paper
            elevation={0}
            sx={{
              mb: 3,
              borderRadius: "20px",
              background: "rgba(30, 41, 59, 0.7)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              p: 0.8,
            }}
          >
            <Tabs
              value={tabIndex}
              onChange={(e, val) => setTabIndex(val)}
              variant="fullWidth"
              sx={{
                minHeight: "44px",
                "& .MuiTabs-indicator": {
                  background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                  height: "3px",
                  borderRadius: "3px",
                },
                "& .MuiTab-root": {
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: { xs: "12.5px", sm: "14px" },
                  color: "rgba(255, 255, 255, 0.6)",
                  minHeight: "44px",
                  borderRadius: "14px",
                  transition: "all 0.2s ease",
                  "&.Mui-selected": {
                    color: "#fff",
                    background: "rgba(99, 102, 241, 0.15)",
                  },
                  "&:hover": {
                    color: "#fff",
                    background: "rgba(255, 255, 255, 0.05)",
                  },
                },
              }}
            >
              <Tab icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Public Identity" />
              <Tab icon={<SecurityIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Account & Security" />
              <Tab icon={<ColorLensOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="App Experience" />
            </Tabs>
          </Paper>

          {/* TAB CONTENT PANELS */}
          {tabIndex === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 4 },
                borderRadius: { xs: "24px", sm: "32px" },
                background: "linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
                color: "#fff",
              }}
            >
              <Box component="form" onSubmit={handleSaveProfile}>
                {/* Section Title */}
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                  <AlternateEmailIcon sx={{ color: "#818cf8", fontSize: 22 }} />
                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff" }}>
                    Edit Unique Handle
                  </Typography>
                </Stack>

                {/* Username Handle Field */}
                <Box sx={{ mb: 3.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.85)", fontWeight: 700, fontSize: "13px" }}>
                      Unique Username (@handle)
                    </Typography>

                    {/* Status Badge */}
                    {usernameStatus === "checking" && (
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <CircularProgress size={12} sx={{ color: "#818cf8" }} />
                        <Typography sx={{ fontSize: "11.5px", color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Checking availability...</Typography>
                      </Stack>
                    )}
                    {usernameStatus === "available" && (
                      <Chip
                        label="✓ Available Handle"
                        size="small"
                        sx={{
                          height: "22px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "rgba(34, 197, 94, 0.15)",
                          color: "#4ade80",
                          border: "1px solid rgba(34, 197, 94, 0.35)",
                          px: 0.5,
                        }}
                      />
                    )}
                    {usernameStatus === "taken" && (
                      <Chip
                        label="✕ Already Taken"
                        size="small"
                        sx={{
                          height: "22px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          px: 0.5,
                        }}
                      />
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: `1.5px solid ${
                        usernameStatus === "available"
                          ? "rgba(34, 197, 94, 0.5)"
                          : usernameStatus === "taken"
                          ? "rgba(239, 68, 68, 0.5)"
                          : "rgba(255, 255, 255, 0.15)"
                      }`,
                      borderRadius: "16px",
                      p: "10px 14px 10px 18px",
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:focus-within": {
                        borderColor:
                          usernameStatus === "available"
                            ? "#4ade80"
                            : usernameStatus === "taken"
                            ? "#f87171"
                            : "#818cf8",
                        background: "rgba(255, 255, 255, 0.08)",
                        boxShadow: "0 0 25px rgba(99, 102, 241, 0.25)",
                      },
                    }}
                  >
                    <Typography sx={{ color: "#818cf8", fontWeight: 800, fontSize: "16px", mr: 1, selectUser: "none" }}>
                      @
                    </Typography>
                    <Box
                      component="input"
                      type="text"
                      required
                      placeholder="e.g. alex_developer"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={loading}
                      sx={{
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "#fff",
                        fontSize: "15px",
                        fontWeight: 700,
                        width: "100%",
                        "&::placeholder": { color: "rgba(255, 255, 255, 0.3)" },
                      }}
                    />

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
                        py: 0.7,
                        px: 1.6,
                        borderRadius: "12px",
                        background: "rgba(99, 102, 241, 0.2)",
                        border: "1px solid rgba(99, 102, 241, 0.4)",
                        color: "#c7d2fe",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        textTransform: "none",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s ease",
                        "&:hover": {
                          background: "rgba(99, 102, 241, 0.35)",
                          borderColor: "#818cf8",
                          color: "#fff",
                        },
                      }}
                    >
                      AI Suggest
                    </Button>
                  </Box>

                  {/* AI Suggestions Chip Bar */}
                  {suggestions.length > 0 && (
                    <Box
                      sx={{
                        mt: 1.8,
                        p: 1.8,
                        borderRadius: "16px",
                        background: "rgba(99, 102, 241, 0.08)",
                        border: "1px dashed rgba(99, 102, 241, 0.3)",
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mb: 1.2 }}>
                        <SparklesIcon sx={{ fontSize: 16, color: "#818cf8" }} />
                        <Typography sx={{ fontSize: "12px", fontWeight: 700, color: "#a5b4fc" }}>
                          Suggested available handles (click to choose):
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {suggestions.map((sugg) => (
                          <Chip
                            key={sugg}
                            label={`@${sugg}`}
                            size="small"
                            onClick={() => handleSelectSuggestion(sugg)}
                            clickable
                            sx={{
                              height: "28px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background:
                                username === sugg
                                  ? "linear-gradient(135deg, #6366f1, #3b82f6)"
                                  : "rgba(255, 255, 255, 0.06)",
                              border: `1px solid ${
                                username === sugg ? "#818cf8" : "rgba(255, 255, 255, 0.15)"
                              }`,
                              color: username === sugg ? "#fff" : "rgba(255, 255, 255, 0.85)",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                background: "rgba(99, 102, 241, 0.3)",
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

                {/* Avatar Preset Theme Picker */}
                <Box sx={{ mb: 3.5 }}>
                  <Typography variant="caption" sx={{ display: "block", color: "rgba(255, 255, 255, 0.85)", fontWeight: 700, fontSize: "13px", mb: 1 }}>
                    Avatar Color Theme
                  </Typography>
                  <Grid container spacing={1.5}>
                    {AVATAR_PRESETS.map((preset, idx) => {
                      const isSelected = selectedAvatarBg === preset;
                      return (
                        <Grid item xs={4} sm={2} key={idx}>
                          <Box
                            onClick={() => setSelectedAvatarBg(preset)}
                            sx={{
                              height: "44px",
                              borderRadius: "14px",
                              background: preset,
                              cursor: "pointer",
                              border: isSelected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.1)",
                              boxShadow: isSelected ? "0 0 16px rgba(99, 102, 241, 0.6)" : "none",
                              transform: isSelected ? "scale(1.05)" : "scale(1)",
                              transition: "all 0.2s ease",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              "&:hover": {
                                transform: "scale(1.05)",
                                borderColor: "rgba(255, 255, 255, 0.6)",
                              },
                            }}
                          >
                            {isSelected && (
                              <CheckCircleRoundedIcon sx={{ color: "#fff", fontSize: 20 }} />
                            )}
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>



                {/* Save Submit Button */}
                <Button
                  type="submit"
                  fullWidth
                  disabled={loading || !username.trim() || usernameStatus === "taken"}
                  startIcon={loading ? null : <SaveIcon />}
                  sx={{
                    py: 1.6,
                    borderRadius: "16px",
                    background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3b82f6 100%)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: "15px",
                    textTransform: "none",
                    boxShadow: "0 12px 35px rgba(99, 102, 241, 0.4)",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #2563eb 100%)",
                      boxShadow: "0 15px 40px rgba(99, 102, 241, 0.55)",
                      transform: "translateY(-1px)",
                    },
                    "&:disabled": {
                      opacity: 0.5,
                      color: "rgba(255,255,255,0.5)",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={24} sx={{ color: "#fff" }} />
                  ) : (
                    "Save Profile Changes"
                  )}
                </Button>
              </Box>
            </Paper>
          )}

          {/* TAB 1: ACCOUNT & SECURITY */}
          {tabIndex === 1 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 4 },
                borderRadius: { xs: "24px", sm: "32px" },
                background: "linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
                color: "#fff",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <ShieldOutlinedIcon sx={{ color: "#38bdf8", fontSize: 22 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff" }}>
                  Account Security & Verification
                </Typography>
              </Stack>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: "20px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
                      REGISTERED EMAIL
                    </Typography>
                    <Typography sx={{ color: "#fff", fontSize: "15px", fontWeight: 700, mt: 0.5, wordBreak: "break-all" }}>
                      {user?.email || "Not Provided"}
                    </Typography>
                    <Chip
                      label="Email Verified"
                      size="small"
                      sx={{
                        mt: 1.2,
                        height: "22px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: "rgba(34, 197, 94, 0.15)",
                        color: "#4ade80",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: "20px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                    }}
                  >
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px" }}>
                      AUTHENTICATION METHOD
                    </Typography>
                    <Typography sx={{ color: "#a5b4fc", fontSize: "15px", fontWeight: 700, mt: 0.5, textTransform: "uppercase" }}>
                      {user?.authProvider || "Email OTP Login"}
                    </Typography>
                    <Chip
                      label="Passwordless Security"
                      size="small"
                      sx={{
                        mt: 1.2,
                        height: "22px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: "rgba(99, 102, 241, 0.15)",
                        color: "#c7d2fe",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                      }}
                    />
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Box
                    sx={{
                      p: 3,
                      borderRadius: "20px",
                      background: "rgba(56, 189, 248, 0.06)",
                      border: "1px solid rgba(56, 189, 248, 0.2)",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                      <LockOutlinedIcon sx={{ color: "#38bdf8", fontSize: 20 }} />
                      <Typography sx={{ fontWeight: 700, fontSize: "14px", color: "#fff" }}>
                        Encrypted & Private Session
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.6 }}>
                      Your account uses JWT token authentication with SSL encryption. Username handle updates sync across all active chat sessions in real-time.
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          {/* TAB 2: APP EXPERIENCE */}
          {tabIndex === 2 && (
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 4 },
                borderRadius: { xs: "24px", sm: "32px" },
                background: "linear-gradient(180deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
                color: "#fff",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
                <BoltIcon sx={{ color: "#f59e0b", fontSize: 22 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff" }}>
                  Quick App Shortcuts
                </Typography>
              </Stack>

              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate("/chat")}
                    sx={{
                      p: 3,
                      borderRadius: "20px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      "&:hover": {
                        background: "rgba(99, 102, 241, 0.15)",
                        borderColor: "#818cf8",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <ChatBubbleOutlineIcon sx={{ fontSize: 28, color: "#818cf8", mb: 1 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#fff" }}>
                      Start Random Chat
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", display: "block", mt: 0.5 }}>
                      Connect instantly with online users matching your profile.
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate("/community")}
                    sx={{
                      p: 3,
                      borderRadius: "20px",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                      transition: "all 0.25s ease",
                      "&:hover": {
                        background: "rgba(236, 72, 153, 0.15)",
                        borderColor: "#ec4899",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <GroupsIcon sx={{ fontSize: 28, color: "#ec4899", mb: 1 }} />
                    <Typography sx={{ fontWeight: 800, fontSize: "16px", color: "#fff" }}>
                      Explore Group Communities
                    </Typography>
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", display: "block", mt: 0.5 }}>
                      Join public & private group channels with your handle.
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Container>
      </Box>
    </>
  );
}
