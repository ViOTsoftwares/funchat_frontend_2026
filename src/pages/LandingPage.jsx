import { useState, useEffect } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";
import EditIcon from "@mui/icons-material/Edit";
import GroupsIcon from "@mui/icons-material/Groups";
import { useAuth } from "../context/AuthContext.jsx";
import AdBanner from "../components/AdBanner.jsx";
import AdPopup from "../components/AdPopup.jsx";
import ProfileWelcomeModal from "../components/Auth/ProfileWelcomeModal.jsx";
import { toastMessage } from "../lib/toast.message.js";

const STATS = [
  { value: "12K+", label: "Active Users" },
  { value: "99.9%", label: "Uptime" },
  { value: "<50ms", label: "Latency" },
  { value: "256-bit", label: "Encryption" },
];

const FEATURES = [
  {
    icon: <BoltOutlinedIcon sx={{ fontSize: 22 }} />,
    title: "Instant Matching",
    desc: "Get paired with a live stranger in under 3 seconds — no waiting, no queues.",
    accent: "#6366f1",
  },
  {
    icon: <ShieldOutlinedIcon sx={{ fontSize: 22 }} />,
    title: "End-to-End Encrypted",
    desc: "All text and video streams use WebRTC P2P with DTLS-SRTP encryption.",
    accent: "#06b6d4",
  },
  {
    icon: <VideocamOutlinedIcon sx={{ fontSize: 22 }} />,
    title: "HD Video Chat",
    desc: "Crystal-clear video powered by WebRTC with adaptive bitrate for any connection.",
    accent: "#8b5cf6",
  },
  {
    icon: <PeopleAltOutlinedIcon sx={{ fontSize: 22 }} />,
    title: "Smart Moderation",
    desc: "AI-powered filters and human review keep conversations safe and respectful.",
    accent: "#10b981",
  },
];

