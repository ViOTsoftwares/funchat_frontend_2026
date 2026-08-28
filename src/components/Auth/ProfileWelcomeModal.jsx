import React, { useState, useEffect } from "react";
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
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import SparklesIcon from "@mui/icons-material/AutoAwesome";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import { CheckUsernameApi, SaveUsernameApi } from "../../Api.js";
import { toastMessage } from "../../lib/toast.message.js";

export default function ProfileWelcomeModal({ open, onClose, onSaveSuccess }) {
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize with existing saved username if available
  useEffect(() => {
    if (open) {
      const existing =
        localStorage.getItem("funchat_saved_username") ||
        localStorage.getItem("funchat_profile_name") ||
        "";
      if (existing && existing !== "Stranger") {
        setUsername(existing);
      } else {
        setUsername("");
      }
      setError(null);
      setUsernameStatus(null);
      setSuggestions([]);
    }
  }, [open]);

  // Debounced live username availability check
  useEffect(() => {
    if (!open) return;
    const clean = username.trim();
    if (!clean || clean.length < 2) {
      setUsernameStatus(null);
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
  }, [username, open]);

  // Fetch username suggestions
  const handleFetchSuggestions = async (e) => {
    if (e) e.preventDefault();
    setSuggestLoading(true);
    setError(null);
    try {
      const seed = username || "user";
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

  // Handle Save Unique Username to DB & LocalStorage
  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    const clean = username.trim();
    if (!clean) {
      setError("Please enter a username.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await SaveUsernameApi({ username: clean });
      if (res?.success) {
        const finalUsername = res.username || clean;
        localStorage.setItem("funchat_saved_username", finalUsername);
        localStorage.setItem("funchat_profile_name", finalUsername);
        localStorage.setItem("funchat_profile_popup_seen", "true");
        window.dispatchEvent(new Event("profileNameChanged"));

        toastMessage(`Profile setup complete! Welcome @${finalUsername}`, "success");
        if (onSaveSuccess) onSaveSuccess(finalUsername);
        if (onClose) onClose();
      } else {
        setError(res?.message || "Failed to save username. Please choose another.");
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

  return (
    <Dialog
      open={Boolean(open)}
      onClose={() => {
        localStorage.setItem("funchat_profile_popup_seen", "true");
        if (onClose) onClose();
      }}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          background: "linear-gradient(180deg, #10172a 0%, #090d16 100%)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: { xs: "24px", sm: "28px" },
          boxShadow:
            "0 25px 75px rgba(0, 0, 0, 0.85), 0 0 50px rgba(99, 102, 241, 0.15)",
          color: "#fff",
          overflow: "hidden",
          p: 0,
          position: "relative",
          maxWidth: { xs: "calc(100vw - 32px)", sm: "440px" },
          mx: "auto",
        },
      }}
    >
      {/* Dynamic ambient lights */}
      <Box
        sx={{
          position: "absolute",
          top: "-60px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "320px",
          height: "160px",
          background:
            "radial-gradient(ellipse, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 75%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Close Button */}
      <Tooltip title="Close">
        <IconButton
          onClick={() => {
            localStorage.setItem("funchat_profile_popup_seen", "true");
            if (onClose) onClose();
          }}
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

      <DialogContent sx={{ p: { xs: 3, sm: 3.5 }, position: "relative", zIndex: 2 }}>
        {/* Header Icon */}
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 58,
              height: 58,
              borderRadius: "20px",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              boxShadow: "0 12px 30px rgba(99, 102, 241, 0.45)",
              color: "#fff",
              mb: 1.5,
            }}
          >
            <SparklesIcon sx={{ fontSize: 32 }} />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.35rem", sm: "1.5rem" },
              letterSpacing: "-0.5px",
              color: "#fff",
            }}
          >
            Choose Your Handle
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "rgba(255, 255, 255, 0.65)",
              fontSize: "13px",
              mt: 0.8,
              lineHeight: 1.45,
              maxWidth: "340px",
              mx: "auto",
            }}
          >
            Create a unique handle for your profile. This will be saved to your account and pre-filled when you log in!
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

        {/* Profile Input Form */}
        <Box component="form" onSubmit={handleSaveProfile}>
          <Box sx={{ mb: 2.5 }}>
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
                Unique Username
              </Typography>

              {/* Status Badge */}
              {usernameStatus === "checking" && (
                <Stack direction="row" spacing={0.6} alignItems="center">
                  <CircularProgress size={10} sx={{ color: "#818cf8" }} />
                  <Typography sx={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>
                    Checking...
                  </Typography>
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
                    border: "1px solid rgba(34, 197, 94, 0.35)",
                    px: 0.6,
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
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    px: 0.6,
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
                p: "8px 10px 8px 14px",
                transition: "all 0.2s ease",
                "&:focus-within": {
                  borderColor:
                    usernameStatus === "available"
                      ? "#4ade80"
                      : usernameStatus === "taken"
                      ? "#f87171"
                      : "#818cf8",
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
                autoFocus
                placeholder="e.g. alex_vibe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                sx={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 600,
                  width: "100%",
                  "&::placeholder": { color: "rgba(255, 255, 255, 0.35)" },
                }}
              />

              {/* Suggest button */}
              <Tooltip title="Auto-generate available username ideas">
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
                    background: "rgba(99, 102, 241, 0.18)",
                    border: "1px solid rgba(99, 102, 241, 0.35)",
                    color: "#c7d2fe",
                    fontSize: "11px",
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
              </Tooltip>
            </Box>

            {/* Suggestions Chips */}
            {suggestions.length > 0 && (
              <Box
                sx={{
                  mt: 1.4,
                  p: 1.2,
                  borderRadius: "14px",
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px dashed rgba(99, 102, 241, 0.28)",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mb: 0.8 }}>
                  <AutoAwesomeIcon sx={{ fontSize: 13, color: "#818cf8" }} />
                  <Typography sx={{ fontSize: "11px", fontWeight: 700, color: "#a5b4fc" }}>
                    Select an available handle:
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

          {/* Action Button */}
          <Button
            type="submit"
            fullWidth
            disabled={loading || !username.trim() || usernameStatus === "taken"}
            sx={{
              py: 1.5,
              borderRadius: "14px",
              background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #d946ef 100%)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "14px",
              textTransform: "none",
              boxShadow: "0 10px 25px rgba(99, 102, 241, 0.35)",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #c026d3 100%)",
                boxShadow: "0 12px 30px rgba(99, 102, 241, 0.5)",
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
              "Save Profile & Continue"
            )}
          </Button>

          {/* Security badge footer */}
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="center"
            sx={{ mt: 2.5, pt: 2, borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <ShieldOutlinedIcon sx={{ fontSize: 14, color: "#818cf8" }} />
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
              Unique database handle • Auto pre-filled on login
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
