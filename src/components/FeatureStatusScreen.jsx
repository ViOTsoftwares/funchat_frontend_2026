import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  Chip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import GroupsIcon from "@mui/icons-material/Groups";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import SparklesIcon from "@mui/icons-material/AutoAwesome";

const FEATURE_META = {
  chat: {
    name: "Anonymous Text Chat",
    shortName: "Text Chat",
    icon: <ChatBubbleOutlineIcon sx={{ fontSize: 36 }} />,
    color: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
    glow: "rgba(99, 102, 241, 0.35)",
    highlights: [
      "Sub-50ms instant stranger pairing",
      "End-to-end encrypted messaging",
      "Rich animated stickers & reaction emojis",
    ],
  },
  video: {
    name: "HD Video Chat",
    shortName: "Video Chat",
    icon: <VideocamOutlinedIcon sx={{ fontSize: 36 }} />,
    color: "#f43f5e",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #ec4899 100%)",
    glow: "rgba(244, 63, 94, 0.35)",
    highlights: [
      "Ultra-crisp 1080p WebRTC peer-to-peer streams",
      "Adaptive bitrate for smooth low-latency calls",
      "Instant camera & mic hardware toggle controls",
    ],
  },
  community: {
    name: "FunChat Communities",
    shortName: "Communities",
    icon: <GroupsIcon sx={{ fontSize: 36 }} />,
    color: "#8b5cf6",
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)",
    glow: "rgba(139, 92, 246, 0.35)",
    highlights: [
      "Topic-based public & interest group rooms",
      "Live member participant indicators",
      "Media sharing and rich community chats",
    ],
  },
};

