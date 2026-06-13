import { Box, Button, Stack, Typography } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import StarOutlinedIcon from "@mui/icons-material/StarOutlined";

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
    title: "End-to-End Secure",
    desc: "Military-grade encryption on every message and video stream. No logs, ever.",
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

export default function LandingPage({ status, onStartChat, onStartVideo }) {
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
            onClick={onStartChat}
          >
            Start Text Chat
          </Button>
          <Button
            id="lp-start-video-btn"
            size="large"
            variant="outlined"
            className="lp-btn-secondary"
            startIcon={<VideocamOutlinedIcon />}
            onClick={onStartVideo}
          >
            Start Video Chat
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
            onClick={onStartChat}
          >
            Start Text Chat
          </Button>
          <Button
            id="lp-bottom-video-btn"
            size="large"
            variant="outlined"
            className="lp-btn-secondary"
            startIcon={<VideocamOutlinedIcon />}
            onClick={onStartVideo}
          >
            Start Video Chat
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
