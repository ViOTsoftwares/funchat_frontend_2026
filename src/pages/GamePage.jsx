import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import CoinRushPage from "./CoinRushPage.jsx";
import LastRunnerPage from "./LastRunnerPage.jsx";
import { GetPublicGamesApi, GetPublicGameBySlugApi } from "../Api.js";

import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  Chip,
  Grid,
  CircularProgress,
} from "@mui/material";

import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import GroupsIcon from "@mui/icons-material/Groups";
import TimerIcon from "@mui/icons-material/Timer";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import LeaderboardWidget from "../components/LeaderboardWidget.jsx";

const FALLBACK_GAMES = [
  {
    slug: "last-runner",
    title: "Last Runner",
    subtitle: "1v1 Real-time Running Battle & Attack Arena",
    description:
      "Battle head-to-head in a fast-paced 3-lane race! Jump barriers, slide under obstacles, collect attack objects (Mud Ball 🥚, Ice Ball 🧊, Bomb 💣), and slow down your opponent to be the Last Runner standing!",
    status: "active",
    players: "1 vs 1 Battle",
    duration: "90s Max",
    badge: "🟢 LIVE NOW",
    color: "linear-gradient(135deg, #ef4444, #f59e0b)",
    icon: "DirectionsRun",
    maintenanceNotice:
      "Last Runner is temporarily undergoing scheduled maintenance and server performance upgrades. Check back shortly!",
    comingSoonNotice:
      "Last Runner is coming soon! Get ready to run, attack, and survive.",
  },
  {
    slug: "coin-rush",
    title: "Coin Rush",
    subtitle: "Real-time top-down coin collecting arena",
    description:
      "Battle 2–8 players in a 60-second frenzy! Collect coins, grab power-ups (⚡ Speed, 🪙 Double Coins, 🧲 Magnet), and climb the live scoreboard!",
    status: "active",
    players: "2–8 Players",
    duration: "60s Rounds",
    badge: "🟢 LIVE NOW",
    color: "linear-gradient(135deg, #f59e0b, #ec4899)",
    icon: "EmojiEvents",
    maintenanceNotice:
      "Coin Rush is temporarily undergoing scheduled maintenance. Please check back shortly!",
    comingSoonNotice:
      "Coin Rush 2.0 is coming soon with new maps and power-ups!",
  },
];