export default function LandingPage({
  status,
  onStartChat,
  onStartVideo,
  featureControl = {},
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profileName, setProfileName] = useState(
    user?.username || localStorage.getItem("funchat_profile_name") || "Stranger"
  );

  const [isProfileWelcomeOpen, setIsProfileWelcomeOpen] = useState(false);

  const chatStatus = featureControl.chat ?? "live";
  const videoStatus = featureControl.video ?? "live";
  const communityStatus = featureControl.community ?? "live";

  useEffect(() => {
    const seen = localStorage.getItem("funchat_profile_popup_seen");
    const saved = localStorage.getItem("funchat_saved_username");
    if (!seen && !saved && !user) {
      setIsProfileWelcomeOpen(true);
    }
  }, [user]);

  useEffect(() => {
    if (user?.username) {
      setProfileName(user.username);
    } else {
      setProfileName(localStorage.getItem("funchat_profile_name") || "Stranger");
    }
  }, [user]);

  useEffect(() => {
    const handleNameChange = () => {
      setProfileName(localStorage.getItem("funchat_profile_name") || "Stranger");
    };
    const handleOpenModal = () => {
      setIsProfileWelcomeOpen(true);
    };
    window.addEventListener("profileNameChanged", handleNameChange);
    window.addEventListener("openProfileWelcomeModal", handleOpenModal);
    return () => {
      window.removeEventListener("profileNameChanged", handleNameChange);
      window.removeEventListener("openProfileWelcomeModal", handleOpenModal);
    };
  }, []);

  const handleStartChatWithCheck = () => {
    const savedName =
      user?.username ||
      localStorage.getItem("funchat_saved_username") ||
      localStorage.getItem("funchat_profile_name");
    if (!savedName || savedName === "Stranger") {
      setIsProfileWelcomeOpen(true);
      toastMessage("Please choose a handle first to start chatting!", "warning");
      return;
    }
    if (onStartChat) onStartChat();
  };

  const handleStartVideoWithCheck = () => {
    const savedName =
      user?.username ||
      localStorage.getItem("funchat_saved_username") ||
      localStorage.getItem("funchat_profile_name");
    if (!savedName || savedName === "Stranger") {
      setIsProfileWelcomeOpen(true);
      toastMessage("Please choose a handle first to start video chat!", "warning");
      return;
    }
    if (onStartVideo) onStartVideo();
  };

  const getStatusBadge = (featStatus) => {
    if (featStatus === "coming_soon") {
      return (
        <Box
          component="span"
          sx={{
            ml: 1,
            fontSize: "10px",
            fontWeight: 800,
            px: 1,
            py: 0.25,
            borderRadius: "6px",
            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.5))",
            color: "#f5d0fe",
            border: "1px solid rgba(236, 72, 153, 0.5)",
            letterSpacing: "0.5px",
          }}
        >
          SOON 🚀
        </Box>
      );
    }
    if (featStatus === "maintenance") {
      return (
        <Box
          component="span"
          sx={{
            ml: 1,
            fontSize: "10px",
            fontWeight: 800,
            px: 1,
            py: 0.25,
            borderRadius: "6px",
            background: "rgba(245, 158, 11, 0.4)",
            color: "#fde047",
            border: "1px solid rgba(245, 158, 11, 0.6)",
            letterSpacing: "0.5px",
          }}
        >
          MAINT 🛠️
        </Box>
      );
    }
    return null;
  };

  return (
    <Box className="lp-root">
      {/* ── Animated background orbs ── */}
      <Box className="lp-orb lp-orb-1" />
      <Box className="lp-orb lp-orb-2" />
      <Box className="lp-orb lp-orb-3" />

      {/* ── HERO ── */}
      <Box className="lp-hero">
        {/* Badge */}
        <Box className="lp-badge">
          <StarOutlinedIcon sx={{ fontSize: 13, color: "#fbbf24" }} />
          <span>Rated #1 Anonymous Chat Platform 2026</span>
        </Box>

        {/* Headline */}
        <Typography variant="h1" className="lp-headline">
          Connect with the
          <br />
          <span className="lp-headline-gradient">World, Instantly.</span>
        </Typography>

        {/* Sub-headline */}
        <Typography className="lp-subheadline">
          Private one-to-one conversations with real people. Secure,
          anonymous, and beautifully designed for meaningful moments.
        </Typography>

        {/* CTA buttons */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} className="lp-cta-group">
          <Button
            id="lp-start-chat-btn"
            size="large"
            variant="contained"
            className="lp-btn-primary"
            startIcon={<ChatBubbleOutlineIcon />}
            onClick={handleStartChatWithCheck}
            sx={{
              ...(chatStatus === "coming_soon" && {
                background: "linear-gradient(135deg, #8b5cf6, #ec4899) !important",
              }),
              ...(chatStatus === "maintenance" && {
                background: "linear-gradient(135deg, #f59e0b, #d97706) !important",
              }),
            }}
          >
            <span>Start Text Chat</span>
            {getStatusBadge(chatStatus)}
          </Button>

          <Button
            id="lp-start-video-btn"
            size="large"
            variant="outlined"
            className="lp-btn-secondary"
            startIcon={<VideocamOutlinedIcon />}
            onClick={handleStartVideoWithCheck}
            sx={{
              ...(videoStatus === "coming_soon" && {
                borderColor: "rgba(139, 92, 246, 0.6) !important",
                color: "#c084fc !important",
              }),
              ...(videoStatus === "maintenance" && {
                borderColor: "rgba(245, 158, 11, 0.6) !important",
                color: "#fbbf24 !important",
              }),
            }}
          >
            <span>Start Video Chat</span>
            {getStatusBadge(videoStatus)}
          </Button>

          <Button
            id="lp-explore-communities-btn"
            size="large"
            variant="outlined"
            className="lp-btn-secondary"
            startIcon={<GroupsIcon />}
            onClick={() => navigate("/community")}
            sx={{
              borderColor:
                communityStatus === "coming_soon"
                  ? "rgba(139, 92, 246, 0.5) !important"
                  : communityStatus === "maintenance"
                  ? "rgba(245, 158, 11, 0.5) !important"
                  : "rgba(99, 102, 241, 0.4) !important",
              color:
                communityStatus === "coming_soon"
                  ? "#8b5cf6 !important"
                  : communityStatus === "maintenance"
                  ? "#d97706 !important"
                  : "#4f46e5 !important",
              background: "rgba(255, 255, 255, 0.6) !important",
              "&:hover": {
                background: "rgba(99, 102, 241, 0.07) !important",
                borderColor: "#4f46e5 !important",
                transform: "translateY(-2px) !important",
              },
            }}
          >
            <span>Explore Communities</span>
            {getStatusBadge(communityStatus)}
          </Button>
        </Stack>

        {/* Trust pills */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" className="lp-trust-row">
          {["No sign-up required", "100% anonymous", "Free forever"].map((t) => (
            <Box key={t} className="lp-trust-pill">
              <span className="lp-trust-dot" />
              {t}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ── STATS BAR ── */}
      <Box className="lp-stats-bar">
        {STATS.map((s) => (
          <Box key={s.label} className="lp-stat-item">
            <Typography className="lp-stat-value">{s.value}</Typography>
            <Typography className="lp-stat-label">{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* ── FEATURE CARDS ── */}
      <Box className="lp-features-section">
        <Box className="lp-section-label">Why FunChat?</Box>
        <Typography className="lp-section-title">
          Built for real connection
        </Typography>
        <Typography className="lp-section-sub">
          Every detail crafted for privacy, speed, and genuine human interaction.
        </Typography>

        <Box className="lp-features-grid">
          {FEATURES.map((f) => (
            <Box key={f.title} className="lp-feature-card" style={{ "--card-accent": f.accent }}>
              <Box className="lp-feature-icon" style={{ background: `${f.accent}18`, color: f.accent }}>
                {f.icon}
              </Box>
              <Typography className="lp-feature-title">{f.title}</Typography>
              <Typography className="lp-feature-desc">{f.desc}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── BOTTOM CTA BANNER ── */}
      <Box className="lp-bottom-cta">
        <Box className="lp-bottom-cta-glow" />
        <Typography className="lp-bottom-cta-title">
          Ready to meet someone new?
        </Typography>
        <Typography className="lp-bottom-cta-sub">
          Join thousands of people connecting right now — no account needed.
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" mt={4}>
          <Button
            id="lp-bottom-chat-btn"
            size="large"
            variant="contained"
            className="lp-btn-primary"
            startIcon={<ChatBubbleOutlineIcon />}
            onClick={handleStartChatWithCheck}
            sx={{
              ...(chatStatus === "coming_soon" && {
                background: "linear-gradient(135deg, #8b5cf6, #ec4899) !important",
              }),
              ...(chatStatus === "maintenance" && {
                background: "linear-gradient(135deg, #f59e0b, #d97706) !important",
              }),
            }}
          >
            <span>Start Text Chat</span>
            {getStatusBadge(chatStatus)}
          </Button>

          <Button
            id="lp-bottom-video-btn"
            size="large"
            variant="outlined"
            className="lp-btn-secondary"
            startIcon={<VideocamOutlinedIcon />}
            onClick={handleStartVideoWithCheck}
            sx={{
              ...(videoStatus === "coming_soon" && {
                borderColor: "rgba(139, 92, 246, 0.6) !important",
                color: "#c084fc !important",
              }),
              ...(videoStatus === "maintenance" && {
                borderColor: "rgba(245, 158, 11, 0.6) !important",
                color: "#fbbf24 !important",
              }),
            }}
          >
            <span>Start Video Chat</span>
            {getStatusBadge(videoStatus)}
          </Button>

          <Button
            id="lp-bottom-explore-communities-btn"
            size="large"
            variant="outlined"
            className="lp-btn-secondary"
            startIcon={<GroupsIcon />}
            onClick={() => navigate("/community")}
            sx={{
              borderColor:
                communityStatus === "coming_soon"
                  ? "rgba(139, 92, 246, 0.5) !important"
                  : communityStatus === "maintenance"
                  ? "rgba(245, 158, 11, 0.5) !important"
                  : "rgba(99, 102, 241, 0.35) !important",
              color:
                communityStatus === "coming_soon"
                  ? "#8b5cf6 !important"
                  : communityStatus === "maintenance"
                  ? "#d97706 !important"
                  : "#4f46e5 !important",
              background: "rgba(255, 255, 255, 0.7) !important",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.95) !important",
                borderColor: "#4f46e5 !important",
              },
            }}
          >
            <span>Explore Communities</span>
            {getStatusBadge(communityStatus)}
          </Button>
        </Stack>
      </Box>

      {/* ── SPONSOR / AD SECTION ── */}
      <Box sx={{ maxWidth: 640, mx: "auto", my: 5, px: 2 }}>
        <AdBanner placement="landing_featured" />
      </Box>

      {/* ── POPUP DIALOG AD ── */}
      <AdPopup placement="popup_interstitial" delayMs={4000} />

      {/* ── FIRST TIME PROFILE WELCOME POPUP ── */}
      <ProfileWelcomeModal
        open={isProfileWelcomeOpen}
        onClose={() => setIsProfileWelcomeOpen(false)}
        onSaveSuccess={(savedName) => setProfileName(savedName)}
      />
    </Box>
  );
}
