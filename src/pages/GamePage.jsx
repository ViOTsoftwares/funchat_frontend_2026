import { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import CoinRushPage from "./CoinRushPage.jsx";

import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  Chip,
  Grid,
} from "@mui/material";

import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import GroupsIcon from "@mui/icons-material/Groups";
import TimerIcon from "@mui/icons-material/Timer";

const GAMES_LIST = [
  {
    id: "coin-rush",
    title: "Coin Rush",
    subtitle: "Real-time top-down coin collecting arena",
    description: "Battle 2–8 players in a 60-second frenzy! Collect coins, grab power-ups (⚡ Speed, 🪙 Double Coins, 🧲 Magnet), and climb the live scoreboard!",
    status: "LIVE",
    players: "2–8 Players",
    duration: "60s Rounds",
    badge: "🟢 LIVE NOW",
    color: "linear-gradient(135deg, #f59e0b, #ec4899)",
    icon: EmojiEventsIcon,
  },
  {
    id: "laser-tag",
    title: "Laser Tag Arena",
    subtitle: "Tactical multiplayer laser battles",
    description: "Duck behind walls, aim your lasers, and tag opponent players to earn score multipliers in a fast-paced futuristic arena.",
    status: "SOON",
    players: "2–4 Players",
    duration: "90s Rounds",
    badge: "⚡ COMING SOON",
    color: "linear-gradient(135deg, #6366f1, #3b82f6)",
    icon: SportsEsportsIcon,
  },
  {
    id: "pixel-tanks",
    title: "Pixel Tank Mayhem",
    subtitle: "Retro arcade tank destruction",
    description: "Drive customizable pixel tanks, dodge bouncing shells, drop mines, and outsmart rival commanders.",
    status: "SOON",
    players: "2–6 Players",
    duration: "2 min Rounds",
    badge: "🛠️ IN DEVELOPMENT",
    color: "linear-gradient(135deg, #10b981, #14b8a6)",
    icon: FlashOnIcon,
  },
];

export default function GamePage({ socketRef, socketId, status }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();

  // Determine active game from URL route parameter (e.g. /game/coin-rush)
  const isCoinRushRoute =
    gameId === "coin-rush" ||
    location.pathname === "/game/coin-rush" ||
    location.pathname === "/games/coin-rush" ||
    location.pathname === "/coin-rush";

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 9, sm: 11, md: 12 }, pb: 6 }}>
      {/* ── COIN RUSH GAME ARENA VIEW (WHEN ON /game/coin-rush) ── */}
      {isCoinRushRoute ? (
        <Box>
          <Stack className="coin-rush-sub-header" direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2, px: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Chip label="🟢 LIVE NOW" color="success" size="small" sx={{ fontWeight: 900, px: 1 }} />
              <Typography variant="h5" fontWeight={900} sx={{ color: "#0f172a" }}>
                🪙 Coin Rush Multiplayer
              </Typography>
            </Stack>

            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate("/game")}
              sx={{
                color: "#1e293b",
                borderColor: "rgba(15, 23, 42, 0.25)",
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 700,
                px: 2,
                "&:hover": {
                  borderColor: "#6366f1",
                  color: "#6366f1",
                  background: "rgba(99, 102, 241, 0.08)",
                },
              }}
            >
              ← Back to Games Directory
            </Button>
          </Stack>

          <CoinRushPage socketRef={socketRef} socketId={socketId} status={status} />
        </Box>
      ) : (
        /* ── GAMES DIRECTORY HUB ── */
        <Box>
          {/* ── GAMES HUB HEADER BANNER ── */}
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Stack direction="row" justifyContent="center" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
                }}
              >
                <SportsEsportsIcon sx={{ fontSize: 32, color: "#fff" }} />
              </Box>
              <Typography
                variant="h3"
                fontWeight={900}
                sx={{
                  background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                }}
              >
                Multiplayer Games Arcade
              </Typography>
            </Stack>

            <Typography variant="subtitle1" sx={{ color: "rgba(255, 255, 255, 0.75)", maxWidth: 620, mx: "auto", fontSize: "16px" }}>
              Play fast-paced real-time browser games directly with friends and online players. No downloads required!
            </Typography>
          </Box>

          <Grid container spacing={3.5} justifyContent="center">
            {GAMES_LIST.map((game) => {
              const IconComp = game.icon;
              const isLive = game.status === "LIVE";

              return (
                <Grid item xs={12} sm={6} md={4} key={game.id}>
                  <Paper
                    elevation={0}
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      p: 3.5,
                      borderRadius: "28px",
                      background: "rgba(15, 23, 42, 0.85)",
                      backdropFilter: "blur(20px)",
                      border: isLive ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: isLive ? "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.15)" : "0 15px 40px rgba(0, 0, 0, 0.4)",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: isLive ? "0 25px 60px rgba(245, 158, 11, 0.3)" : "0 20px 40px rgba(0,0,0,0.6)",
                      },
                    }}
                  >
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "18px",
                            background: game.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
                          }}
                        >
                          <IconComp sx={{ fontSize: 30, color: "#fff" }} />
                        </Box>

                        <Chip
                          label={game.badge}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "11px",
                            color: isLive ? "#fde047" : "#a5b4fc",
                            background: isLive ? "rgba(245, 158, 11, 0.2)" : "rgba(99, 102, 241, 0.2)",
                            border: isLive ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(99, 102, 241, 0.3)",
                          }}
                        />
                      </Stack>

                      <Typography variant="h5" fontWeight={900} sx={{ color: "#fff", mb: 0.5 }}>
                        {game.title}
                      </Typography>

                      <Typography variant="caption" fontWeight={700} sx={{ color: "#818cf8", mb: 1.5, display: "block" }}>
                        {game.subtitle}
                      </Typography>

                      <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.75)", mb: 3, minHeight: 60, lineHeight: 1.6 }}>
                        {game.description}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mb: 3.5 }}>
                        <Chip icon={<GroupsIcon sx={{ fontSize: 16 }} />} label={game.players} size="small" sx={{ background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 800 }} />
                        <Chip icon={<TimerIcon sx={{ fontSize: 16 }} />} label={game.duration} size="small" sx={{ background: "rgba(255,255,255,0.06)", color: "#fff", fontWeight: 800 }} />
                      </Stack>
                    </Box>

                    <Button
                      fullWidth
                      size="large"
                      variant={isLive ? "contained" : "outlined"}
                      disabled={!isLive}
                      startIcon={<PlayArrowIcon />}
                      onClick={() => navigate(`/game/${game.id}`)}
                      sx={{
                        borderRadius: "16px",
                        fontWeight: 800,
                        py: 1.4,
                        textTransform: "none",
                        fontSize: "15px",
                        background: isLive ? "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)" : "transparent",
                        boxShadow: isLive ? "0 10px 30px rgba(245, 158, 11, 0.4)" : "none",
                        "&:hover": {
                          background: isLive ? "linear-gradient(135deg, #d97706 0%, #db2777 100%)" : "transparent",
                        },
                      }}
                    >
                      {isLive ? "Play Coin Rush Now" : "Coming Soon"}
                    </Button>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
    </Container>
  );
}