export default function GamePage({ socketRef, socketId, status: socketStatus }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();

  const [games, setGames] = useState(FALLBACK_GAMES);
  const [activeGameData, setActiveGameData] = useState(null);
  const [loadingGameStatus, setLoadingGameStatus] = useState(false);
  const [selectedHubLeaderboard, setSelectedHubLeaderboard] = useState("coin-rush");

  // Normalize current target game slug
  const targetSlug =
    gameId ||
    (location.pathname.startsWith("/game/")
      ? location.pathname.replace("/game/", "")
      : location.pathname.startsWith("/games/")
      ? location.pathname.replace("/games/", "")
      : location.pathname === "/last-runner"
      ? "last-runner"
      : location.pathname === "/coin-rush"
      ? "coin-rush"
      : null);

  const isGameRoute = Boolean(targetSlug && targetSlug !== "list");

  // Fetch games list from backend
  const loadGames = useCallback(async () => {
    try {
      const res = await GetPublicGamesApi();
      if (res.success && Array.isArray(res.result) && res.result.length > 0) {
        const removedSlugs = [
          "laser-tag",
          "pixel-tanks",
          "memory-match",
          "speed-racer",
          "tower-defence",
          "tower-defense",
        ];
        const activeGames = res.result.filter((g) => !removedSlugs.includes(g.slug));
        setGames(activeGames);
      }
    } catch (err) {
      console.warn("Could not load games list from API, using fallback", err);
    }
  }, []);

  // Fetch active game status
  const loadActiveGame = useCallback(async (slug) => {
    if (!slug) return;
    setLoadingGameStatus(true);
    try {
      const res = await GetPublicGameBySlugApi(slug);
      if (res.success && res.result) {
        setActiveGameData(res.result);
      } else {
        // Fallback to local list
        const found = FALLBACK_GAMES.find((g) => g.slug === slug);
        if (found) setActiveGameData(found);
      }
    } catch (err) {
      console.warn("Could not load game by slug, using fallback", err);
      const found = FALLBACK_GAMES.find((g) => g.slug === slug);
      if (found) setActiveGameData(found);
    } finally {
      setLoadingGameStatus(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  useEffect(() => {
    if (isGameRoute && targetSlug) {
      loadActiveGame(targetSlug);
    } else {
      setActiveGameData(null);
    }
  }, [isGameRoute, targetSlug, loadActiveGame]);

  // Listen to Socket.IO real-time game status updates from Admin Panel
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const onGameStatusUpdated = (updatedGame) => {
      if (!updatedGame?.slug) return;
      // Update in list
      setGames((prev) =>
        prev.map((g) => (g.slug === updatedGame.slug ? { ...g, ...updatedGame } : g))
      );
      // If currently on this game's page, update activeGameData
      if (targetSlug === updatedGame.slug) {
        setActiveGameData((prev) => ({ ...prev, ...updatedGame }));
      }
    };

    socket.on("game_status_updated", onGameStatusUpdated);
    return () => {
      socket.off("game_status_updated", onGameStatusUpdated);
    };
  }, [socketRef, targetSlug]);

  // Determine current active game status
  const currentGame =
    activeGameData ||
    games.find((g) => g.slug === targetSlug) ||
    FALLBACK_GAMES.find((g) => g.slug === targetSlug) ||
    null;

  const gameStatus = currentGame?.status || "active";

  const getIcon = (iconName) => {
    if (iconName === "EmojiEvents") return EmojiEventsIcon;
    if (iconName === "FlashOn") return FlashOnIcon;
    if (iconName === "DirectionsRun") return DirectionsRunIcon;
    return SportsEsportsIcon;
  };

  return (
    <Container maxWidth="xl" sx={{ pt: { xs: 9, sm: 11, md: 12 }, pb: 6 }}>
      {isGameRoute ? (
        <Box>
          {loadingGameStatus && !currentGame ? (
            <Box sx={{ textAlign: "center", py: 12 }}>
              <CircularProgress sx={{ color: "#6366f1" }} />
              <Typography sx={{ mt: 2, color: "rgba(255,255,255,0.7)" }}>
                Loading game status...
              </Typography>
            </Box>
          ) : gameStatus === "maintenance" ? (
            /* ═══════════════════════════════════════════════════════════════
               GAME MAINTENANCE PAGE VIEW
            ═══════════════════════════════════════════════════════════════ */
            <Paper
              elevation={0}
              sx={{
                maxWidth: 720,
                mx: "auto",
                mt: 4,
                p: { xs: 4, sm: 6 },
                borderRadius: "32px",
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(245, 158, 11, 0.15)",
                backdropFilter: "blur(20px)",
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: "24px",
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(245, 158, 11, 0.4)",
                  mb: 3,
                }}
              >
                <BuildCircleIcon sx={{ fontSize: 44, color: "#fff" }} />
              </Box>

              <Stack direction="row" justifyContent="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                  label="🛠️ UNDER MAINTENANCE"
                  color="warning"
                  size="small"
                  sx={{ fontWeight: 900, px: 1, fontSize: "11px" }}
                />
              </Stack>

              <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                  color: "#fff",
                  mb: 1.5,
                  fontSize: { xs: "1.5rem", sm: "2rem" },
                  letterSpacing: "-0.5px",
                }}
              >
                {currentGame?.title || "Game"} is Offline for Maintenance
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: "rgba(255, 255, 255, 0.85)",
                  maxWidth: 540,
                  mx: "auto",
                  mb: 4,
                  lineHeight: 1.7,
                  fontSize: { xs: "14px", sm: "16px" },
                  p: 2.5,
                  borderRadius: "16px",
                  background: "rgba(245, 158, 11, 0.08)",
                  border: "1px solid rgba(245, 158, 11, 0.2)",
                }}
              >
                {currentGame?.maintenanceNotice ||
                  "This game is currently undergoing scheduled maintenance and multiplayer server performance upgrades. We will be back online shortly!"}
              </Typography>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="center"
                spacing={2}
              >
                <Button
                  variant="contained"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/game")}
                  sx={{
                    borderRadius: "16px",
                    fontWeight: 800,
                    px: 3.5,
                    py: 1.2,
                    textTransform: "none",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    boxShadow: "0 10px 25px rgba(99, 102, 241, 0.35)",
                  }}
                >
                  Back to Games Arcade
                </Button>

                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => loadActiveGame(targetSlug)}
                  sx={{
                    borderRadius: "16px",
                    fontWeight: 700,
                    px: 3,
                    py: 1.2,
                    color: "rgba(255, 255, 255, 0.8)",
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "#f59e0b",
                      color: "#f59e0b",
                      background: "rgba(245, 158, 11, 0.08)",
                    },
                  }}
                >
                  Check Status Again
                </Button>
              </Stack>
            </Paper>
          ) : gameStatus === "coming_soon" ? (
            /* ═══════════════════════════════════════════════════════════════
               GAME COMING SOON PAGE VIEW
            ═══════════════════════════════════════════════════════════════ */
            <Paper
              elevation={0}
              sx={{
                maxWidth: 720,
                mx: "auto",
                mt: 4,
                p: { xs: 4, sm: 6 },
                borderRadius: "32px",
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(99, 102, 241, 0.4)",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.15)",
                backdropFilter: "blur(20px)",
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  width: 76,
                  height: 76,
                  borderRadius: "24px",
                  background: "linear-gradient(135deg, #6366f1, #ec4899)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)",
                  mb: 3,
                }}
              >
                <RocketLaunchIcon sx={{ fontSize: 42, color: "#fff" }} />
              </Box>

              <Stack direction="row" justifyContent="center" spacing={1} sx={{ mb: 1.5 }}>
                <Chip
                  label="⚡ LAUNCHING SOON"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 900, px: 1, fontSize: "11px" }}
                />
              </Stack>

              <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                  color: "#fff",
                  mb: 1.5,
                  fontSize: { xs: "1.5rem", sm: "2rem" },
                  letterSpacing: "-0.5px",
                }}
              >
                {currentGame?.title || "Game"} is Coming Soon!
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: "rgba(255, 255, 255, 0.85)",
                  maxWidth: 540,
                  mx: "auto",
                  mb: 4,
                  lineHeight: 1.7,
                  fontSize: { xs: "14px", sm: "16px" },
                  p: 2.5,
                  borderRadius: "16px",
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                }}
              >
                {currentGame?.comingSoonNotice ||
                  "This game is currently in active development. Stay tuned for fast-paced multiplayer battles, custom skins, and ranked leaderboards!"}
              </Typography>

              <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 4 }}>
                <Chip
                  icon={<GroupsIcon sx={{ fontSize: 16 }} />}
                  label={currentGame?.players || "Multiplayer"}
                  size="small"
                  sx={{ background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 700 }}
                />
                <Chip
                  icon={<TimerIcon sx={{ fontSize: 16 }} />}
                  label={currentGame?.duration || "Fast Rounds"}
                  size="small"
                  sx={{ background: "rgba(255,255,255,0.08)", color: "#fff", fontWeight: 700 }}
                />
              </Stack>

              <Button
                variant="contained"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate("/game")}
                sx={{
                  borderRadius: "16px",
                  fontWeight: 800,
                  px: 4,
                  py: 1.3,
                  textTransform: "none",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  boxShadow: "0 10px 25px rgba(99, 102, 241, 0.35)",
                }}
              >
                Back to Games Directory
              </Button>
            </Paper>
          ) : (
            /* ═══════════════════════════════════════════════════════════════
               ACTIVE LIVE GAME VIEW (COIN RUSH)
            ═══════════════════════════════════════════════════════════════ */
            <Box>
              <Stack
                className="coin-rush-sub-header"
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1.5}
                sx={{ mb: 2, px: 1 }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ flexWrap: "nowrap" }}>
                  <Chip
                    label="🟢 LIVE"
                    color="success"
                    size="small"
                    sx={{ fontWeight: 900, px: 0.8, fontSize: "11px" }}
                  />
                  <Typography
                    variant="h5"
                    fontWeight={900}
                    sx={{
                      color: "#0f172a",
                      fontSize: { xs: "1.1rem", sm: "1.35rem", md: "1.5rem" },
                      whiteSpace: "nowrap",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {targetSlug === "last-runner" ? "🏃 Last Runner 1v1 Battle" : "🪙 Coin Rush Multiplayer"}
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
                    py: 0.6,
                    fontSize: { xs: "12px", sm: "13px" },
                    whiteSpace: "nowrap",
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

              {targetSlug === "last-runner" ? (
                <LastRunnerPage socketRef={socketRef} socketId={socketId} status={socketStatus} />
              ) : (
                <CoinRushPage socketRef={socketRef} socketId={socketId} status={socketStatus} />
              )}
            </Box>
          )}
        </Box>
      ) : (
        /* ═══════════════════════════════════════════════════════════════
           GAMES DIRECTORY HUB
        ═══════════════════════════════════════════════════════════════ */
        <Box>
          {/* Header Banner */}
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Stack
              direction="row"
              justifyContent="center"
              alignItems="center"
              spacing={1.5}
              sx={{ mb: 1 }}
            >
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
                  background: "linear-gradient(135deg, #0f172a 0%, #4338ca 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                }}
              >
                Multiplayer Games Arcade
              </Typography>
            </Stack>

            <Typography
              variant="subtitle1"
              sx={{
                color: "#475569",
                maxWidth: 620,
                mx: "auto",
                fontSize: "16px",
                fontWeight: 600,
              }}
            >
              Play fast-paced real-time browser games directly with friends and online players. No
              downloads required!
            </Typography>
          </Box>

          <Grid container spacing={3.5} justifyContent="center">
            {games.map((game) => {
              const IconComp = getIcon(game.icon);
              const isLive = game.status === "active";
              const isMaintenance = game.status === "maintenance";

              return (
                <Grid item xs={12} sm={6} md={4} key={game.slug || game._id}>
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
                      border: isLive
                        ? "1px solid rgba(245, 158, 11, 0.5)"
                        : isMaintenance
                        ? "1px solid rgba(245, 158, 11, 0.3)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: isLive
                        ? "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(245, 158, 11, 0.15)"
                        : "0 15px 40px rgba(0, 0, 0, 0.4)",
                      transition: "transform 0.25s ease, box-shadow 0.25s ease",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: isLive
                          ? "0 25px 60px rgba(245, 158, 11, 0.3)"
                          : "0 20px 40px rgba(0,0,0,0.6)",
                      },
                    }}
                  >
                    <Box>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 2.5 }}
                      >
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: "18px",
                            background:
                              game.color || "linear-gradient(135deg, #6366f1, #3b82f6)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 10px 25px rgba(0,0,0,0.35)",
                          }}
                        >
                          <IconComp sx={{ fontSize: 30, color: "#fff" }} />
                        </Box>

                        <Chip
                          label={
                            isLive
                              ? "🟢 LIVE NOW"
                              : isMaintenance
                              ? "🛠️ MAINTENANCE"
                              : "⚡ COMING SOON"
                          }
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: "11px",
                            color: isLive ? "#fde047" : isMaintenance ? "#fbbf24" : "#a5b4fc",
                            background: isLive
                              ? "rgba(245, 158, 11, 0.2)"
                              : isMaintenance
                              ? "rgba(245, 158, 11, 0.15)"
                              : "rgba(99, 102, 241, 0.2)",
                            border: isLive
                              ? "1px solid rgba(245, 158, 11, 0.4)"
                              : isMaintenance
                              ? "1px solid rgba(245, 158, 11, 0.3)"
                              : "1px solid rgba(99, 102, 241, 0.3)",
                          }}
                        />
                      </Stack>

                      <Typography variant="h5" fontWeight={900} sx={{ color: "#fff", mb: 0.5 }}>
                        {game.title}
                      </Typography>

                      <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{ color: "#818cf8", mb: 1.5, display: "block" }}
                      >
                        {game.subtitle}
                      </Typography>

                      <Typography
                        variant="body2"
                        sx={{
                          color: "rgba(255, 255, 255, 0.75)",
                          mb: 3,
                          minHeight: 60,
                          lineHeight: 1.6,
                        }}
                      >
                        {game.description}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ mb: 3.5 }}>
                        <Chip
                          icon={<GroupsIcon sx={{ fontSize: 16 }} />}
                          label={game.players || "2–8 Players"}
                          size="small"
                          sx={{
                            background: "rgba(255,255,255,0.06)",
                            color: "#fff",
                            fontWeight: 800,
                          }}
                        />
                        <Chip
                          icon={<TimerIcon sx={{ fontSize: 16 }} />}
                          label={game.duration || "60s Rounds"}
                          size="small"
                          sx={{
                            background: "rgba(255,255,255,0.06)",
                            color: "#fff",
                            fontWeight: 800,
                          }}
                        />
                      </Stack>
                    </Box>

                    <Button
                      fullWidth
                      size="large"
                      variant={isLive ? "contained" : "outlined"}
                      startIcon={<PlayArrowIcon />}
                      onClick={() => navigate(`/game/${game.slug}`)}
                      sx={{
                        borderRadius: "16px",
                        fontWeight: 800,
                        py: 1.4,
                        textTransform: "none",
                        fontSize: "15px",
                        background: isLive
                          ? "linear-gradient(135deg, #f59e0b 0%, #ec4899 100%)"
                          : isMaintenance
                          ? "rgba(245, 158, 11, 0.1)"
                          : "transparent",
                        borderColor: isMaintenance ? "rgba(245, 158, 11, 0.4)" : undefined,
                        color: isMaintenance ? "#f59e0b" : undefined,
                        boxShadow: isLive ? "0 10px 30px rgba(245, 158, 11, 0.4)" : "none",
                        "&:hover": {
                          background: isLive
                            ? "linear-gradient(135deg, #d97706 0%, #db2777 100%)"
                            : isMaintenance
                            ? "rgba(245, 158, 11, 0.2)"
                            : "transparent",
                        },
                      }}
                    >
                      {isLive
                        ? `Play ${game.title} Now`
                        : isMaintenance
                        ? "In Maintenance 🛠️"
                        : "Coming Soon 🚀"}
                    </Button>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {/* ═══════════════════════════════════════════════════════════════
              TOP 10 PLAYERS LEADERBOARD SHOWCASE
          ═══════════════════════════════════════════════════════════════ */}
          <Box sx={{ mt: 8, mb: 4, maxWidth: 920, mx: "auto" }}>
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography
                variant="h4"
                fontWeight={900}
                sx={{
                  background: "linear-gradient(135deg, #0f172a 0%, #4338ca 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  letterSpacing: "-0.5px",
                  mb: 0.5,
                }}
              >
                🏆 Top 10 Players Leaderboard
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", fontWeight: 600 }}>
                Compete in real-time matches to climb the Hall of Fame scoreboard!
              </Typography>
            </Box>

            {/* Game Selector Tabs */}
            <Stack direction="row" spacing={1.5} justifyContent="center" sx={{ mb: 3 }}>
              <Button
                variant={selectedHubLeaderboard === "coin-rush" ? "contained" : "outlined"}
                onClick={() => setSelectedHubLeaderboard("coin-rush")}
                startIcon={<MonetizationOnIcon />}
                sx={{
                  borderRadius: "16px",
                  fontWeight: 900,
                  px: 3,
                  py: 1.2,
                  textTransform: "none",
                  fontSize: "14px",
                  background:
                    selectedHubLeaderboard === "coin-rush"
                      ? "linear-gradient(135deg, #f59e0b, #ec4899)"
                      : "#fff",
                  color: selectedHubLeaderboard === "coin-rush" ? "#fff" : "#475569",
                  borderColor:
                    selectedHubLeaderboard === "coin-rush"
                      ? "transparent"
                      : "rgba(15, 23, 42, 0.15)",
                  boxShadow:
                    selectedHubLeaderboard === "coin-rush"
                      ? "0 8px 25px rgba(245, 158, 11, 0.35)"
                      : "none",
                  "&:hover": {
                    background:
                      selectedHubLeaderboard === "coin-rush"
                        ? "linear-gradient(135deg, #d97706, #db2777)"
                        : "rgba(245, 158, 11, 0.08)",
                  },
                }}
              >
                🪙 Coin Rush Top 10
              </Button>

              <Button
                variant={selectedHubLeaderboard === "last-runner" ? "contained" : "outlined"}
                onClick={() => setSelectedHubLeaderboard("last-runner")}
                startIcon={<DirectionsRunIcon />}
                sx={{
                  borderRadius: "16px",
                  fontWeight: 900,
                  px: 3,
                  py: 1.2,
                  textTransform: "none",
                  fontSize: "14px",
                  background:
                    selectedHubLeaderboard === "last-runner"
                      ? "linear-gradient(135deg, #ef4444, #f59e0b)"
                      : "#fff",
                  color: selectedHubLeaderboard === "last-runner" ? "#fff" : "#475569",
                  borderColor:
                    selectedHubLeaderboard === "last-runner"
                      ? "transparent"
                      : "rgba(15, 23, 42, 0.15)",
                  boxShadow:
                    selectedHubLeaderboard === "last-runner"
                      ? "0 8px 25px rgba(239, 68, 68, 0.35)"
                      : "none",
                  "&:hover": {
                    background:
                      selectedHubLeaderboard === "last-runner"
                        ? "linear-gradient(135deg, #dc2626, #d97706)"
                        : "rgba(239, 68, 68, 0.08)",
                  },
                }}
              >
                🏃 Last Runner Top 10
              </Button>
            </Stack>

            <LeaderboardWidget
              gameSlug={selectedHubLeaderboard}
              title={
                selectedHubLeaderboard === "coin-rush"
                  ? "🏆 Top 10 Coin Rush Champions"
                  : "🏆 Top 10 Last Runner Champions"
              }
              subtitle="GLOBAL ALL-TIME HALL OF FAME"
              compact={false}
            />
          </Box>
        </Box>
      )}
    </Container>
  );
}
