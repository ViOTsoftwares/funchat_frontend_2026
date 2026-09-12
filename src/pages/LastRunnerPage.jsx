import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Phaser from "phaser";
import LastRunnerScene from "../game/LastRunnerScene.js";
import LeaderboardWidget from "../components/LeaderboardWidget.jsx";
import { toastMessage } from "../lib/toast.message.js";

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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Grid,
} from "@mui/material";

import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ShuffleIcon from "@mui/icons-material/Shuffle";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import KeyIcon from "@mui/icons-material/Key";
import ShieldIcon from "@mui/icons-material/Shield";
import SpeedIcon from "@mui/icons-material/Speed";
import TimerIcon from "@mui/icons-material/Timer";
import ReplayIcon from "@mui/icons-material/Replay";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";

export default function LastRunnerPage({ socketRef, socketId, status: socketStatus }) {
  const navigate = useNavigate();

  // Mode & Room States
  const [viewState, setViewState] = useState("LOBBY"); // LOBBY, QUEUE, WAITING_CODE, COUNTDOWN, PLAYING, RESULT
  const [roomId, setRoomId] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const trackRef = useRef([]);

  // Player & Opponent State
  const [myRole, setMyRole] = useState("p1"); // "p1" or "p2"
  const [opponent, setOpponent] = useState(null); // { id, name }
  const [countdownVal, setCountdownVal] = useState(null);

  // In-Game Live HUD Stats
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [speedTier, setSpeedTier] = useState("Normal");
  const [myStats, setMyStats] = useState({
    distance: 0,
    speed: 320,
    attackItem: null,
    hasShield: false,
    isSlowed: false,
    slowPercent: 0,
  });
  const [opponentStats, setOpponentStats] = useState({
    distance: 0,
    speed: 320,
    hasShield: false,
    isSlowed: false,
  });

  // End Game Result
  const [gameResult, setGameResult] = useState(null); // { isWinner, reason, myDistance, attacksThrown, attacksHit }
  const [rematchVotes, setRematchVotes] = useState(0);

  // Phaser Game Instance Ref
  const gameContainerRef = useRef(null);
  const phaserGameRef = useRef(null);

  // Profile Name
  const myName =
    localStorage.getItem("funchat_saved_username") ||
    localStorage.getItem("funchat_profile_name") ||
    "Runner";

  // Prevent scroll / touch zoom during gameplay
  useEffect(() => {
    if (viewState === "PLAYING" || viewState === "COUNTDOWN") {
      document.body.classList.add("last-runner-active");
      const preventDefault = (e) => {
        if (e.touches && e.touches.length > 1) e.preventDefault();
      };
      window.addEventListener("touchmove", preventDefault, { passive: false });
      return () => {
        document.body.classList.remove("last-runner-active");
        window.removeEventListener("touchmove", preventDefault);
      };
    }
  }, [viewState]);

  // ── Clean up Phaser game ──
  const destroyPhaserGame = useCallback(() => {
    if (phaserGameRef.current) {
      phaserGameRef.current.destroy(true);
      phaserGameRef.current = null;
    }
  }, []);

  // ── Initialize Phaser Game ──
  const startPhaserGame = useCallback(
    (targetRoomId) => {
      destroyPhaserGame();

      if (!gameContainerRef.current) return;

      const config = {
        type: Phaser.AUTO,
        parent: gameContainerRef.current,
        width: Math.min(window.innerWidth, 800),
        height: Math.min(window.innerHeight - 80, 650),
        backgroundColor: "#090d16",
        physics: { default: "arcade" },
        scene: [LastRunnerScene],
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      const game = new Phaser.Game(config);
      phaserGameRef.current = game;

      game.scene.start("LastRunnerScene", {
        socket: socketRef.current,
        localPlayerId: socketRef.current?.id || socketId,
        roomId: targetRoomId,
        initialTrack: trackRef.current || [],
        onItemCollected: (itemType) => {
          toastMessage(`Collected ${itemType.toUpperCase()}! Press E to throw!`, "info");
        },
      });
    },
    [destroyPhaserGame, socketRef, socketId]
  );

  // ── Socket Events Setup ──
  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    // Queue status
    socket.on("lastRunner_queueStatus", ({ inQueue, queueSize }) => {
      if (inQueue) {
        setViewState("QUEUE");
      }
    });

    // Private game created
    socket.on("lastRunner_gameCreated", ({ code, roomId }) => {
      setRoomCode(code);
      setRoomId(roomId);
      setViewState("WAITING_CODE");
    });

    // Match Found (from Random Play or Private Code)
    socket.on("lastRunner_matchFound", ({ roomId: rId, role, opponent: opp }) => {
      setRoomId(rId);
      setMyRole(role);
      setOpponent(opp);
      setViewState("COUNTDOWN");
      setCountdownVal(3);
    });

    // Countdown tick
    socket.on("lastRunner_countdown", ({ count, track }) => {
      if (track && Array.isArray(track) && track.length > 0) {
        trackRef.current = track;
      }
      setCountdownVal(count);
      if (count === 0) {
        setViewState("PLAYING");
      }
    });

    // In-game authoritative state
    socket.on("lastRunner_gameState", ({ timeRemaining: timeRem, speedTier: tier, players, track }) => {
      if (track && Array.isArray(track) && track.length > 0 && trackRef.current.length === 0) {
        trackRef.current = track;
      }
      setTimeRemaining(timeRem);
      setSpeedTier(tier);

      const me = players.find((p) => p.id === socket.id);
      const rival = players.find((p) => p.id !== socket.id);

      if (me) {
        setMyStats({
          distance: me.distance,
          speed: me.speed,
          attackItem: me.attackItem,
          hasShield: me.hasShield,
          isSlowed: me.isSlowed,
          slowPercent: me.slowPercent,
          attacksThrown: me.attacksThrown,
          attacksHit: me.attacksHit,
        });
      }

      if (rival) {
        setOpponentStats({
          distance: rival.distance,
          speed: rival.speed,
          hasShield: rival.hasShield,
          isSlowed: rival.isSlowed,
        });
      }
    });

    // Game Ended
    socket.on("lastRunner_gameEnded", ({ reason, winner, isDraw, players }) => {
      const me = players.find((p) => p.id === socket.id);
      const isWinner = winner && winner.id === socket.id;

      setGameResult({
        isWinner,
        isDraw,
        reason,
        myDistance: me ? me.distance : 0,
        attacksThrown: me ? me.attacksThrown : 0,
        attacksHit: me ? me.attacksHit : 0,
        winnerName: winner ? winner.name : "Draw",
      });

      setViewState("RESULT");
      setRematchVotes(0);
    });

    // Rematch vote
    socket.on("lastRunner_rematchVote", ({ votesCount }) => {
      setRematchVotes(votesCount);
      toastMessage(`Player requested rematch (${votesCount}/2 ready)`, "info");
    });

    // Join error
    socket.on("lastRunner_joinError", ({ message }) => {
      toastMessage(message, "error");
    });

    return () => {
      socket.off("lastRunner_queueStatus");
      socket.off("lastRunner_gameCreated");
      socket.off("lastRunner_matchFound");
      socket.off("lastRunner_countdown");
      socket.off("lastRunner_gameState");
      socket.off("lastRunner_gameEnded");
      socket.off("lastRunner_rematchVote");
      socket.off("lastRunner_joinError");
      destroyPhaserGame();
    };
  }, [socketRef, destroyPhaserGame]);

  // Mount Phaser Game canvas once when entering match (COUNTDOWN or PLAYING)
  useEffect(() => {
    if ((viewState === "COUNTDOWN" || viewState === "PLAYING") && roomId) {
      if (!phaserGameRef.current) {
        const timer = setTimeout(() => {
          if (!phaserGameRef.current) {
            startPhaserGame(roomId);
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [viewState, roomId, startPhaserGame]);

  // ── Action: Random Play ──
  const handleRandomPlay = () => {
    if (!socketRef.current) return;
    setViewState("QUEUE");
    socketRef.current.emit("lastRunner_joinMatchmaking", { name: myName });
  };

  // ── Action: Cancel Queue ──
  const handleCancelQueue = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("lastRunner_leaveMatchmaking");
    setViewState("LOBBY");
  };

  // ── Action: Create Game with Code ──
  const handleCreateGame = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("lastRunner_createGame", { name: myName });
  };

  // ── Action: Join Game with Code ──
  const handleJoinGameSubmit = (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim() || !socketRef.current) return;
    socketRef.current.emit("lastRunner_joinGame", {
      code: joinCodeInput.trim(),
      name: myName,
    });
    setJoinModalOpen(false);
  };

  // ── Action: Throw Attack Item ──
  const handleThrowAttack = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("lastRunner_throwItem");
  };

  // ── Action: Touch Controls Trigger ──
  const sendTouchInput = (action) => {
    if (!socketRef.current) return;
    socketRef.current.emit("lastRunner_playerInput", { action });
  };

  // ── Action: Play Again Rematch ──
  const handlePlayAgain = () => {
    if (!socketRef.current) return;
    socketRef.current.emit("lastRunner_playAgain");
    toastMessage("Rematch requested! Waiting for opponent...", "info");
  };

  // ── Action: Leave Game to Lobby ──
  const handleLeaveToLobby = () => {
    if (socketRef.current) {
      socketRef.current.emit("lastRunner_leaveGame");
    }
    destroyPhaserGame();
    setViewState("LOBBY");
    setGameResult(null);
    setRoomId("");
    setRoomCode("");
  };

  // ── Action: Copy Room Code ──
  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      toastMessage("Room code copied to clipboard!", "success");
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  // Calculate Relative Race Distance
  const leadDiff = myStats.distance - opponentStats.distance;
  const leadPercent = Math.min(Math.max((leadDiff / 250) * 50 + 50, 5), 95);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* ═══════════════════════════════════════════════════════════════
          1. LOBBY VIEW (MATCHMAKING + TOP 10 LEADERBOARD)
      ═══════════════════════════════════════════════════════════════ */}
      {viewState === "LOBBY" && (
        <Grid
          container
          spacing={{ xs: 2.5, md: 3.5 }}
          justifyContent="center"
          alignItems="stretch"
          sx={{ maxWidth: 1200, mx: "auto", mt: { xs: 1, md: 2 } }}
        >
          {/* Left Column: Matchmaking Controls */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 3.5, sm: 5 },
                borderRadius: "32px",
                background: "rgba(15, 23, 42, 0.95)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                boxShadow: "0 25px 60px rgba(0, 0, 0, 0.7), 0 0 50px rgba(239, 68, 68, 0.15)",
                textAlign: "center",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                {/* Game Title & Badge */}
                <Box
                  sx={{
                    width: 76,
                    height: 76,
                    borderRadius: "24px",
                    background: "linear-gradient(135deg, #ef4444, #f59e0b)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 12px 35px rgba(239, 68, 68, 0.4)",
                    mb: 2.5,
                  }}
                >
                  <DirectionsRunIcon sx={{ fontSize: 44, color: "#fff" }} />
                </Box>

                <Stack direction="row" justifyContent="center" spacing={1} sx={{ mb: 1 }}>
                  <Chip
                    label="⚡ 1V1 RUNNING BATTLE"
                    size="small"
                    sx={{
                      fontWeight: 900,
                      fontSize: "11px",
                      background: "rgba(239, 68, 68, 0.18)",
                      color: "#f87171",
                      border: "1px solid rgba(239, 68, 68, 0.4)",
                    }}
                  />
                </Stack>

                <Typography
                  variant="h3"
                  fontWeight={900}
                  sx={{
                    background: "linear-gradient(135deg, #ffffff 0%, #fca5a5 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    letterSpacing: "-0.5px",
                    fontSize: { xs: "1.85rem", sm: "2.5rem" },
                    mb: 1,
                  }}
                >
                  LAST RUNNER
                </Typography>

                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "rgba(255, 255, 255, 0.75)",
                    maxWidth: 480,
                    mx: "auto",
                    mb: 3.5,
                    fontSize: "14.5px",
                    lineHeight: 1.6,
                  }}
                >
                  Run faster. Avoid obstacles. Collect attack objects and eliminate your rival to become the Last Runner standing!
                </Typography>

                {/* Lobby Option Buttons */}
                <Stack spacing={1.8} sx={{ maxWidth: 380, mx: "auto", mb: 3.5 }}>
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    startIcon={<ShuffleIcon />}
                    onClick={handleRandomPlay}
                    sx={{
                      borderRadius: "18px",
                      fontWeight: 900,
                      py: 1.5,
                      fontSize: "15.5px",
                      textTransform: "none",
                      background: "linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)",
                      boxShadow: "0 10px 30px rgba(239, 68, 68, 0.4)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #dc2626 0%, #d97706 100%)",
                        transform: "scale(1.02)",
                      },
                      transition: "all 0.2s ease",
                    }}
                  >
                    🎲 Random Play (Find Match)
                  </Button>

                  <Button
                    fullWidth
                    size="large"
                    variant="outlined"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleCreateGame}
                    sx={{
                      borderRadius: "18px",
                      fontWeight: 800,
                      py: 1.3,
                      fontSize: "14.5px",
                      textTransform: "none",
                      color: "#fff",
                      borderColor: "rgba(255, 255, 255, 0.2)",
                      background: "rgba(255, 255, 255, 0.04)",
                      "&:hover": {
                        borderColor: "#ef4444",
                        background: "rgba(239, 68, 68, 0.1)",
                      },
                    }}
                  >
                    ➕ Create Game (With Code)
                  </Button>

                  <Button
                    fullWidth
                    size="large"
                    variant="outlined"
                    startIcon={<KeyIcon />}
                    onClick={() => setJoinModalOpen(true)}
                    sx={{
                      borderRadius: "18px",
                      fontWeight: 800,
                      py: 1.3,
                      fontSize: "14.5px",
                      textTransform: "none",
                      color: "#a5b4fc",
                      borderColor: "rgba(99, 102, 241, 0.4)",
                      background: "rgba(99, 102, 241, 0.08)",
                      "&:hover": {
                        borderColor: "#6366f1",
                        background: "rgba(99, 102, 241, 0.16)",
                      },
                    }}
                  >
                    🔑 Join Game (Enter Code)
                  </Button>
                </Stack>
              </Box>

              {/* Controls hint footer */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "18px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  display: "flex",
                  justifyContent: "space-around",
                  flexWrap: "wrap",
                  gap: 1,
                  fontSize: "11.5px",
                  color: "rgba(255,255,255,0.7)",
                }}
              >
                <span>⌨️ <strong>A / D or ← / →</strong>: Lanes</span>
                <span>⌨️ <strong>W / Space</strong>: Jump</span>
                <span>⌨️ <strong>S / ↓</strong>: Slide</span>
                <span>🎯 <strong>E key</strong>: Throw</span>
              </Box>
            </Paper>
          </Grid>

          {/* Right Column: Top 10 Last Runners Leaderboard */}
          <Grid item xs={12} md={5}>
            <LeaderboardWidget
              gameSlug="last-runner"
              title="🏆 Top 10 Last Runners"
              subtitle="ALL-TIME 1v1 BATTLE HEROES"
              compact={true}
            />
          </Grid>
        </Grid>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          2. RANDOM MATCHMAKING QUEUE VIEW
      ═══════════════════════════════════════════════════════════════ */}
      {viewState === "QUEUE" && (
        <Paper
          elevation={0}
          sx={{
            maxWidth: 540,
            mx: "auto",
            mt: 8,
            p: 6,
            borderRadius: "32px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          }}
        >
          <CircularProgress size={56} sx={{ color: "#ef4444", mb: 3 }} />

          <Typography variant="h4" fontWeight={900} sx={{ color: "#fff", mb: 1 }}>
            Searching for Opponent...
          </Typography>

          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mb: 4 }}>
            Looking for an available player to battle 1v1. Get ready to run!
          </Typography>

          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleCancelQueue}
            sx={{
              borderRadius: "14px",
              fontWeight: 700,
              textTransform: "none",
              color: "rgba(255,255,255,0.8)",
              borderColor: "rgba(255,255,255,0.2)",
              "&:hover": { borderColor: "#ef4444", color: "#ef4444" },
            }}
          >
            Cancel Matchmaking
          </Button>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          3. PRIVATE GAME CODE WAITING VIEW
      ═══════════════════════════════════════════════════════════════ */}
      {viewState === "WAITING_CODE" && (
        <Paper
          elevation={0}
          sx={{
            maxWidth: 580,
            mx: "auto",
            mt: 6,
            p: { xs: 4, sm: 6 },
            borderRadius: "32px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(99, 102, 241, 0.4)",
            textAlign: "center",
            boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
          }}
        >
          <Typography variant="caption" fontWeight={800} sx={{ color: "#818cf8", letterSpacing: "1px" }}>
            YOUR PRIVATE GAME CODE
          </Typography>

          <Box
            sx={{
              my: 3,
              p: 2.5,
              borderRadius: "24px",
              background: "rgba(99, 102, 241, 0.12)",
              border: "2px dashed #6366f1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Typography
              variant="h3"
              fontWeight={900}
              sx={{ color: "#fff", letterSpacing: "6px", fontFamily: "monospace" }}
            >
              {roomCode}
            </Typography>

            <Button
              variant="contained"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={handleCopyCode}
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 800,
                background: copiedCode ? "#10b981" : "#6366f1",
              }}
            >
              {copiedCode ? "Copied!" : "Copy"}
            </Button>
          </Box>

          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)", mb: 4 }}>
            Share this code with your opponent. As soon as they enter it, the 1v1 match will start automatically!
          </Typography>

          <Stack direction="row" justifyContent="center" alignItems="center" spacing={1.5} sx={{ mb: 4 }}>
            <CircularProgress size={20} sx={{ color: "#818cf8" }} />
            <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
              Waiting for opponent to connect...
            </Typography>
          </Stack>

          <Button
            variant="outlined"
            onClick={handleLeaveToLobby}
            sx={{
              borderRadius: "14px",
              fontWeight: 700,
              textTransform: "none",
              color: "rgba(255,255,255,0.7)",
              borderColor: "rgba(255,255,255,0.2)",
            }}
          >
            Back to Lobby
          </Button>
        </Paper>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          4. COUNTDOWN OVERLAY
      ═══════════════════════════════════════════════════════════════ */}
      {viewState === "COUNTDOWN" && countdownVal !== null && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(9, 13, 22, 0.85)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="h5"
            fontWeight={800}
            sx={{ color: "#f87171", mb: 2, letterSpacing: "1px" }}
          >
            MATCH FOUND! 1 VS 1
          </Typography>

          <Typography
            variant="h6"
            sx={{ color: "#fff", mb: 4, fontSize: { xs: "1rem", sm: "1.25rem" } }}
          >
            {myName} <span style={{ color: "#f59e0b" }}>VS</span> {opponent?.name || "Rival"}
          </Typography>

          <Typography
            variant="h1"
            fontWeight={900}
            sx={{
              fontSize: { xs: "6rem", sm: "9rem" },
              color: countdownVal === 0 ? "#10b981" : "#fff",
              textShadow: "0 0 40px rgba(239, 68, 68, 0.8)",
              animation: "pulse 0.8s infinite",
            }}
          >
            {countdownVal === 0 ? "GO!" : countdownVal}
          </Typography>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          5. PLAYING STATE: IN-GAME HUD & PHASER CANVAS
      ═══════════════════════════════════════════════════════════════ */}
      {(viewState === "PLAYING" || viewState === "COUNTDOWN") && (
        <Box sx={{ position: "relative", width: "100%", maxWidth: 800, mx: "auto" }}>
          {/* Top HUD Bar */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mb: 1.5,
              borderRadius: "20px",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(12px)",
            }}
          >
            {/* Top row: Timer, Speed Tier, Action items */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              {/* Timer */}
              <Stack direction="row" alignItems="center" spacing={1}>
                <TimerIcon sx={{ color: "#f59e0b", fontSize: 22 }} />
                <Typography variant="h6" fontWeight={900} sx={{ color: "#fff" }}>
                  {timeRemaining}s
                </Typography>
              </Stack>

              {/* Speed Tier Badge */}
              <Chip
                icon={<SpeedIcon sx={{ fontSize: 16 }} />}
                label={`SPEED: ${speedTier.toUpperCase()}`}
                size="small"
                sx={{
                  fontWeight: 900,
                  fontSize: "11px",
                  background:
                    speedTier === "Extreme"
                      ? "rgba(239, 68, 68, 0.2)"
                      : speedTier === "Very Fast"
                      ? "rgba(245, 158, 11, 0.2)"
                      : "rgba(99, 102, 241, 0.2)",
                  color:
                    speedTier === "Extreme"
                      ? "#f87171"
                      : speedTier === "Very Fast"
                      ? "#fde047"
                      : "#a5b4fc",
                }}
              />

              {/* Opponent Status */}
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.7)", fontWeight: 700 }}>
                RIVAL: {opponent?.name || "Opponent"}{" "}
                {opponentStats.isSlowed && "❄️ SLOWED"}{" "}
                {opponentStats.hasShield && "🛡️ SHIELD"}
              </Typography>
            </Stack>

            {/* Distance Progress Bar (Head to Head) */}
            <Box sx={{ mt: 1.5 }}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="caption" fontWeight={800} sx={{ color: "#38bdf8" }}>
                  YOU: {Math.round(myStats.distance)}m {myStats.isSlowed && "(SLOWED)"}
                </Typography>
                <Typography variant="caption" fontWeight={800} sx={{ color: "#f43f5e" }}>
                  RIVAL: {Math.round(opponentStats.distance)}m
                </Typography>
              </Stack>

              <Box sx={{ position: "relative", height: 10, borderRadius: 5, background: "#1e293b", overflow: "hidden" }}>
                <Box
                  sx={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${leadPercent}%`,
                    background: "linear-gradient(90deg, #38bdf8, #818cf8)",
                    transition: "width 0.2s linear",
                  }}
                />
              </Box>
            </Box>
          </Paper>

          {/* Phaser Canvas Container */}
          <Box
            ref={gameContainerRef}
            sx={{
              width: "100%",
              height: { xs: 460, sm: 540, md: 580 },
              borderRadius: "28px",
              overflow: "hidden",
              border: "2px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
              position: "relative",
            }}
          />

          {/* Bottom Action Bar: Inventory & Mobile Controls */}
          <Paper
            elevation={0}
            sx={{
              p: 2,
              mt: 1.5,
              borderRadius: "20px",
              background: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            {/* Inventory Slot */}
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  p: 1,
                  px: 2,
                  borderRadius: "14px",
                  background: myStats.attackItem ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)",
                  border: myStats.attackItem ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography variant="caption" fontWeight={800} sx={{ color: "rgba(255,255,255,0.6)" }}>
                  ATTACK:
                </Typography>
                <Typography variant="body1" fontWeight={900} sx={{ color: "#fff" }}>
                  {myStats.attackItem === "mud"
                    ? "🥚 Mud Ball"
                    : myStats.attackItem === "ice"
                    ? "🧊 Ice Ball"
                    : myStats.attackItem === "bomb"
                    ? "💣 Bomb"
                    : "EMPTY"}
                </Typography>
              </Box>

              {/* Shield Status */}
              <Box
                sx={{
                  p: 1,
                  px: 2,
                  borderRadius: "14px",
                  background: myStats.hasShield ? "rgba(56, 189, 248, 0.2)" : "rgba(255,255,255,0.05)",
                  border: myStats.hasShield ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <ShieldIcon sx={{ fontSize: 18, color: myStats.hasShield ? "#38bdf8" : "rgba(255,255,255,0.3)" }} />
                <Typography variant="caption" fontWeight={800} sx={{ color: myStats.hasShield ? "#38bdf8" : "rgba(255,255,255,0.5)" }}>
                  {myStats.hasShield ? "SHIELD ACTIVE" : "NO SHIELD"}
                </Typography>
              </Box>
            </Stack>

            {/* Throw Attack Button */}
            <Button
              variant="contained"
              disabled={!myStats.attackItem}
              onClick={handleThrowAttack}
              sx={{
                borderRadius: "14px",
                fontWeight: 900,
                px: 3,
                py: 1,
                textTransform: "none",
                background: myStats.attackItem
                  ? "linear-gradient(135deg, #ef4444, #f59e0b)"
                  : "rgba(255,255,255,0.1)",
                color: "#fff",
                boxShadow: myStats.attackItem ? "0 8px 25px rgba(239, 68, 68, 0.4)" : "none",
              }}
            >
              🎯 THROW ATTACK [E]
            </Button>
          </Paper>

          {/* On-Screen Mobile Touch Buttons */}
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              justifyContent: "space-between",
              mt: 2,
              gap: 1.5,
            }}
          >
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => sendTouchInput("left")}
                sx={{ borderRadius: "14px", py: 1.5, minWidth: 60, fontWeight: 900, background: "#1e293b" }}
              >
                ◀ LEFT
              </Button>
              <Button
                variant="contained"
                onClick={() => sendTouchInput("right")}
                sx={{ borderRadius: "14px", py: 1.5, minWidth: 60, fontWeight: 900, background: "#1e293b" }}
              >
                RIGHT ▶
              </Button>
            </Stack>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => sendTouchInput("jump")}
                sx={{ borderRadius: "14px", py: 1.5, minWidth: 65, fontWeight: 900, background: "#6366f1" }}
              >
                ▲ JUMP
              </Button>
              <Button
                variant="contained"
                onClick={() => sendTouchInput("slide")}
                sx={{ borderRadius: "14px", py: 1.5, minWidth: 65, fontWeight: 900, background: "#8b5cf6" }}
              >
                ▼ SLIDE
              </Button>
            </Stack>
          </Box>
        </Box>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          6. GAME RESULT OVERLAY (WINNER / LOSER & PLAY AGAIN)
      ═══════════════════════════════════════════════════════════════ */}
      {viewState === "RESULT" && gameResult && (
        <Paper
          elevation={0}
          sx={{
            maxWidth: 580,
            mx: "auto",
            mt: 4,
            p: { xs: 4, sm: 6 },
            borderRadius: "36px",
            background: "rgba(15, 23, 42, 0.95)",
            border: gameResult.isWinner ? "2px solid #10b981" : "2px solid #ef4444",
            boxShadow: gameResult.isWinner
              ? "0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(16, 185, 129, 0.2)"
              : "0 25px 60px rgba(0,0,0,0.8), 0 0 50px rgba(239, 68, 68, 0.2)",
            textAlign: "center",
          }}
        >
          <Typography variant="h1" sx={{ fontSize: "4.5rem", mb: 2 }}>
            {gameResult.isWinner ? "🏆" : "💥"}
          </Typography>

          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              color: gameResult.isWinner ? "#10b981" : "#f87171",
              letterSpacing: "-0.5px",
              mb: 1,
            }}
          >
            {gameResult.isWinner ? "YOU WIN!" : "YOU LOST"}
          </Typography>

          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.8)", mb: 4 }}>
            {gameResult.isWinner
              ? "Your rival was eliminated! You are the Last Runner standing."
              : "You crashed into an obstacle. Your rival survived longer."}
          </Typography>

          {/* Match Stats */}
          <Box
            sx={{
              p: 3,
              borderRadius: "20px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              mb: 4,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 2,
            }}
          >
            <div>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>
                DISTANCE
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: "#fff" }}>
                {Math.round(gameResult.myDistance)}m
              </Typography>
            </div>
            <div>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>
                ATTACKS THROWN
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: "#f59e0b" }}>
                {gameResult.attacksThrown}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>
                HITS LANDED
              </Typography>
              <Typography variant="h5" fontWeight={900} sx={{ color: "#38bdf8" }}>
                {gameResult.attacksHit}
              </Typography>
            </div>
          </Box>

          {/* Action Buttons */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              startIcon={<ReplayIcon />}
              onClick={handlePlayAgain}
              sx={{
                borderRadius: "16px",
                fontWeight: 900,
                px: 4,
                py: 1.4,
                textTransform: "none",
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 10px 25px rgba(16, 185, 129, 0.35)",
              }}
            >
              🔄 Play Again {rematchVotes > 0 && `(${rematchVotes}/2)`}
            </Button>

            <Button
              variant="outlined"
              size="large"
              startIcon={<ExitToAppIcon />}
              onClick={handleLeaveToLobby}
              sx={{
                borderRadius: "16px",
                fontWeight: 700,
                px: 3,
                py: 1.4,
                color: "rgba(255,255,255,0.7)",
                borderColor: "rgba(255,255,255,0.2)",
                textTransform: "none",
              }}
            >
              🏠 Back to Lobby
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ── Dialog: Join with Code Modal ── */}
      <Dialog
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: "28px",
            background: "#0f172a",
            color: "#fff",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            p: 2,
            minWidth: 320,
          },
        }}
      >
        <DialogTitle fontWeight={900} sx={{ textAlign: "center" }}>
          🔑 Enter Game Code
        </DialogTitle>
        <form onSubmit={handleJoinGameSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              placeholder="e.g. ABC123"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              inputProps={{ maxLength: 6, style: { textAlign: "center", letterSpacing: "4px", fontWeight: "bold" } }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                },
              }}
            />
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
            <Button onClick={() => setJoinModalOpen(false)} sx={{ color: "rgba(255,255,255,0.5)" }}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                borderRadius: "12px",
                fontWeight: 800,
                background: "#6366f1",
              }}
            >
              Join Match
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
