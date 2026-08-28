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
  LinearProgress,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import RefreshIcon from "@mui/icons-material/Refresh";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SpeedIcon from "@mui/icons-material/Speed";
import StorageIcon from "@mui/icons-material/Storage";
import HubIcon from "@mui/icons-material/Hub";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import { toastMessage } from "../lib/toast.message.js";

export default function MaintenancePage({ featureName = "FunChat Systems" }) {
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshCheck = () => {
    setRefreshing(true);
    toastMessage("Checking latest server maintenance status...", "info");
    setTimeout(() => {
      setRefreshing(false);
      toastMessage("Systems are currently still undergoing scheduled updates.", "warning");
    }, 1200);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 20%, #291e07 0%, #0f172a 60%, #090d16 100%)",
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
      {/* Ambient Gold & Amber Glowing Orbs */}
      <Box
        sx={{
          position: "absolute",
          top: "-10%",
          left: "25%",
          width: "480px",
          height: "480px",
          background: "radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(245, 158, 11, 0) 70%)",
          filter: "blur(80px)",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="md" sx={{ position: "relative", zIndex: 2 }}>
        {/* Back to Home Button */}
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

        {/* Main Maintenance Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, sm: 5, md: 6 },
            borderRadius: { xs: "24px", sm: "32px" },
            background: "linear-gradient(145deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02))",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            backdropFilter: "blur(32px)",
            boxShadow: "0 30px 80px rgba(0, 0, 0, 0.4), 0 0 40px rgba(245, 158, 11, 0.15)",
            textAlign: "center",
          }}
        >
          {/* Animated Maintenance Gear Icon */}
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
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
              boxShadow: "0 16px 40px rgba(245, 158, 11, 0.4)",
              animation: "spinGear 12s linear infinite",
              "@keyframes spinGear": {
                "0%": { transform: "rotate(0deg)" },
                "100%": { transform: "rotate(360deg)" },
              },
            }}
          >
            <BuildCircleIcon sx={{ fontSize: { xs: 40, sm: 48 }, color: "#fff" }} />
          </Box>

          {/* Maintenance Badge */}
          <Chip
            icon={<BuildCircleIcon sx={{ fontSize: "16px !important", color: "#fef08a !important" }} />}
            label="SCHEDULED SYSTEM MAINTENANCE"
            sx={{
              mb: 2.5,
              px: 2,
              py: 2.2,
              borderRadius: "16px",
              background: "rgba(245, 158, 11, 0.18)",
              border: "1px solid rgba(245, 158, 11, 0.45)",
              color: "#fef08a",
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
              fontSize: { xs: "2rem", sm: "2.8rem", md: "3.2rem" },
              lineHeight: 1.15,
              mb: 2,
              background: "linear-gradient(135deg, #ffffff 30%, #fde047 70%, #f59e0b 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {featureName} Under Maintenance
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "rgba(255, 255, 255, 0.75)",
              fontSize: { xs: "14px", sm: "16px" },
              lineHeight: 1.7,
              maxWidth: 600,
              mx: "auto",
              mb: 4,
            }}
          >
            We are performing essential server maintenance, database indexing, and WebRTC streaming security patches to deliver faster speeds. Services will return live shortly!
          </Typography>

          {/* Live Progress Bar */}
          <Box sx={{ maxWidth: 540, mx: "auto", mb: 5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: "#fde047", fontWeight: 700, letterSpacing: "1px" }}>
                UPGRADE STATUS
              </Typography>
              <Typography variant="caption" sx={{ color: "#86efac", fontWeight: 800 }}>
                92% COMPLETED — ~15 MINS REMAINING
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={92}
              sx={{
                height: 10,
                borderRadius: 5,
                background: "rgba(255, 255, 255, 0.08)",
                "& .MuiLinearProgress-bar": {
                  borderRadius: 5,
                  background: "linear-gradient(90deg, #f59e0b, #eab308, #22c55e)",
                },
              }}
            />
          </Box>

          {/* System Nodes Status Grid */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            sx={{ mb: 5, maxWidth: 640, mx: "auto" }}
          >
            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: "18px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                textAlign: "left",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <StorageIcon sx={{ color: "#fde047", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#fff" }}>
                  Database Engine
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "#86efac", fontWeight: 600, display: "block" }}>
                ✓ Indexing Complete
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: "18px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                textAlign: "left",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <HubIcon sx={{ color: "#fde047", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#fff" }}>
                  WebSocket Cluster
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "#fde047", fontWeight: 600, display: "block" }}>
                ⏳ Patching Nodes
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                p: 2,
                borderRadius: "18px",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                textAlign: "left",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <SpeedIcon sx={{ color: "#fde047", fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#fff" }}>
                  WebRTC Media
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: "#86efac", fontWeight: 600, display: "block" }}>
                ✓ Ultra HD Ready
              </Typography>
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            justifyContent="center"
            alignItems="center"
          >
            <Button
              variant="contained"
              size="large"
              disabled={refreshing}
              startIcon={<RefreshIcon className={refreshing ? "animate-spin" : ""} />}
              onClick={handleRefreshCheck}
              sx={{
                px: 3.5,
                py: 1.5,
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "15px",
                textTransform: "none",
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                boxShadow: "0 10px 25px rgba(245, 158, 11, 0.35)",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 14px 30px rgba(245, 158, 11, 0.45)",
                },
                transition: "all 0.2s ease",
              }}
            >
              {refreshing ? "Checking Status..." : "Check Live Status"}
            </Button>

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
              Back to Home
            </Button>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