export default function FeatureStatusScreen({
  feature = "chat",
  status = "coming_soon",
  featureControl = {},
}) {
  const navigate = useNavigate();
  const [notified, setNotified] = useState(false);
  const meta = FEATURE_META[feature] || FEATURE_META.chat;
  const isMaintenance = status === "maintenance";

  const otherFeatures = Object.keys(FEATURE_META).filter((k) => k !== feature);

  return (
    <Container
      maxWidth="md"
      sx={{
        py: { xs: 2.5, sm: 4, md: 6 },
        px: { xs: 1.5, sm: 3, md: 4 },
        position: "relative",
        zIndex: 10,
        minHeight: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Background ambient orbs */}
      <Box
        sx={{
          position: "absolute",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
          width: { xs: 280, sm: 400, md: 540 },
          height: { xs: 280, sm: 400, md: 540 },
          background: isMaintenance
            ? "radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, rgba(245, 158, 11, 0) 70%)"
            : `radial-gradient(circle, ${meta.glow} 0%, rgba(99, 102, 241, 0) 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <Paper
        elevation={0}
        sx={{
          position: "relative",
          zIndex: 1,
          p: { xs: 2.5, sm: 4, md: 5 },
          my: { xs: 1, sm: 2 },
          borderRadius: { xs: "20px", sm: "28px", md: "32px" },
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.7))",
          border: isMaintenance
            ? "1px solid rgba(245, 158, 11, 0.3)"
            : "1px solid rgba(139, 92, 246, 0.3)",
          backdropFilter: "blur(28px)",
          boxShadow: isMaintenance
            ? "0 25px 60px -15px rgba(245, 158, 11, 0.2), 0 0 30px rgba(245, 158, 11, 0.1)"
            : "0 25px 60px -15px rgba(99, 102, 241, 0.25), 0 0 30px rgba(139, 92, 246, 0.12)",
          color: "#fff",
          textAlign: "center",
        }}
      >
        {/* Back Button */}
        <Box sx={{ display: "flex", justifyContent: "flex-start", mb: { xs: 2, sm: 3 } }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate("/")}
            sx={{
              color: "rgba(255, 255, 255, 0.75)",
              background: "rgba(255, 255, 255, 0.06)",
              borderRadius: "12px",
              px: { xs: 1.5, sm: 2 },
              py: 0.7,
              textTransform: "none",
              fontWeight: 600,
              fontSize: { xs: "12px", sm: "13px" },
              border: "1px solid rgba(255, 255, 255, 0.08)",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.12)",
                color: "#fff",
                transform: "translateX(-2px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Back to Home
          </Button>
        </Box>

        {/* Big Feature & Status Icon */}
        <Box sx={{ position: "relative", display: "inline-block", mb: 3 }}>
          <Box
            sx={{
              width: { xs: 80, sm: 96 },
              height: { xs: 80, sm: 96 },
              borderRadius: "28px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: meta.gradient,
              color: "#fff",
              boxShadow: `0 16px 36px ${meta.glow}`,
              margin: "0 auto",
              animation: "pulse 3s infinite ease-in-out",
              "@keyframes pulse": {
                "0%, 100%": { transform: "scale(1)" },
                "50%": { transform: "scale(1.05)" },
              },
            }}
          >
            {meta.icon}
          </Box>

          {/* Micro Status Badge overlapping the icon */}
          <Box
            sx={{
              position: "absolute",
              bottom: -6,
              right: -6,
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: isMaintenance
                ? "linear-gradient(135deg, #f59e0b, #d97706)"
                : "linear-gradient(135deg, #8b5cf6, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              border: "3px solid #0f172a",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            {isMaintenance ? (
              <BuildCircleIcon sx={{ fontSize: 18 }} />
            ) : (
              <RocketLaunchIcon sx={{ fontSize: 18 }} />
            )}
          </Box>
        </Box>

        {/* Status Chip */}
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={
              isMaintenance ? (
                <BuildCircleIcon sx={{ fontSize: "16px !important", color: "#fef08a !important" }} />
              ) : (
                <SparklesIcon sx={{ fontSize: "16px !important", color: "#f5d0fe !important" }} />
              )
            }
            label={isMaintenance ? "SCHEDULED MAINTENANCE" : "FEATURE COMING SOON"}
            sx={{
              background: isMaintenance
                ? "rgba(245, 158, 11, 0.18)"
                : "rgba(139, 92, 246, 0.18)",
              border: isMaintenance
                ? "1px solid rgba(245, 158, 11, 0.45)"
                : "1px solid rgba(139, 92, 246, 0.45)",
              color: isMaintenance ? "#fde047" : "#e9d5ff",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "1px",
              px: 1.5,
              py: 2,
              borderRadius: "16px",
            }}
          />
        </Box>

        {/* Main Headline */}
        <Typography
          variant="h3"
          sx={{
            fontWeight: 800,
            fontSize: { xs: "1.75rem", sm: "2.35rem", md: "2.75rem" },
            lineHeight: 1.2,
            mb: 2,
            background: isMaintenance
              ? "linear-gradient(135deg, #ffffff 30%, #fde047 100%)"
              : "linear-gradient(135deg, #ffffff 30%, #c084fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {isMaintenance
            ? `${meta.shortName} is currently under maintenance`
            : `${meta.shortName} is launching very soon!`}
        </Typography>

        {/* Description */}
        <Typography
          sx={{
            maxWidth: 580,
            mx: "auto",
            mb: 4,
            fontSize: { xs: "14px", sm: "16px" },
            lineHeight: 1.65,
            color: "rgba(255, 255, 255, 0.72)",
          }}
        >
          {isMaintenance
            ? `We're performing scheduled infrastructure upgrades and speed optimizations on ${meta.name}. Everything will be restored shortly. Thank you for your patience!`
            : `We are crafting a next-generation ${meta.name} experience with ultrafast performance and privacy. This feature will go live in our upcoming release.`}
        </Typography>

        {/* Feature Highlights Card */}
        <Box
          sx={{
            maxWidth: 520,
            mx: "auto",
            mb: 4,
            p: { xs: 2.5, sm: 3 },
            borderRadius: "20px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            textAlign: "left",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              display: "block",
              fontWeight: 700,
              color: isMaintenance ? "#fde047" : "#c084fc",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontSize: "11px",
              mb: 1.5,
            }}
          >
            What to expect
          </Typography>
          <Stack spacing={1.5}>
            {meta.highlights.map((item, idx) => (
              <Stack key={idx} direction="row" spacing={1.5} alignItems="center">
                <CheckCircleOutlineIcon
                  sx={{
                    fontSize: 18,
                    color: isMaintenance ? "#fbbf24" : "#a855f7",
                    flexShrink: 0,
                  }}
                />
                <Typography sx={{ fontSize: "14px", color: "rgba(255, 255, 255, 0.85)" }}>
                  {item}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Primary CTA button: Notify me / Refresh */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="center"
          alignItems="center"
          sx={{ mb: 4 }}
        >
          {!isMaintenance && (
            <Button
              variant="contained"
              size="large"
              startIcon={notified ? <CheckCircleOutlineIcon /> : <NotificationsActiveIcon />}
              onClick={() => setNotified(true)}
              disabled={notified}
              sx={{
                px: 3.5,
                py: 1.5,
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "15px",
                textTransform: "none",
                background: notified
                  ? "linear-gradient(135deg, #10b981, #059669) !important"
                  : meta.gradient,
                boxShadow: notified
                  ? "0 10px 25px rgba(16, 185, 129, 0.35)"
                  : `0 10px 25px ${meta.glow}`,
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: `0 14px 30px ${meta.glow}`,
                },
                transition: "all 0.2s ease",
              }}
            >
              {notified ? "You're on the early-access list!" : "Notify Me When Live"}
            </Button>
          )}

          <Button
            variant="outlined"
            size="large"
            onClick={() => navigate("/")}
            sx={{
              px: 3.5,
              py: 1.5,
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: "15px",
              textTransform: "none",
              color: "#fff",
              borderColor: "rgba(255, 255, 255, 0.25)",
              background: "rgba(255, 255, 255, 0.05)",
              "&:hover": {
                borderColor: "#fff",
                background: "rgba(255, 255, 255, 0.12)",
                transform: "translateY(-2px)",
              },
              transition: "all 0.2s ease",
            }}
          >
            Explore Other Features
          </Button>
        </Stack>

        {/* Quick jump pills to other active features */}
        {otherFeatures.length > 0 && (
          <Box sx={{ pt: 3, borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "rgba(255, 255, 255, 0.5)",
                fontWeight: 600,
                letterSpacing: "0.5px",
                mb: 2,
              }}
            >
              TRY OUR OTHER LIVE PLATFORMS
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
              {otherFeatures.map((key) => {
                const otherMeta = FEATURE_META[key];
                const otherStatus = featureControl[key] ?? "live";
                const isOtherLive = otherStatus === "live";

                return (
                  <Button
                    key={key}
                    onClick={() => navigate(key === "community" ? "/community" : `/${key}`)}
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      "&:hover": {
                        background: "rgba(255, 255, 255, 0.12)",
                        borderColor: otherMeta.color,
                        transform: "translateY(-1px)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", color: otherMeta.color }}>
                      {React.cloneElement(otherMeta.icon, { sx: { fontSize: 18 } })}
                    </Box>
                    <span>{otherMeta.name}</span>
                    {isOtherLive ? (
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#22c55e",
                          boxShadow: "0 0 8px #22c55e",
                        }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        label={otherStatus === "coming_soon" ? "Soon" : "Maint"}
                        sx={{
                          height: 18,
                          fontSize: "10px",
                          fontWeight: 700,
                          background: otherStatus === "coming_soon" ? "rgba(139, 92, 246, 0.3)" : "rgba(245, 158, 11, 0.3)",
                          color: otherStatus === "coming_soon" ? "#e9d5ff" : "#fde047",
                        }}
                      />
                    )}
                  </Button>
                );
              })}
            </Stack>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
