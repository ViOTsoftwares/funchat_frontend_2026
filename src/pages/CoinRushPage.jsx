import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Phaser from "phaser";
import CoinRushScene from "../game/CoinRushScene.js";
import { playCountdownSound, playGameOverSound } from "../game/soundEffects.js";
import { toastMessage } from "../lib/toast.message.js";

import {
  Box,
  Button,
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
    try {
      const saved = localStorage.getItem("funchat_joystick_config");
      return saved ? JSON.parse(saved) : { theme: "neon", mode: "fixed", size: "standard" };
    } catch {
      return { theme: "neon", mode: "fixed", size: "standard" };
    }
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

  // Handle orientation changes and window resizing for Phaser scale auto-refresh
  useEffect(() => {
    const handleResize = () => {
      if (phaserGameRef.current && phaserGameRef.current.scale) {
        phaserGameRef.current.scale.refresh();
      }
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

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
          forceSetTimeOut: true,
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
    <Container maxWidth="xl" sx={{ pt: { xs: 7, sm: 10, md: 11 }, pb: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2, md: 3 } }}>
      {/* ── LOBBY VIEW: Create / Join Room / Quick Match ── */}
      {gameStatus === "LOBBY" && (
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
      )}

      {/* ── ROOM / GAME ARENA CONTAINER ── */}
      {gameStatus !== "LOBBY" && (
        <Box className="coin-rush-game-wrapper" sx={{ position: "relative", width: "100%", mx: "auto" }}>

          {/* ── HUD OVERLAY: Score, Timer, Leaderboard ── */}
          <Box
            sx={{
              position: "absolute",
              top: { xs: 8, sm: 14 },
              left: { xs: 8, sm: 14 },
              right: { xs: 8, sm: 14 },
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              pointerEvents: "none",
            }}
          >
            {/* Top-Left: Mobile Back Arrow, Joystick Tune Icon & Player Score */}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ pointerEvents: "auto" }}>
              <Tooltip title="Leave Game / Exit Room">
                <IconButton
                  onClick={() => setLeaveWarningOpen(true)}
                  sx={{
                    color: "#f87171",
                    background: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
                    p: { xs: "6px", sm: "8px" },
                    "&:hover": {
                      background: "rgba(239, 68, 68, 0.25)",
                      transform: "scale(1.05)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <ArrowBackIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="Customize Virtual Joystick">
                <IconButton
                  onClick={() => setJoystickSettingsOpen(true)}
                  sx={{
                    color: "#818cf8",
                    background: "rgba(15, 23, 42, 0.9)",
                    backdropFilter: "blur(16px)",
                    border: "1px solid rgba(99, 102, 241, 0.4)",
                    boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
                    p: { xs: "6px", sm: "8px" },
                    "&:hover": {
                      background: "rgba(99, 102, 241, 0.25)",
                      transform: "scale(1.05)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  <TuneIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
                </IconButton>
              </Tooltip>

              <Paper
                elevation={0}
                sx={{
                  p: { xs: "5px 10px", sm: "8px 18px" },
                  borderRadius: { xs: "12px", sm: "16px" },
                  background: "rgba(15, 23, 42, 0.88)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(245, 158, 11, 0.5)",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.5), 0 0 20px rgba(245, 158, 11, 0.2)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography variant="h6" fontWeight={900} sx={{ fontSize: { xs: "12px", sm: "17px" }, color: "#fde047", letterSpacing: "0.5px" }}>
                  🪙 {myScore} pts
                </Typography>
              </Paper>
            </Stack>

            {/* Top-Center: Round Timer */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: "5px 14px", sm: "8px 24px" },
                borderRadius: { xs: "14px", sm: "18px" },
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(16px)",
                border: timeRemaining <= 10 ? "1px solid #ef4444" : "1px solid rgba(99, 102, 241, 0.5)",
                boxShadow: timeRemaining <= 10 ? "0 0 25px rgba(239, 68, 68, 0.4)" : "0 10px 25px rgba(0,0,0,0.5)",
                color: timeRemaining <= 10 ? "#ef4444" : "#fff",
                pointerEvents: "auto",
                textAlign: "center",
              }}
            >
              <Stack direction="row" spacing={0.8} alignItems="center">
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: timeRemaining <= 10 ? "#ef4444" : "#22c55e",
                    boxShadow: timeRemaining <= 10 ? "0 0 10px #ef4444" : "0 0 10px #22c55e",
                  }}
                />
                <TimerIcon sx={{ fontSize: { xs: 16, sm: 20 }, color: timeRemaining <= 10 ? "#ef4444" : "#818cf8" }} />
                <Typography variant="h6" fontWeight={900} sx={{ fontSize: { xs: "13px", sm: "18px" }, fontFamily: "monospace" }}>
                  {(() => {
                    const s = Math.max(0, Number(timeRemaining) || 0);
                    const mins = Math.floor(s / 60);
                    const rem = s % 60;
                    return `${mins < 10 ? '0' + mins : mins}:${rem < 10 ? '0' + rem : rem}`;
                  })()}
                </Typography>
              </Stack>
            </Paper>

            {/* Top-Right: Live Leaderboard */}
            <Paper
              elevation={0}
              sx={{
                p: { xs: 1.2, sm: 2 },
                borderRadius: { xs: "14px", sm: "18px" },
                background: "rgba(15, 23, 42, 0.88)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
                color: "#fff",
                pointerEvents: "auto",
                minWidth: { xs: 120, sm: 180 },
              }}
            >
              <Typography variant="caption" fontWeight={900} sx={{ fontSize: { xs: "10px", sm: "12px" }, color: "rgba(255, 255, 255, 0.6)", mb: 0.8, display: "block", letterSpacing: "0.5px" }}>
                🏆 LEADERBOARD ({players.length}/{activeMaxCapacity})
              </Typography>
              {sortedPlayers.slice(0, typeof window !== "undefined" && window.innerWidth < 600 ? 2 : 5).map((p, idx) => {
                const isMe = p.id === socketRef.current?.id;
                return (
                  <Stack
                    key={p.id}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      py: 0.3,
                      px: 0.8,
                      mb: 0.3,
                      borderRadius: "8px",
                      background: isMe ? "rgba(99, 102, 241, 0.3)" : idx === 0 ? "rgba(245, 158, 11, 0.15)" : "transparent",
                    }}
                  >
                    <Typography variant="caption" fontWeight={700} sx={{ fontSize: { xs: "10.5px", sm: "12px" }, color: p.color || "#fff" }}>
                      {idx === 0 ? "👑" : `${idx + 1}.`} {p.name} {isMe ? "(You)" : ""}
                    </Typography>
                    <Typography variant="caption" fontWeight={900} sx={{ fontSize: { xs: "10.5px", sm: "12px" }, color: "#fde047", ml: 0.5 }}>
                      {p.score}
                    </Typography>
                  </Stack>
                );
              })}
            </Paper>
          </Box>

          {/* Bottom-Right: Active Power-up indicator */}
          {myPowerUp && powerUpTimeLeft > 0 && (
            <Paper
              elevation={0}
              sx={{
                position: "absolute",
                bottom: 24,
                right: 24,
                zIndex: 10,
                p: "10px 20px",
                borderRadius: "16px",
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(16px)",
                border: "1px solid #38bdf8",
                boxShadow: "0 0 25px rgba(56, 189, 248, 0.4)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 1.2,
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
                zIndex: 20,
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

          {/* ── ROOM WAITING LOBBY OVERLAY ── */}
          {gameStatus === "WAITING" && (
            <Box
              sx={{
                position: "absolute",
                top: 70,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 15,
                width: "92%",
                maxWidth: 580,
                p: 4,
                borderRadius: "24px",
                background: "rgba(15, 23, 42, 0.94)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(99, 102, 241, 0.35)",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7)",
                color: "#fff",
                textAlign: "center",
              }}
            >
              <Stack direction="row" justifyContent="center" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                <Chip
                  label={activeMaxCapacity === 2 ? "👥 2 Players (1v1)" : activeMaxCapacity === 4 ? "⚔️ 4 Players Mode" : "🔥 8 Players Mode"}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 800 }}
                />
                <Typography variant="h6" fontWeight={800}>
                  ROOM: <span style={{ color: "#818cf8", letterSpacing: "2px" }}>{roomId}</span>
                </Typography>
                <Tooltip title="Copy Room Code">
                  <IconButton size="small" onClick={copyRoomCode} sx={{ color: "#818cf8", background: "rgba(129, 140, 248, 0.15)" }}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 3 }}>
                Waiting for players ({players.length}/{activeMaxCapacity}). Auto-starts when full!
              </Typography>

              {/* Player List Grid */}
              <Grid container spacing={1.5} justifyContent="center" sx={{ mb: 3.5 }}>
                {players.map((p) => (
                  <Grid item key={p.id}>
                    <Chip
                      avatar={<Avatar sx={{ bgcolor: p.color || "#38bdf8", color: "#fff", fontWeight: 800 }}>{p.name.charAt(0)}</Avatar>}
                      label={`${p.name} ${p.isHost ? "👑 Host" : ""}`}
                      sx={{
                        fontWeight: 800,
                        color: "#fff",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: `1px solid ${p.color || "#38bdf8"}`,
                        px: 1,
                        py: 2.2,
                        borderRadius: "14px",
                      }}
                    />
                  </Grid>
                ))}
              </Grid>

              <Stack direction="row" spacing={2} justifyContent="center">
                {isHost ? (
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<PlayArrowIcon />}
                    onClick={handleStartGame}
                    disabled={players.length < 2}
                    sx={{
                      borderRadius: "14px",
                      fontWeight: 800,
                      px: 4,
                      py: 1.4,
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      boxShadow: "0 8px 25px rgba(34, 197, 94, 0.4)",
                      textTransform: "none",
                      "&:hover": { background: "#16a34a" },
                    }}
                  >
                    Start Round ({players.length >= 2 ? "Ready to Launch" : "Need 2+ Players"})
                  </Button>
                ) : (
                  <Chip
                    icon={<CheckCircleIcon sx={{ color: "#86efac !important" }} />}
                    label="Waiting for room host to start..."
                    sx={{ background: "rgba(34, 197, 94, 0.15)", color: "#86efac", fontWeight: 800, py: 2, borderRadius: "14px" }}
                  />
                )}

                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ExitToAppIcon />}
                  onClick={handleLeaveRoom}
                  sx={{ borderRadius: "14px", textTransform: "none", px: 3 }}
                >
                  Leave Room
                </Button>
              </Stack>
            </Box>
          )}

          {/* ── WINNER / RESULTS MODAL OVERLAY ── */}
          {gameStatus === "ENDED" && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(15, 23, 42, 0.9)",
                backdropFilter: "blur(16px)",
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  width: "92%",
                  maxWidth: 540,
                  p: 4,
                  borderRadius: "28px",
                  background: "rgba(30, 41, 59, 0.96)",
                  border: "1px solid rgba(245, 158, 11, 0.5)",
                  color: "#fff",
                  textAlign: "center",
                  boxShadow: "0 25px 70px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.25)",
                }}
              >
                <EmojiEventsIcon sx={{ fontSize: 68, color: "#f59e0b", mb: 1 }} />
                <Typography variant="h4" fontWeight={900} sx={{ color: "#fff", mb: 0.5, letterSpacing: "-0.5px" }}>
                  ROUND COMPLETE!
                </Typography>

                {winner && (
                  <Box sx={{ my: 2.5, p: 2.5, borderRadius: "20px", background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(236, 72, 153, 0.2))", border: "1px solid rgba(245, 158, 11, 0.4)" }}>
                    <Typography variant="caption" fontWeight={900} sx={{ color: "#fde047", letterSpacing: "1px" }}>
                      🏆 COIN RUSH CHAMPION
                    </Typography>
                    <Typography variant="h4" fontWeight={900} sx={{ color: "#fff", my: 0.5 }}>
                      {winner.name}
                    </Typography>
                    <Typography variant="subtitle1" fontWeight={900} sx={{ color: "#fde047" }}>
                      {winner.score} Total Coins Collected!
                    </Typography>
                  </Box>
                )}

                {/* Final Leaderboard */}
                <Typography variant="caption" fontWeight={900} sx={{ color: "rgba(255, 255, 255, 0.6)", mt: 2, mb: 1, display: "block", letterSpacing: "1px" }}>
                  FINAL LEADERBOARD
                </Typography>
                <Table size="small" sx={{ mb: 3.5 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Rank</TableCell>
                      <TableCell sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Player</TableCell>
                      <TableCell align="right" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 800 }}>Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {endLeaderboard.map((p, idx) => (
                      <TableRow key={p.id}>
                        <TableCell sx={{ color: "#fff", fontWeight: 800 }}>
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}`}
                        </TableCell>
                        <TableCell sx={{ color: "#fff", fontWeight: 800 }}>{p.name}</TableCell>
                        <TableCell align="right" sx={{ color: "#fde047", fontWeight: 900 }}>{p.score} pts</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Stack direction="row" spacing={2} justifyContent="center">
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
                        px: 4,
                        py: 1.2,
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
                    sx={{ borderRadius: "14px", textTransform: "none", px: 3 }}
                  >
                    Leave Room
                  </Button>
                </Stack>
              </Paper>
            </Box>
          )}

          {/* ── PHASER CANVAS MOUNT CONTAINER ── */}
          <Box
            ref={canvasContainerRef}
            className="coin-rush-canvas-container"
            sx={{
              width: "100%",
              height: { xs: "calc(100vh - 120px)", sm: "640px", md: "720px" },
              minHeight: { xs: 0, sm: "480px", md: "600px" },
              borderRadius: { xs: "20px", sm: "28px" },
              overflow: "hidden",
              border: "1px solid rgba(99, 102, 241, 0.35)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.15)",
              background: "#090d16",
              touchAction: "none",
            }}
          />
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
    </Container>
  );
}
