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

import { useAuth } from "../context/AuthContext.jsx";
import { CheckUsernameApi, UpdateProfileApi } from "../Api.js";
import { toastMessage } from "../lib/toast.message.js";
import SEO from "../components/SEO.jsx";

const AVATAR_PRESETS = [
  "linear-gradient(135deg, #6366f1, #3b82f6)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
  "linear-gradient(135deg, #10b981, #06b6d4)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #ec4899, #8b5cf6)",
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, login } = useAuth();

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
        const currentToken = localStorage.getItem("funchat_token");
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
          minHeight: "calc(100vh - 120px)",
          pt: { xs: 10, sm: 12 },
          pb: { xs: 8, sm: 10 },
          position: "relative",
        }}
      >
        {/* Background Ambient Glows */}
        <Box
          sx={{
            position: "absolute",
            top: "15%",
            left: "50%",
            transform: "translateX(-50%)",
            width: { xs: "320px", sm: "600px" },
            height: { xs: "280px", sm: "400px" },
            background:
              "radial-gradient(ellipse, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.12) 50%, rgba(15, 23, 42, 0) 75%)",
            filter: "blur(60px)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          {/* Main Card */}
          <Paper
            elevation={0}
            sx={{
              background: "linear-gradient(180deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.95) 100%)",
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
            {/* Header Title */}
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
              sx={{ mb: 4 }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    <BadgeOutlinedIcon sx={{ fontSize: 14 }} />
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#818cf8", textTransform: "uppercase", fontSize: "11.5px", letterSpacing: "1px" }}>
                    Account Settings
                  </Typography>
                </Stack>
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.6rem", sm: "2rem" },
                    letterSpacing: "-0.5px",
                    color: "#fff",
                  }}
                >
                  My User Profile
                </Typography>
              </Box>

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
                  borderRadius: "12px",
                  borderColor: "rgba(239, 68, 68, 0.35)",
                  color: "#f87171",
                  textTransform: "none",
                  fontWeight: 600,
                  px: 2,
                  py: 0.8,
                  "&:hover": {
                    background: "rgba(239, 68, 68, 0.12)",
                    borderColor: "#ef4444",
                  },
                }}
              >
                Sign Out
              </Button>
            </Stack>

            {/* Alert Banner */}
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

            {successMsg && (
              <Fade in>
                <Alert
                  severity="success"
                  onClose={() => setSuccessMsg(null)}
                  sx={{
                    mb: 3,
                    borderRadius: "14px",
                    background: "rgba(34, 197, 94, 0.12)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    color: "#86efac",
                    fontSize: "13px",
                    "& .MuiAlert-icon": { color: "#4ade80" },
                  }}
                >
                  {successMsg}
                </Alert>
              </Fade>
            )}

            <Grid container spacing={4}>
              {/* Left Column: Avatar & Account Badge Card */}
              <Grid item xs={12} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: "20px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    textAlign: "center",
                  }}
                >
                  {/* Large Avatar */}
                  <Avatar
                    sx={{
                      width: 90,
                      height: 90,
                      mx: "auto",
                      mb: 2,
                      background: selectedAvatarBg,
                      fontSize: "36px",
                      fontWeight: 800,
                      boxShadow: "0 12px 30px rgba(99, 102, 241, 0.4)",
                      border: "3px solid rgba(255,255,255,0.2)",
                    }}
                  >
                    {initialLetter}
                  </Avatar>

                  <Typography variant="h6" sx={{ fontWeight: 800, color: "#fff", mb: 0.5 }}>
                    @{username || "username"}
                  </Typography>

                  <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center" sx={{ mb: 2 }}>
                    <CheckCircleRoundedIcon sx={{ fontSize: 15, color: "#4ade80" }} />
                    <Typography variant="caption" sx={{ color: "#4ade80", fontWeight: 700, fontSize: "11.5px" }}>
                      Verified Member
                    </Typography>
                  </Stack>

                  {/* Avatar Color Preset Selector */}
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, display: "block", mb: 1 }}>
                    Choose Avatar Theme
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="center">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <Box
                        key={idx}
                        onClick={() => setSelectedAvatarBg(preset)}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          background: preset,
                          cursor: "pointer",
                          border: selectedAvatarBg === preset ? "2px solid #fff" : "2px solid transparent",
                          transform: selectedAvatarBg === preset ? "scale(1.15)" : "scale(1)",
                          transition: "all 0.2s ease",
                          "&:hover": { transform: "scale(1.15)" },
                        }}
                      />
                    ))}
                  </Stack>
                </Paper>

                {/* Account Details Box */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    mt: 2.5,
                    borderRadius: "20px",
                    background: "rgba(99, 102, 241, 0.06)",
                    border: "1px solid rgba(99, 102, 241, 0.2)",
                  }}
                >
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600 }}>
                        EMAIL ADDRESS
                      </Typography>
                      <Typography sx={{ color: "#fff", fontSize: "13px", fontWeight: 600, wordBreak: "break-all" }}>
                        {user?.email || "N/A"}
                      </Typography>
                    </Box>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                    <Box>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600 }}>
                        AUTH PROVIDER
                      </Typography>
                      <Typography sx={{ color: "#a5b4fc", fontSize: "13px", fontWeight: 600, textTransform: "uppercase" }}>
                        {user?.authProvider || "Email OTP"}
                      </Typography>
                    </Box>

                    <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

                    <Box>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px", fontWeight: 600 }}>
                        STATUS
                      </Typography>
                      <Chip
                        label="Active Account"
                        size="small"
                        sx={{
                          mt: 0.4,
                          height: "22px",
                          fontSize: "11px",
                          fontWeight: 700,
                          background: "rgba(34, 197, 94, 0.15)",
                          color: "#4ade80",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                        }}
                      />
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Right Column: Edit Profile Form */}
              <Grid item xs={12} md={8}>
                <Box component="form" onSubmit={handleSaveProfile}>
                  {/* Username Handle Field */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 600, fontSize: "12.5px" }}>
                        Username Handle (@unique)
                      </Typography>

                      {/* Status Badge */}
                      {usernameStatus === "checking" && (
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <CircularProgress size={11} sx={{ color: "#818cf8" }} />
                          <Typography sx={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>Checking...</Typography>
                        </Stack>
                      )}
                      {usernameStatus === "available" && (
                        <Chip
                          label="✓ Available"
                          size="small"
                          sx={{
                            height: "20px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            background: "rgba(34, 197, 94, 0.15)",
                            color: "#4ade80",
                            border: "1px solid rgba(34, 197, 94, 0.3)",
                            px: 0.5,
                          }}
                        />
                      )}
                      {usernameStatus === "taken" && (
                        <Chip
                          label="✕ Taken"
                          size="small"
                          sx={{
                            height: "20px",
                            fontSize: "10.5px",
                            fontWeight: 700,
                            background: "rgba(239, 68, 68, 0.15)",
                            color: "#f87171",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            px: 0.5,
                          }}
                        />
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: `1px solid ${
                          usernameStatus === "available"
                            ? "rgba(34, 197, 94, 0.45)"
                            : usernameStatus === "taken"
                            ? "rgba(239, 68, 68, 0.45)"
                            : "rgba(255, 255, 255, 0.15)"
                        }`,
                        borderRadius: "14px",
                        p: "10px 12px 10px 16px",
                        transition: "all 0.2s ease",
                        "&:focus-within": {
                          borderColor:
                            usernameStatus === "available"
                              ? "#4ade80"
                              : usernameStatus === "taken"
                              ? "#f87171"
                              : "#818cf8",
                          background: "rgba(255, 255, 255, 0.08)",
                          boxShadow: "0 0 24px rgba(99, 102, 241, 0.25)",
                        },
                      }}
                    >
                      <PersonOutlineIcon sx={{ color: "rgba(255, 255, 255, 0.45)", fontSize: 20, mr: 1.5 }} />
                      <Box
                        component="input"
                        type="text"
                        required
                        placeholder="e.g. alex_dev"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={loading}
                        sx={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "#fff",
                          fontSize: "15px",
                          fontWeight: 600,
                          width: "100%",
                          "&::placeholder": { color: "rgba(255, 255, 255, 0.35)" },
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
                          py: 0.6,
                          px: 1.4,
                          borderRadius: "10px",
                          background: "rgba(99, 102, 241, 0.18)",
                          border: "1px solid rgba(99, 102, 241, 0.35)",
                          color: "#c7d2fe",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "none",
                          whiteSpace: "nowrap",
                          "&:hover": {
                            background: "rgba(99, 102, 241, 0.35)",
                            borderColor: "#818cf8",
                            color: "#fff",
                          },
                        }}
                      >
                        Suggest
                      </Button>
                    </Box>

                    {/* Suggestions list */}
                    {suggestions.length > 0 && (
                      <Box
                        sx={{
                          mt: 1.4,
                          p: 1.4,
                          borderRadius: "14px",
                          background: "rgba(99, 102, 241, 0.08)",
                          border: "1px dashed rgba(99, 102, 241, 0.28)",
                        }}
                      >
                        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 1 }}>
                          <AutoAwesomeIcon sx={{ fontSize: 14, color: "#818cf8" }} />
                          <Typography sx={{ fontSize: "11.5px", fontWeight: 700, color: "#a5b4fc" }}>
                            Suggested available handles:
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

                  {/* Bio Field */}
                  <Box sx={{ mb: 3.5 }}>
                    <Typography variant="caption" sx={{ display: "block", color: "rgba(255, 255, 255, 0.8)", fontWeight: 600, fontSize: "12.5px", mb: 0.8 }}>
                      Bio / About You
                    </Typography>
                    <Box
                      sx={{
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "14px",
                        p: "12px 16px",
                        transition: "all 0.2s ease",
                        "&:focus-within": {
                          borderColor: "#818cf8",
                          background: "rgba(255, 255, 255, 0.08)",
                          boxShadow: "0 0 24px rgba(99, 102, 241, 0.25)",
                        },
                      }}
                    >
                      <Box
                        component="textarea"
                        rows={4}
                        placeholder="Tell others a little bit about yourself..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        disabled={loading}
                        sx={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "#fff",
                          fontSize: "14px",
                          fontFamily: "inherit",
                          width: "100%",
                          resize: "vertical",
                          "&::placeholder": { color: "rgba(255, 255, 255, 0.35)" },
                        }}
                      />
                    </Box>
                  </Box>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    fullWidth
                    disabled={loading || !username.trim() || usernameStatus === "taken"}
                    sx={{
                      py: 1.6,
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 50%, #3b82f6 100%)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: "15px",
                      textTransform: "none",
                      boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 50%, #2563eb 100%)",
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
                      "Save Profile Changes"
                    )}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
