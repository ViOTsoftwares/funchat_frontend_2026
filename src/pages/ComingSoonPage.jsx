import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import SendIcon from "@mui/icons-material/Send";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import GroupsIcon from "@mui/icons-material/Groups";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { toastMessage } from "../lib/toast.message.js";

export default function ComingSoonPage({ featureName = "FunChat Next-Gen" }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  // Live Countdown Timer logic
  const [timeLeft, setTimeLeft] = useState({
    days: 4,
    hours: 18,
    minutes: 42,
    seconds: 15,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toastMessage("Please enter a valid email address!", "warning");
      return;
    }
    setSubscribed(true);
    toastMessage("🎉 You've been added to the VIP early-access list!", "success");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 20%, #1e1b4b 0%, #0f172a 60%, #090d16 100%)",
        color: "#fff",
        py: { xs: 4, md: 8 },
        px: { xs: 2, sm: 3 },
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Ambient Glowing Orbs */}
      <Box
        sx={{
          position: "absolute",
          top: "-15%",
          left: "20%",
          width: "500px",
          height: "500px",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(99, 102, 241, 0) 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          bottom: "-10%",
          right: "15%",
          width: "450px",
          height: "450px",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0) 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="md" sx={{ position: "relative", zIndex: 2 }}>
        {/* Top Bar: Back to Home */}
        <Box sx={{ mb: { xs: 3, sm: 4 }, display: "flex", justifyContent: "flex-start" }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
            sx={{
              color: "rgba(255, 255, 255, 0.8)",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "14px",
              px: 2.5,
              py: 1,
              textTransform: "none",
              fontWeight: 600,
              backdropFilter: "blur(12px)",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.15)",
                transform: "translateX(-3px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Back to Home
          </Button>
        </Box>

        {/* Main Hero Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5, md: 6 },
            borderRadius: { xs: "24px", sm: "32px" },
            background: "linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(32px)",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.4), 0 0 40px rgba(99, 102, 241, 0.15)",
            textAlign: "center",
          }}
        >
          {/* Animated Rocket Icon */}
          <Box
            sx={{
              width: { xs: 80, sm: 96 },
              height: { xs: 80, sm: 96 },
              mx: "auto",
              mb: 3,
              borderRadius: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)",
              boxShadow: "0 16px 40px rgba(168, 85, 247, 0.4)",
              animation: "floatRocket 3s ease-in-out infinite",
              "@keyframes floatRocket": {
                "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
                "50%": { transform: "translateY(-8px) rotate(3deg)" },
              },
            }}
          >
            <RocketLaunchIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: "#fff" }} />
          </Box>

          {/* Badge */}
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: "16px !important", color: "#f5d0fe !important" }} />}
            label="SOMETHING BIG IS COMING"
            sx={{
              mb: 2.5,
              px: 2,
              py: 2.2,
              borderRadius: "16px",
              background: "rgba(168, 85, 247, 0.18)",
              border: "1px solid rgba(168, 85, 247, 0.4)",
              color: "#f5d0fe",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "1.5px",
            }}
          />

          {/* Main Title */}
          <Typography
            variant="h2"
            sx={{
              fontWeight: 900,
              fontSize: { xs: "2rem", sm: "3rem", md: "3.5rem" },
              lineHeight: 1.15,
              mb: 2,
              background: "linear-gradient(135deg, #ffffff 30%, #c084fc 70%, #f472b6 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {featureName} is Launching Soon
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "rgba(255, 255, 255, 0.72)",
              fontSize: { xs: "14px", sm: "16.5px" },
              lineHeight: 1.7,
              maxWidth: 620,
              mx: "auto",
              mb: 4,
            }}
          >
            We are engineering an extraordinary next-generation communication experience with sub-50ms latency, zero logs, and crystal-clear WebRTC media streams.
          </Typography>

          {/* Live Progress Bar */}
          <Box sx={{ maxWidth: 540, mx: "auto", mb: 5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "#c084fc", fontWeight: 700, letterSpacing: "1px" }}>
                DEVELOPMENT PROGRESS
              </Typography>
              <Typography variant="caption" sx={{ color: "#86efac", fontWeight: 800 }}>
                88% COMPLETE
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={88}
              sx={{
                height: 10,
                borderRadius: 5,
                background: "rgba(255, 255, 255, 0.08)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  background: "linear-gradient(90deg, #6366f1, #a855f7, #ec4899)",
                },
              }}
            />
          </Box>

          {/* Live Countdown Timer Grid */}
          <GridContainer>
            {[
              { label: "DAYS", value: timeLeft.days },
              { label: "HOURS", value: timeLeft.hours },
              { label: "MINUTES", value: timeLeft.minutes },
              { label: "SECONDS", value: timeLeft.seconds },
            ].map((unit, idx) => (
              <Box
                key={idx}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: "20px",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  minWidth: { xs: 70, sm: 90 },
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    fontSize: { xs: "1.8rem", sm: "2.5rem" },
                    color: "#fff",
                    lineHeight: 1,
                  }}
                >
                  {String(unit.value).padStart(2, "0")}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255, 255, 255, 0.5)",
                    fontWeight: 700,
                    fontSize: "11px",
                    letterSpacing: "1px",
                    mt: 1,
                    display: "block",
                  }}
                >
                  {unit.label}
                </Typography>
              </Box>
            ))}
          </GridContainer>

          {/* Email Subscription Form */}
          <Box
            component="form"
            onSubmit={handleSubscribe}
            sx={{
              maxWidth: 500,
              mx: "auto",
              mt: 5,
              mb: 4,
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "18px",
              p: "6px 8px 6px 18px",
              transition: "all 0.2s ease",
              "&:focus-within": {
                borderColor: "#a855f7",
                boxShadow: "0 0 24px rgba(168, 85, 247, 0.3)",
              },
            }}
          >
            <input
              type="email"
              placeholder={subscribed ? "✓ You're on the VIP list!" : "Enter your email for early access..."}
              disabled={subscribed}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={subscribed}
              startIcon={subscribed ? <CheckCircleOutlineIcon /> : <SendIcon />}
              sx={{
                borderRadius: "14px",
                px: 3,
                py: 1.2,
                fontWeight: 700,
                fontSize: "14px",
                textTransform: "none",
                flexShrink: 0,
                background: subscribed
                  ? "linear-gradient(135deg, #10b981, #059669) !important"
                  : "linear-gradient(135deg, #6366f1, #a855f7)",
                boxShadow: "0 8px 20px rgba(99, 102, 241, 0.35)",
              }}
            >
              {subscribed ? "Joined" : "Notify Me"}
            </Button>
          </Box>

          {/* Teaser Badges */}
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ gap: 1.5 }}>
            <Chip icon={<ShieldOutlinedIcon sx={{ color: "#86efac !important" }} />} label="Zero Log Guarantee" sx={{ background: "rgba(34, 197, 94, 0.1)", color: "#86efac" }} />
            <Chip icon={<ChatBubbleOutlineIcon sx={{ color: "#93c5fd !important" }} />} label="Anonymous Pairing" sx={{ background: "rgba(59, 130, 246, 0.1)", color: "#93c5fd" }} />
            <Chip icon={<VideocamOutlinedIcon sx={{ color: "#fca5a5 !important" }} />} label="Ultra HD WebRTC" sx={{ background: "rgba(239, 68, 68, 0.1)", color: "#fca5a5" }} />
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}

function GridContainer({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: { xs: 1.5, sm: 2.5 },
        justifyContent: "center",
        flexWrap: "wrap",
      }}
    >
      {children}
    </Box>
  );
}
