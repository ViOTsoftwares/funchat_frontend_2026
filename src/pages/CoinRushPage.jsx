import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Phaser from "phaser";
import CoinRushScene from "../game/CoinRushScene.js";
import { playCountdownSound, playGameOverSound } from "../game/soundEffects.js";
import { toastMessage } from "../lib/toast.message.js";
import { useGameVoice } from "../hooks/useGameVoice.js";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import FullscreenIcon from "@mui/icons-material/Fullscreen";

import {
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
  TextField,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Grid,
  Avatar,
  ToggleButtonGroup,
  ToggleButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";

import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import ReplayIcon from "@mui/icons-material/Replay";
import GroupsIcon from "@mui/icons-material/Groups";
import TimerIcon from "@mui/icons-material/Timer";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import KeyboardIcon from "@mui/icons-material/Keyboard";
import SmartphoneIcon from "@mui/icons-material/Smartphone";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import PeopleIcon from "@mui/icons-material/People";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import TuneIcon from "@mui/icons-material/Tune";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export default function CoinRushPage({ socketRef, socketId, status }) {
  const navigate = useNavigate();

  // Room & Game state
  const [roomId, setRoomId] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [gameStatus, setGameStatus] = useState("LOBBY"); // LOBBY, WAITING, COUNTDOWN, PLAYING, ENDED
  const [countdownVal, setCountdownVal] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60);

  // Leave Warning & Joystick Customization States
  const [leaveWarningOpen, setLeaveWarningOpen] = useState(false);
  const [joystickSettingsOpen, setJoystickSettingsOpen] = useState(false);
  const [joystickConfig, setJoystickConfig] = useState(() => {
    const isMobile =
      typeof window !== "undefined" &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 900);
    const defaultMode = isMobile ? "dynamic" : "fixed";

    try {
      const saved = localStorage.getItem("funchat_joystick_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          theme: parsed.theme || "neon",
          mode: parsed.mode || defaultMode,
          size: parsed.size || "standard",
        };
      }
    } catch {
      // ignore
    }

    return { theme: "neon", mode: defaultMode, size: "standard" };
  });

  // Manage body class for hiding header on mobile when joined
  useEffect(() => {
    if (gameStatus !== "LOBBY") {
      document.body.classList.add("coin-rush-in-game");
    } else {
      document.body.classList.remove("coin-rush-in-game");
    }
    return () => {
      document.body.classList.remove("coin-rush-in-game");
    };
  }, [gameStatus]);

  // Automatic screen orientation lock (Fullscreen + Landscape mode when in game)
  useEffect(() => {
    const handleResize = () => {
      if (phaserGameRef.current && phaserGameRef.current.scale) {
        phaserGameRef.current.scale.refresh();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    const autoLandscape = () => {
      if (gameStatus !== "LOBBY") {
        handleToggleFullscreenLandscape();
      }
    };

    if (gameStatus !== "LOBBY") {
      handleToggleFullscreenLandscape();
      window.addEventListener("touchstart", autoLandscape, { passive: true });
      window.addEventListener("click", autoLandscape);
    } else {
      if (window.screen?.orientation?.unlock) {
        try {
          window.screen.orientation.unlock();
        } catch {}
      }
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          document.exitFullscreen().catch(() => {});
        } catch {}
      }
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      window.removeEventListener("touchstart", autoLandscape);
      window.removeEventListener("click", autoLandscape);
    };
  }, [gameStatus]);

  const handleJoystickConfigChange = (newConfig) => {
    const updated = { ...joystickConfig, ...newConfig };
    setJoystickConfig(updated);
    try {
      localStorage.setItem("funchat_joystick_config", JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save joystick config to localStorage", e);
    }

    if (phaserGameRef.current) {
      const scene = phaserGameRef.current.scene.getScene("CoinRushScene");
      if (scene && typeof scene.updateJoystickConfig === "function") {
        scene.updateJoystickConfig(updated);
      }
    }
  };

  // Player capacity selection (2, 4, 8)
  const [playerCapacity, setPlayerCapacity] = useState(2); // default 2 players mode
  const [isSearchingQuickMatch, setIsSearchingQuickMatch] = useState(false);

  // Scoreboard & Leaderboard
  const [players, setPlayers] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [myScore, setMyScore] = useState(0);
  const [myPowerUp, setMyPowerUp] = useState(null);
  const [powerUpTimeLeft, setPowerUpTimeLeft] = useState(0);
  const [winner, setWinner] = useState(null);
  const [endLeaderboard, setEndLeaderboard] = useState([]);

  // In-Game Room Voice Chat Hook
  const {
    isMicOn,
    isMuted,
    isSpeaking,
    permissionError,
    remoteMutes,
    startMic,
    toggleMute,
    cleanupVoice,
  } = useGameVoice(socketRef, roomId, players, socketId);

  const handleToggleFullscreenLandscape = async () => {
    try {
      if (!document.fullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
          await elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) {
          await elem.msRequestFullscreen();
        }
      }
      if (window.screen?.orientation?.lock) {
        await window.screen.orientation.lock("landscape");
      }
    } catch (err) {
      console.log("Landscape lock attempt note:", err?.message || err);
    }
  };

  // Phaser instance reference
  const phaserGameRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // ── 1. Register Socket Listeners ──
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onRoomState = (state) => {
      if (!state) return;
      setRoomState(state);
      setRoomId(state.roomId || "");
      setPlayers(state.players || []);
      if (state.maxPlayers) {
        setMaxPlayers(Number(state.maxPlayers));
      }
      setIsSearchingQuickMatch(false);
      const me = (state.players || []).find((p) => p.id === socket.id);
      setIsHost(Boolean(me?.isHost));
      if (state.status === "WAITING") {
        setGameStatus("WAITING");
      } else if (state.status === "COUNTDOWN") {
        setGameStatus("COUNTDOWN");
      } else if (state.status === "PLAYING") {
        setGameStatus("PLAYING");
      }
    };

    const onPlayerJoined = ({ player, roomState }) => {
      if (player?.name) {
        toastMessage(`${player.name} joined the arena!`, "info");
      }
      if (roomState && roomState.players) {
        setPlayers(roomState.players);
        setRoomState(roomState);
      } else if (player) {
        setPlayers((prev) => {
          const exists = prev.some((p) => p.id === player.id);
          return exists ? prev.map((p) => (p.id === player.id ? player : p)) : [...prev, player];
        });
      }
    };

    const onPlayerLeft = ({ playerId, newHostId }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      if (newHostId === socket.id) {
        setIsHost(true);
        toastMessage("You are now the room host!", "info");
      }
    };

    const onCountdown = ({ countdown }) => {
      setGameStatus("COUNTDOWN");
      setCountdownVal(countdown);
      playCountdownSound(countdown);
    };

    const onGameStarted = ({ duration }) => {
      setGameStatus("PLAYING");
      setCountdownVal(null);
      setTimeRemaining(duration || 60);
      toastMessage("Round Started! GO GO GO!", "success");
    };

    let lastTimeRemaining = -1;
    let lastRenderTimestamp = 0;

    const onGameState = (state) => {
      if (!state) return;
      const now = Date.now();
      
      // Immediate timer update
      if (typeof state.timeRemaining === "number") {
        setTimeRemaining(state.timeRemaining);
      }

      // Immediate player score & leaderboard update
      if (state.players) {
        setPlayers(state.players);
        const myId = socket.id || socketId || socketRef.current?.id;
        const me = state.players.find((p) => p.id === myId);
        if (me) {
          setMyScore(me.score || 0);
          setMyPowerUp(me.powerUp || null);
          if (me.powerUp?.expiresAt) {
            const rem = Math.max(0, Math.ceil((me.powerUp.expiresAt - now) / 1000));
            setPowerUpTimeLeft(rem);
          } else {
            setPowerUpTimeLeft(0);
          }
        }
      }
    };

    const onGameEnded = ({ winner, leaderboard }) => {
      setGameStatus("ENDED");
      setWinner(winner);
      setEndLeaderboard(leaderboard || []);
      playGameOverSound();
    };

    const onError = ({ message }) => {
      setIsSearchingQuickMatch(false);
      toastMessage(message || "Coin Rush error", "error");
    };

    socket.on("coinRush_roomState", onRoomState);
    socket.on("coinRush_playerJoined", onPlayerJoined);
    socket.on("coinRush_playerLeft", onPlayerLeft);
    socket.on("coinRush_countdown", onCountdown);
    socket.on("coinRush_gameStarted", onGameStarted);
    socket.on("coinRush_gameState", onGameState);
    socket.on("coinRush_gameEnded", onGameEnded);
    socket.on("coinRush_error", onError);

    return () => {
      socket.off("coinRush_roomState", onRoomState);
      socket.off("coinRush_playerJoined", onPlayerJoined);
      socket.off("coinRush_playerLeft", onPlayerLeft);
      socket.off("coinRush_countdown", onCountdown);
      socket.off("coinRush_gameStarted", onGameStarted);
      socket.off("coinRush_gameState", onGameState);
      socket.off("coinRush_gameEnded", onGameEnded);
      socket.off("coinRush_error", onError);
    };
  }, [socketRef, socketId, status]);

  // ── 2. Initialize Phaser Game Instance ──
  useEffect(() => {
    if (
      (gameStatus === "WAITING" || gameStatus === "COUNTDOWN" || gameStatus === "PLAYING" || gameStatus === "ENDED") &&
      canvasContainerRef.current &&
      !phaserGameRef.current &&
      roomState
    ) {
      const config = {
        type: Phaser.AUTO,
        parent: canvasContainerRef.current,
        width: 1200,
        height: 800,
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: 1200,
          height: 800,
        },
        physics: {
          default: "arcade",
          arcade: { debug: false },
        },
        fps: {
          target: 60,
          forceSetTimeOut: false,
        },
        scene: [CoinRushScene],
        backgroundColor: "#090d16",
      };

      const game = new Phaser.Game(config);
      phaserGameRef.current = game;

      game.scene.start("CoinRushScene", {
        socket: socketRef.current,
        roomId: roomState.roomId,
        arenaWalls: roomState.arenaWalls,
        arenaSize: roomState.arenaSize,
        joystickConfig,
      });
    }

    return () => {
      if (phaserGameRef.current && gameStatus === "LOBBY") {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [gameStatus, roomState, socketRef]);

  // ── 3. Actions ──
  const handleQuickMatch = () => {
    const socket = socketRef.current;
    if (!socket) return;
    if (!socket.connected) socket.connect();
    setIsSearchingQuickMatch(true);
    const name = localStorage.getItem("funchat_profile_name") || "Player";
    const selectedCap = Number(playerCapacity) || 2;
    socket.emit("coinRush_quickMatch", { name, maxPlayers: selectedCap }, (res) => {
      if (res?.ok) {
        if (res.roomState) {
          setRoomState(res.roomState);
          setPlayers(res.roomState.players || []);
          setMaxPlayers(Number(res.roomState.maxPlayers) || selectedCap);
        }
        setRoomId(res.roomId);
        setIsHost(Boolean(res.isHost));
        setGameStatus("WAITING");
      }
      setIsSearchingQuickMatch(false);
    });
  };

  const handleCreateRoom = () => {
    const socket = socketRef.current;
    if (!socket) return;
    if (!socket.connected) socket.connect();
    const name = localStorage.getItem("funchat_profile_name") || "Player 1";
    const selectedCap = Number(playerCapacity) || 2;
    socket.emit("coinRush_createRoom", { name, maxPlayers: selectedCap, isPublic: false }, (res) => {
      if (res?.ok) {
        if (res.roomState) {
          setRoomState(res.roomState);
          setPlayers(res.roomState.players || []);
          setMaxPlayers(Number(res.roomState.maxPlayers) || selectedCap);
        }
        setRoomId(res.roomId);
        setIsHost(true);
        setGameStatus("WAITING");
      }
    });
  };

  const handleJoinRoom = () => {
    const socket = socketRef.current;
    if (!socket || !joinCodeInput.trim()) return;
    if (!socket.connected) socket.connect();
    const name = localStorage.getItem("funchat_profile_name") || "Player";
    socket.emit("coinRush_joinRoom", { roomId: joinCodeInput.trim(), name }, (res) => {
      if (res?.ok) {
        if (res.roomState) {
          setRoomState(res.roomState);
          setPlayers(res.roomState.players || []);
          setMaxPlayers(Number(res.roomState.maxPlayers) || 8);
        }
        setRoomId(res.roomId);
        setIsHost(Boolean(res.isHost));
        setGameStatus("WAITING");
      }
    });
  };

  const handleStartGame = () => {
    const socket = socketRef.current;
    const targetCode = roomId || roomState?.roomId;
    if (!socket || !targetCode) return;
    socket.emit("coinRush_startGame", { roomId: targetCode });
  };

  const handleLeaveRoom = () => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit("coinRush_leaveRoom");
    }
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    }
    setGameStatus("LOBBY");
    setRoomId("");
    setPlayers([]);
    setWinner(null);
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
    toastMessage(`Room code ${roomId} copied!`, "success");
  };

  // Active maximum player capacity
  const activeMaxCapacity = Number(roomState?.maxPlayers) || Number(maxPlayers) || Number(playerCapacity) || 2;

  // Sort players descending by score for HUD Leaderboard
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <>
      {/* ── LOBBY VIEW: Create / Join Room / Quick Match ── */}
      {gameStatus === "LOBBY" && (
        <Container maxWidth="xl" sx={{ pt: { xs: 7, sm: 10, md: 11 }, pb: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
          <Grid container spacing={{ xs: 2.5, sm: 4 }} justifyContent="center" alignItems="center">
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 4, md: 5 },
                  borderRadius: { xs: "20px", sm: "28px" },
                  background: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.15)",
                  color: "#fff",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Top Accent Gradient Bar */}
                <Box
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "4px",
                    background: "linear-gradient(90deg, #6366f1, #f59e0b, #ec4899)",
                  }}
                />

                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      width: { xs: 44, sm: 56 },
                      height: { xs: 44, sm: 56 },
                      borderRadius: { xs: "14px", sm: "18px" },
                      background: "linear-gradient(135deg, #f59e0b, #ec4899)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 10px 25px rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    <EmojiEventsIcon sx={{ fontSize: { xs: 26, sm: 34 }, color: "#fff" }} />
                  </Box>
                  <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ fontSize: { xs: "1.5rem", sm: "2.1rem" }, letterSpacing: "-0.5px", color: "#fff" }}>
                      🪙 COIN RUSH
                    </Typography>
                    <Typography variant="caption" fontWeight={700} sx={{ color: "#fde047", letterSpacing: "1px" }}>
                      REAL-TIME MULTIPLAYER ARCADE
                    </Typography>
                  </Box>
                </Stack>

                {/* ── MODE / PLAYER CAPACITY SELECTOR (2, 4, 8) ── */}
                <Box sx={{ mb: 3, p: { xs: 1.5, sm: 2 }, borderRadius: "18px", background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Typography variant="caption" fontWeight={800} sx={{ color: "rgba(255,255,255,0.7)", mb: 1, display: "block" }}>
                    SELECT PLAYER MODE / CAPACITY:
                  </Typography>
                  <ToggleButtonGroup
                    value={playerCapacity}
                    exclusive
                    onChange={(e, val) => val && setPlayerCapacity(Number(val))}
                    fullWidth
                    sx={{
                      gap: 1,
                      flexDirection: { xs: "column", sm: "row" },
                      "& .MuiToggleButton-root": {
                        color: "#fff",
                        borderColor: "rgba(255,255,255,0.15)",
                        borderRadius: "12px !important",
                        fontWeight: 800,
                        py: 1,
                        fontSize: { xs: "13px", sm: "14px" },
                        textTransform: "none",
                        "&.Mui-selected": {
                          background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                          color: "#fff",
                          borderColor: "transparent",
                          boxShadow: "0 4px 15px rgba(99, 102, 241, 0.4)",
                        },
                      },
                    }}
                  >
                    <ToggleButton value={2}>👥 2 Players (1v1)</ToggleButton>
                    <ToggleButton value={4}>⚔️ 4 Players (Squad)</ToggleButton>
                    <ToggleButton value={8}>🔥 8 Players (Chaos)</ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* ── QUICK MATCH BUTTON (RANDOM CONNECTION) ── */}
                <Button
                  fullWidth
                  size="large"
                  variant="contained"
                  startIcon={<ShuffleIcon />}
                  onClick={handleQuickMatch}
                  disabled={isSearchingQuickMatch}
                  sx={{
                    mb: 2.5,
                    py: { xs: 1.4, sm: 1.8 },
                    borderRadius: "16px",
                    fontWeight: 900,
                    fontSize: { xs: "14.5px", sm: "16px" },
                    background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)",
                    boxShadow: "0 10px 30px rgba(236, 72, 153, 0.4)",
                    textTransform: "none",
                    transition: "all 0.25s ease",
                    "&:hover": {
                      background: "linear-gradient(135deg, #db2777 0%, #7c3aed 100%)",
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  {isSearchingQuickMatch ? "Finding Random Players..." : `⚡ Quick Match (${playerCapacity} Players Random)`}
                </Button>

                <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.4)", fontWeight: 800, display: "block", textAlign: "center", mb: 2.5 }}>
                  — OR PRIVATE ROOM CODE —
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<SportsEsportsIcon />}
                      onClick={handleCreateRoom}
                      sx={{
                        py: 1.5,
                        borderRadius: "16px",
                        fontWeight: 800,
                        color: "#818cf8",
                        borderColor: "rgba(129, 140, 248, 0.4)",
                        textTransform: "none",
                        fontSize: { xs: "13px", sm: "14px" },
                      }}
                    >
                      Create Custom ({playerCapacity}P) Room
                    </Button>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        fullWidth
                        placeholder="Room Code"
                        value={joinCodeInput}
                        onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                        inputProps={{ style: { color: "#fff", fontWeight: 800, textAlign: "center", letterSpacing: "2px" } }}
                        sx={{
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "16px",
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255, 255, 255, 0.15)" },
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleJoinRoom}
                        disabled={!joinCodeInput.trim()}
                        sx={{
                          px: 3,
                          borderRadius: "16px",
                          fontWeight: 800,
                          background: "linear-gradient(135deg, #f59e0b, #d97706)",
                          color: "#fff",
                          textTransform: "none",
                        }}
                      >
                        Join
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Controls Quick Guide */}
            <Grid item xs={12} md={5}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 4 },
                  borderRadius: { xs: "20px", sm: "28px" },
                  background: "rgba(15, 23, 42, 0.75)",
                  backdropFilter: "blur(20px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  color: "#fff",
                }}
              >
                <Typography variant="h6" fontWeight={800} sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  🎮 CONTROLS GUIDE
                </Typography>

                <Stack spacing={2}>
                  <Paper sx={{ p: 2, borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <KeyboardIcon sx={{ color: "#38bdf8" }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#fff" }}>
                          Desktop Controls
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                          WASD Keys or Arrow Keys to move in 8 directions
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>

                  <Paper sx={{ p: 2, borderRadius: "16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <SmartphoneIcon sx={{ color: "#ec4899" }} />
                      <Box>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#fff" }}>
                          Mobile Controls
                        </Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                          Virtual Touch Joystick on bottom-left screen
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      )}

      {/* ── ROOM / GAME ARENA CONTAINER ── */}
      {gameStatus !== "LOBBY" && (
        <Box
          className="coin-rush-game-wrapper"
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100dvh",
            display: "flex",
            flexDirection: "column",
            background: "#090d16",
            overflow: "hidden",
            zIndex: 9999,
          }}
        >
          {/* ── DEDICATED TOP HUD BAR ── */}
          <Box
            className="coin-rush-top-hud-bar"
            sx={{
              width: "100%",
              px: { xs: 1, sm: 2 },
              py: { xs: 0.5, sm: 0.8 },
              background: "rgba(9, 13, 22, 0.95)",
              backdropFilter: "blur(14px)",
              borderBottom: "1px solid rgba(99, 102, 241, 0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 30,
              boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
              flexShrink: 0,
            }}
          >
            {/* Left Stack: Actions & Score */}
            <Stack direction="row" spacing={{ xs: 0.5, sm: 1 }} alignItems="center">
              <Tooltip title="Leave Game / Exit Room">
                <IconButton
                  onClick={() => setLeaveWarningOpen(true)}
                  size="small"
                  sx={{
                    color: "#f87171",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    p: { xs: "4px", sm: "6px" },
                  }}
                >
                  <ArrowBackIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Customize Virtual Joystick">
                <IconButton
                  onClick={() => setJoystickSettingsOpen(true)}
                  size="small"
                  sx={{
                    color: "#818cf8",
                    background: "rgba(99, 102, 241, 0.15)",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    p: { xs: "4px", sm: "6px" },
                  }}
                >
                  <TuneIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Tooltip>

              <Tooltip title={!isMicOn ? "Enable Mic Voice Chat" : isMuted ? "Unmute Mic" : "Mute Mic"}>
                <IconButton
                  onClick={!isMicOn ? startMic : toggleMute}
                  size="small"
                  sx={{
                    color: !isMicOn ? "rgba(255,255,255,0.6)" : isMuted ? "#f87171" : "#4ade80",
                    background: isSpeaking ? "rgba(34, 197, 94, 0.3)" : "rgba(255,255,255,0.08)",
                    border: isMuted ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(34, 197, 94, 0.4)",
                    boxShadow: isSpeaking ? "0 0 12px rgba(34, 197, 94, 0.6)" : "none",
                    p: { xs: "4px", sm: "6px" },
                  }}
                >
                  {!isMicOn || isMuted ? (
                    <MicOffIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                  ) : (
                    <MicIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                  )}
                </IconButton>
              </Tooltip>

              <Tooltip title="Fullscreen Landscape Mode">
                <IconButton
                  onClick={handleToggleFullscreenLandscape}
                  size="small"
                  sx={{
                    color: "#f59e0b",
                    background: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                    p: { xs: "4px", sm: "6px" },
                  }}
                >
                  <FullscreenIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />
                </IconButton>
              </Tooltip>

              <Paper
                elevation={0}
                sx={{
                  px: { xs: 1, sm: 1.5 },
                  py: 0.3,
                  borderRadius: "10px",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#fde047",
                  fontWeight: 900,
                  fontSize: { xs: "11px", sm: "14px" },
                  display: "flex",
                  alignItems: "center",
                }}
              >
                🪙 {myScore} pts
              </Paper>
            </Stack>

            {/* Center Stack: Round Timer */}
            <Paper
              elevation={0}
              sx={{
                px: { xs: 1.2, sm: 2 },
                py: 0.3,
                borderRadius: "12px",
                background: "rgba(15, 23, 42, 0.9)",
                border: timeRemaining <= 10 ? "1px solid #ef4444" : "1px solid rgba(99, 102, 241, 0.4)",
                color: timeRemaining <= 10 ? "#ef4444" : "#fff",
                fontWeight: 900,
                fontSize: { xs: "12px", sm: "16px" },
                fontFamily: "monospace",
              }}
            >
              <Stack direction="row" spacing={0.6} alignItems="center">
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    bgcolor: timeRemaining <= 10 ? "#ef4444" : "#22c55e",
                    boxShadow: timeRemaining <= 10 ? "0 0 8px #ef4444" : "0 0 8px #22c55e",
                  }}
                />
                <TimerIcon sx={{ fontSize: { xs: 15, sm: 18 }, color: timeRemaining <= 10 ? "#ef4444" : "#818cf8" }} />
                <span>
                  {(() => {
                    const s = Math.max(0, Number(timeRemaining) || 0);
                    const mins = Math.floor(s / 60);
                    const rem = s % 60;
                    return `${mins < 10 ? '0' + mins : mins}:${rem < 10 ? '0' + rem : rem}`;
                  })()}
                </span>
              </Stack>
            </Paper>

            {/* Right Stack: Leaderboard Rank */}
            <Paper
              elevation={0}
              sx={{
                px: { xs: 1, sm: 1.5 },
                py: 0.3,
                borderRadius: "10px",
                background: "rgba(15, 23, 42, 0.85)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
              }}
            >
              <Stack direction="row" spacing={0.8} alignItems="center">
                <Typography variant="caption" fontWeight={900} sx={{ color: "#fde047", fontSize: { xs: "10.5px", sm: "12px" } }}>
                  🏆 #{(() => {
                    const myIdx = sortedPlayers.findIndex((p) => p.id === socketRef.current?.id);
                    return myIdx >= 0 ? myIdx + 1 : 1;
                  })()}
                </Typography>
                <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: { xs: "10px", sm: "11px" } }}>
                  ({sortedPlayers.length} Players)
                </Typography>
              </Stack>
            </Paper>
          </Box>

          {/* ── SINGLE PHASER GAME CANVAS CONTAINER ── */}
          <Box
            ref={canvasContainerRef}
            className="coin-rush-canvas-container"
            sx={{
              position: "relative",
              flex: "1 1 0%",
              width: "100%",
              height: "100%",
              minHeight: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              background: "#090d16",
              touchAction: "none",
            }}
          />

          {/* Bottom-Right: Active Power-up indicator */}
          {myPowerUp && powerUpTimeLeft > 0 && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                bottom: 24,
                right: 24,
                zIndex: 20,
                p: "8px 16px",
                borderRadius: "14px",
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(16px)",
                border: "1px solid #38bdf8",
                boxShadow: "0 0 25px rgba(56, 189, 248, 0.4)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <FlashOnIcon sx={{ color: "#38bdf8" }} />
              <Typography variant="subtitle2" fontWeight={900}>
                {myPowerUp.type.toUpperCase()} ({powerUpTimeLeft}s)
              </Typography>
            </Paper>
          )}

          {/* ── COUNTDOWN OVERLAY (3, 2, 1, GO!) ── */}
          {gameStatus === "COUNTDOWN" && countdownVal && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15, 23, 42, 0.75)",
                backdropFilter: "blur(6px)",
              }}
            >
              <Typography
                variant="h1"
                fontWeight={900}
                sx={{
                  fontSize: { xs: "90px", sm: "160px" },
                  color: countdownVal === "GO!" ? "#22c55e" : "#f59e0b",
                  textShadow: countdownVal === "GO!" ? "0 0 50px rgba(34, 197, 94, 0.9)" : "0 0 50px rgba(245, 158, 11, 0.9)",
                }}
              >
                {countdownVal}
              </Typography>
            </Box>
          )}

          {/* ── RESPONSIVE GLASSMORPHISM LOBBY WAITING ROOM OVERLAY ── */}
          {gameStatus === "WAITING" && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(9, 13, 22, 0.94)",
                backdropFilter: "blur(18px)",
                p: { xs: 1.5, sm: 3 },
                overflowY: "auto",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  width: "100%",
                  maxWidth: 540,
                  maxHeight: "92vh",
                  overflowY: "auto",
                  p: { xs: 2.5, sm: 3.5 },
                  borderRadius: { xs: "20px", sm: "28px" },
                  background: "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))",
                  border: "1px solid rgba(99, 102, 241, 0.4)",
                  boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(99, 102, 241, 0.2)",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                {/* Live Status Badge */}
                <Chip
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", boxShadow: "0 0 10px #22c55e", animation: "pulse 1.5s infinite" }} />}
                  label="🟢 WAITING FOR PLAYERS TO JOIN"
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "11px", sm: "12px" },
                    color: "#86efac",
                    background: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    mb: 1.8,
                    px: 1,
                  }}
                />

                {/* Title & Mode */}
                <Typography variant="h5" fontWeight={900} sx={{ color: "#fff", mb: 0.5, fontSize: { xs: "1.2rem", sm: "1.5rem" } }}>
                  Coin Rush Multiplayer Lobby
                </Typography>

                <Stack direction="row" justifyContent="center" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                  <Chip
                    label={activeMaxCapacity === 2 ? "👥 2 Players (1v1)" : activeMaxCapacity === 4 ? "⚔️ 4 Players Mode" : "🔥 8 Players Mode"}
                    size="small"
                    sx={{ fontWeight: 800, background: "rgba(99, 102, 241, 0.25)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.4)" }}
                  />
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#e2e8f0" }}>
                    ROOM: <span style={{ color: "#fde047", letterSpacing: "2px", fontWeight: 900 }}>{roomId}</span>
                  </Typography>
                  <Tooltip title="Copy Room Code">
                    <IconButton size="small" onClick={copyRoomCode} sx={{ color: "#818cf8", background: "rgba(99, 102, 241, 0.2)", "&:hover": { background: "rgba(99, 102, 241, 0.4)" } }}>
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>

                {/* Responsive Slots Grid */}
                <Grid container spacing={1.5} justifyContent="center" sx={{ mb: 3 }}>
                  {Array.from({ length: activeMaxCapacity }).map((_, index) => {
                    const player = players[index];
                    if (player) {
                      const isMe = player.id === socketId;
                      const playerIsMuted = isMe ? isMuted : remoteMutes[player.id] ?? player.isMuted;
                      return (
                        <Grid item xs={12} sm={6} key={player.id || index}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.2,
                              borderRadius: "14px",
                              background: "rgba(255, 255, 255, 0.06)",
                              border: `1px solid ${player.color || "#6366f1"}`,
                              boxShadow: `0 4px 15px rgba(0,0,0,0.3), 0 0 10px ${player.color || "#6366f1"}33`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <Stack direction="row" spacing={1} alignItems="center">
                              <Avatar sx={{ bgcolor: player.color || "#6366f1", width: 34, height: 34, fontWeight: 900, color: "#fff", fontSize: "13px" }}>
                                {player.name.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box sx={{ textAlign: "left" }}>
                                <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#fff", fontSize: "12.5px", lineHeight: 1.2 }}>
                                  {player.name} {isMe ? "(You)" : ""}
                                </Typography>
                                <Typography variant="caption" sx={{ color: player.isHost ? "#fde047" : "#a5b4fc", fontWeight: 700, fontSize: "10px" }}>
                                  {player.isHost ? "👑 Room Host" : "Player"}
                                </Typography>
                              </Box>
                            </Stack>

                            <Chip
                              icon={playerIsMuted ? <MicOffIcon sx={{ fontSize: "13px !important", color: "#f87171 !important" }} /> : <MicIcon sx={{ fontSize: "13px !important", color: "#4ade80 !important" }} />}
                              label={playerIsMuted ? "Muted" : "Voice On"}
                              size="small"
                              sx={{
                                fontSize: "9.5px",
                                fontWeight: 800,
                                height: 22,
                                background: playerIsMuted ? "rgba(239, 68, 68, 0.15)" : "rgba(34, 197, 94, 0.15)",
                                color: playerIsMuted ? "#f87171" : "#4ade80",
                                border: playerIsMuted ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid rgba(34, 197, 94, 0.3)",
                              }}
                            />
                          </Paper>
                        </Grid>
                      );
                    } else {
                      return (
                        <Grid item xs={12} sm={6} key={`empty_${index}`}>
                          <Paper
                            elevation={0}
                            sx={{
                              p: 1.2,
                              borderRadius: "14px",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px dashed rgba(255, 255, 255, 0.2)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 1,
                              minHeight: 48,
                            }}
                          >
                            <CircularProgress size={13} sx={{ color: "#a5b4fc" }} />
                            <Typography variant="caption" fontWeight={700} sx={{ color: "rgba(255,255,255,0.5)", fontSize: "11px" }}>
                              Slot {index + 1}: Waiting...
                            </Typography>
                          </Paper>
                        </Grid>
                      );
                    }
                  })}
                </Grid>

                {/* Interactive Action Buttons Bar */}
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="center" alignItems="stretch">
                  <Button
                    variant="outlined"
                    size="medium"
                    startIcon={!isMicOn || isMuted ? <MicOffIcon /> : <MicIcon />}
                    onClick={!isMicOn ? startMic : toggleMute}
                    sx={{
                      borderRadius: "14px",
                      fontWeight: 800,
                      py: 1.2,
                      px: 2,
                      borderColor: !isMicOn ? "rgba(255,255,255,0.25)" : isMuted ? "#f87171" : "#22c55e",
                      color: !isMicOn ? "#ffffff" : isMuted ? "#f87171" : "#4ade80",
                      background: isSpeaking ? "rgba(34, 197, 94, 0.25)" : "rgba(15, 23, 42, 0.6)",
                      textTransform: "none",
                      fontSize: "13px",
                      "&:hover": {
                        borderColor: "#4ade80",
                        background: "rgba(34, 197, 94, 0.2)",
                      },
                    }}
                  >
                    {!isMicOn ? "Enable Mic" : isMuted ? "Unmute Mic" : "Mic Active"}
                  </Button>

                  {isHost ? (
                    <Button
                      variant="contained"
                      size="medium"
                      startIcon={<PlayArrowIcon />}
                      onClick={handleStartGame}
                      disabled={players.length < 2}
                      sx={{
                        borderRadius: "14px",
                        fontWeight: 900,
                        py: 1.2,
                        px: 2.5,
                        textTransform: "none",
                        fontSize: "13.5px",
                        color: "#ffffff !important",
                        background: players.length >= 2
                          ? "linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important"
                          : "rgba(255, 255, 255, 0.15) !important",
                        boxShadow: players.length >= 2 ? "0 8px 25px rgba(34, 197, 94, 0.4)" : "none",
                        "&.Mui-disabled": {
                          color: "rgba(255, 255, 255, 0.6) !important",
                          background: "rgba(255, 255, 255, 0.15) !important",
                        },
                        "&:hover": {
                          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important",
                        },
                      }}
                    >
                      {players.length >= 2 ? "Launch Match Now 🚀" : `Waiting for Players (${players.length}/${activeMaxCapacity})`}
                    </Button>
                  ) : (
                    <Paper
                      elevation={0}
                      sx={{
                        p: "10px 16px",
                        borderRadius: "14px",
                        background: "rgba(34, 197, 94, 0.15)",
                        border: "1px solid rgba(34, 197, 94, 0.3)",
                        color: "#86efac",
                        fontWeight: 800,
                        fontSize: "12.5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 0.8,
                      }}
                    >
                      <CheckCircleIcon sx={{ fontSize: 17, color: "#86efac" }} />
                      Host will start match shortly...
                    </Paper>
                  )}

                  <Button
                    variant="outlined"
                    size="medium"
                    startIcon={<ExitToAppIcon />}
                    onClick={handleLeaveRoom}
                    sx={{
                      borderRadius: "14px",
                      fontWeight: 800,
                      py: 1.2,
                      px: 2,
                      borderColor: "rgba(239, 68, 68, 0.4)",
                      color: "#f87171",
                      background: "rgba(239, 68, 68, 0.1)",
                      textTransform: "none",
                      fontSize: "13px",
                      "&:hover": {
                        borderColor: "#ef4444",
                        background: "rgba(239, 68, 68, 0.25)",
                      },
                    }}
                  >
                    Leave Room
                  </Button>
                </Stack>
              </Paper>
            </Box>
          )}

          {/* ── WINNER / RESULTS MODAL OVERLAY ── */}
          {gameStatus === "ENDED" && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 50,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(9, 13, 22, 0.94)",
                backdropFilter: "blur(18px)",
                p: { xs: 1.5, sm: 3 },
                overflowY: "auto",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  width: "100%",
                  maxWidth: 520,
                  maxHeight: "92vh",
                  overflowY: "auto",
                  p: { xs: 2, sm: 3.5 },
                  borderRadius: { xs: "20px", sm: "28px" },
                  background: "linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94))",
                  border: "1px solid rgba(245, 158, 11, 0.5)",
                  color: "#fff",
                  textAlign: "center",
                  boxShadow: "0 25px 70px rgba(0, 0, 0, 0.8), 0 0 40px rgba(245, 158, 11, 0.25)",
                }}
              >
                <EmojiEventsIcon sx={{ fontSize: { xs: 44, sm: 64 }, color: "#f59e0b", mb: 0.5 }} />
                <Typography variant="h4" fontWeight={900} sx={{ color: "#fff", mb: 0.5, letterSpacing: "-0.5px", fontSize: { xs: "1.25rem", sm: "1.8rem" } }}>
                  ROUND COMPLETE!
                </Typography>

                {winner && (
                  <Box sx={{ my: { xs: 1.5, sm: 2.5 }, p: { xs: 1.5, sm: 2.5 }, borderRadius: "20px", background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(236, 72, 153, 0.2))", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                    <Typography variant="caption" fontWeight={900} sx={{ color: "#fde047", letterSpacing: "1px", fontSize: { xs: "10px", sm: "12px" } }}>
                      🏆 COIN RUSH CHAMPION
                    </Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ color: "#fff", my: 0.3, fontSize: { xs: "1.3rem", sm: "1.8rem" } }}>
                      {winner.name}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={900} sx={{ color: "#fde047", fontSize: { xs: "12px", sm: "15px" } }}>
                      {winner.score} Total Coins Collected!
                    </Typography>
                  </Box>
                )}

                {/* Final Leaderboard */}
                <Typography variant="caption" fontWeight={900} sx={{ color: "rgba(255, 255, 255, 0.6)", mt: { xs: 1, sm: 2 }, mb: 0.8, display: "block", letterSpacing: "1px", fontSize: { xs: "10px", sm: "12px" } }}>
                  FINAL LEADERBOARD
                </Typography>
                <Table size="small" sx={{ mb: { xs: 2, sm: 3 } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 800, fontSize: { xs: "11px", sm: "13px" }, py: 0.8 }}>Rank</TableCell>
                      <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 800, fontSize: { xs: "11px", sm: "13px" }, py: 0.8 }}>Player</TableCell>
                      <TableCell align="right" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 800, fontSize: { xs: "11px", sm: "13px" }, py: 0.8 }}>Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {endLeaderboard.map((p, idx) => (
                      <TableRow key={p.id}>
                        <TableCell sx={{ color: "#fff", fontWeight: 800, fontSize: { xs: "11.5px", sm: "13.5px" }, py: 0.8 }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 800, fontSize: { xs: "11.5px", sm: "13.5px" }, py: 0.8 }}>{p.name}</TableCell>
                        <TableCell align="right" sx={{ color: "#fde047", fontWeight: 900, fontSize: { xs: "11.5px", sm: "13.5px" }, py: 0.8 }}>{p.score} pts</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2} justifyContent="center">
                  {isHost && (
                    <Button
                      variant="contained"
                      startIcon={<ReplayIcon />}
                      onClick={handleStartGame}
                      sx={{
                        borderRadius: "14px",
                        fontWeight: 800,
                        background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                        boxShadow: "0 8px 25px rgba(99, 102, 241, 0.4)",
                        px: 3,
                        py: 1,
                        fontSize: { xs: "13px", sm: "14px" },
                      }}
                    >
                      Play Again
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<ExitToAppIcon />}
                    onClick={handleLeaveRoom}
                    sx={{ borderRadius: "14px", textTransform: "none", px: 2.5, py: 1, fontSize: { xs: "13px", sm: "14px" } }}
                  >
                    Leave Room
                  </Button>
                </Stack>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {/* ── LEAVE GAME WARNING POPUP DIALOG ── */}
      <Dialog
        open={leaveWarningOpen}
        onClose={() => setLeaveWarningOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 40px rgba(239, 68, 68, 0.2)",
            color: "#fff",
            p: 1,
            maxWidth: 440,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 1.5, color: "#f87171" }}>
          <WarningAmberIcon sx={{ fontSize: 32, color: "#ef4444" }} />
          Leave Active Match?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 600, fontSize: "14.5px", lineHeight: 1.6 }}>
            Are you sure you want to exit? You will forfeit your current match score and leave the room.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1.5 }}>
          <Button
            variant="outlined"
            onClick={() => setLeaveWarningOpen(false)}
            sx={{
              borderRadius: "14px",
              color: "rgba(255,255,255,0.85)",
              borderColor: "rgba(255,255,255,0.2)",
              fontWeight: 700,
              textTransform: "none",
              px: 2.5,
            }}
          >
            Keep Playing
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setLeaveWarningOpen(false);
              handleLeaveRoom();
            }}
            sx={{
              borderRadius: "14px",
              fontWeight: 900,
              textTransform: "none",
              px: 3,
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              boxShadow: "0 8px 25px rgba(239, 68, 68, 0.4)",
            }}
          >
            Yes, Leave Match
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── JOYSTICK CUSTOMIZATION MODAL DIALOG ── */}
      <Dialog
        open={joystickSettingsOpen}
        onClose={() => setJoystickSettingsOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "24px",
            background: "rgba(15, 23, 42, 0.96)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            boxShadow: "0 25px 70px rgba(0,0,0,0.8), 0 0 40px rgba(99, 102, 241, 0.25)",
            color: "#fff",
            p: 1,
            maxWidth: 480,
            width: "92%",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: "1.3rem", display: "flex", alignItems: "center", gap: 1.5, color: "#818cf8" }}>
          <TuneIcon sx={{ fontSize: 28, color: "#38bdf8" }} />
          Customize Touch Joystick
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* Theme Choice */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#a5b4fc", mb: 1 }}>
                🎨 JOYSTICK VISUAL THEME
              </Typography>
              <ToggleButtonGroup
                value={joystickConfig.theme}
                exclusive
                onChange={(e, val) => val && handleJoystickConfigChange({ theme: val })}
                fullWidth
                size="small"
                sx={{
                  gap: 1,
                  flexDirection: { xs: "column", sm: "row" },
                  "& .MuiToggleButton-root": {
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.15)",
                    borderRadius: "12px !important",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    py: 0.8,
                    textTransform: "none",
                    "&.Mui-selected": {
                      background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                      color: "#fff",
                      borderColor: "transparent",
                    },
                  },
                }}
              >
                <ToggleButton value="neon">🌌 Neon Indigo</ToggleButton>
                <ToggleButton value="cyber">🌸 Cyber Pink</ToggleButton>
                <ToggleButton value="gold">🪙 Golden Amber</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Position Mode Choice */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#a5b4fc", mb: 1 }}>
                📍 POSITIONING MODE
              </Typography>
              <ToggleButtonGroup
                value={joystickConfig.mode}
                exclusive
                onChange={(e, val) => val && handleJoystickConfigChange({ mode: val })}
                fullWidth
                size="small"
                sx={{
                  gap: 1,
                  flexDirection: { xs: "column", sm: "row" },
                  "& .MuiToggleButton-root": {
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.15)",
                    borderRadius: "12px !important",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    py: 0.8,
                    textTransform: "none",
                    "&.Mui-selected": {
                      background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                      color: "#fff",
                      borderColor: "transparent",
                    },
                  },
                }}
              >
                <ToggleButton value="fixed">📌 Fixed Bottom-Left</ToggleButton>
                <ToggleButton value="dynamic">👈 Dynamic Touch</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* Size Scale Choice */}
            <Box>
              <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#a5b4fc", mb: 1 }}>
                📏 JOYSTICK SIZE SCALE
              </Typography>
              <ToggleButtonGroup
                value={joystickConfig.size}
                exclusive
                onChange={(e, val) => val && handleJoystickConfigChange({ size: val })}
                fullWidth
                size="small"
                sx={{
                  gap: 1,
                  flexDirection: { xs: "column", sm: "row" },
                  "& .MuiToggleButton-root": {
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.15)",
                    borderRadius: "12px !important",
                    fontWeight: 800,
                    fontSize: "12.5px",
                    py: 0.8,
                    textTransform: "none",
                    "&.Mui-selected": {
                      background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                      color: "#fff",
                      borderColor: "transparent",
                    },
                  },
                }}
              >
                <ToggleButton value="compact">🔍 Compact (85%)</ToggleButton>
                <ToggleButton value="standard">⚖️ Standard (100%)</ToggleButton>
                <ToggleButton value="large">🔎 Large (125%)</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={() => setJoystickSettingsOpen(false)}
            sx={{
              borderRadius: "14px",
              fontWeight: 900,
              py: 1.2,
              background: "linear-gradient(135deg, #6366f1, #3b82f6)",
              textTransform: "none",
            }}
          >
            Done & Save Settings
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
