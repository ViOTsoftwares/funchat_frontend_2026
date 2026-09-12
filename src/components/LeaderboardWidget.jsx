import { useState, useEffect, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import RefreshIcon from "@mui/icons-material/Refresh";
import DirectionsRunIcon from "@mui/icons-material/DirectionsRun";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { GetGameLeaderboardApi } from "../Api.js";

export default function LeaderboardWidget({
  gameSlug = "coin-rush",
  title,
  subtitle,
  compact = false,
  maxItems = 10,
}) {
  const isCoinRush = gameSlug === "coin-rush";

  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await GetGameLeaderboardApi(gameSlug);
      if (res?.success && Array.isArray(res.result)) {
        setLeaderboard(res.result);
      } else {
        setLeaderboard([]);
      }
    } catch {
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  }, [gameSlug]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const displayedList = (leaderboard || []).slice(0, maxItems);

  // Accent color themes based on game
  const themeGradient = isCoinRush
    ? "linear-gradient(135deg, #f59e0b, #ec4899)"
    : "linear-gradient(135deg, #ef4444, #f59e0b)";
  const themeBorder = isCoinRush ? "rgba(245, 158, 11, 0.35)" : "rgba(239, 68, 68, 0.35)";
  const themeGlow = isCoinRush ? "rgba(245, 158, 11, 0.15)" : "rgba(239, 68, 68, 0.15)";
  const themeIconColor = isCoinRush ? "#fde047" : "#f87171";

  return (
    <Paper
      elevation={0}
      sx={{
        p: compact ? { xs: 2, sm: 2.5 } : { xs: 2.5, sm: 3.5 },
        borderRadius: { xs: "20px", sm: "28px" },
        background: "rgba(15, 23, 42, 0.85)",
        backdropFilter: "blur(24px)",
        border: `1px solid ${themeBorder}`,
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.6), 0 0 35px ${themeGlow}`,
        color: "#fff",
        position: "relative",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Top Accent Strip */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: themeGradient,
        }}
      />

      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: compact ? 2 : 2.5 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: compact ? 38 : 46,
              height: compact ? 38 : 46,
              borderRadius: "14px",
              background: themeGradient,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 8px 20px ${themeGlow}`,
            }}
          >
            {isCoinRush ? (
              <MonetizationOnIcon sx={{ fontSize: compact ? 22 : 26, color: "#fff" }} />
            ) : (
              <DirectionsRunIcon sx={{ fontSize: compact ? 22 : 26, color: "#fff" }} />
            )}
          </Box>
          <Box>
            <Typography
              variant={compact ? "subtitle1" : "h6"}
              fontWeight={900}
              sx={{
                fontSize: compact ? "1rem" : "1.2rem",
                color: "#fff",
                letterSpacing: "-0.3px",
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              {title || (isCoinRush ? "🏆 Top 10 Coin Rush Players" : "🏆 Top 10 Last Runners")}
            </Typography>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ color: themeIconColor, letterSpacing: "0.5px" }}
            >
              {subtitle || "ALL-TIME HALL OF FAME"}
            </Typography>
          </Box>
        </Stack>

        <Tooltip title="Refresh Leaderboard">
          <IconButton
            size="small"
            onClick={fetchLeaderboard}
            disabled={loading}
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              background: "rgba(255, 255, 255, 0.06)",
              borderRadius: "10px",
              "&:hover": { background: "rgba(255, 255, 255, 0.15)", color: "#fff" },
            }}
          >
            {loading ? (
              <CircularProgress size={16} sx={{ color: themeIconColor }} />
            ) : (
              <RefreshIcon sx={{ fontSize: 18 }} />
            )}
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Loading State */}
      {loading && displayedList.length === 0 && (
        <Box sx={{ py: 6, textAlign: "center" }}>
          <CircularProgress size={32} sx={{ color: themeIconColor, mb: 1.5 }} />
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", display: "block" }}>
            Loading live leaderboard...
          </Typography>
        </Box>
      )}

      {/* Empty State: No real matches recorded yet */}
      {!loading && displayedList.length === 0 && (
        <Box
          sx={{
            py: compact ? 4 : 5,
            px: 2.5,
            textAlign: "center",
            borderRadius: "18px",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px dashed rgba(255, 255, 255, 0.12)",
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 44, color: themeIconColor, mb: 1, opacity: 0.6 }} />
          <Typography variant="subtitle1" fontWeight={800} sx={{ color: "#fff", mb: 0.5 }}>
            No Player Rankings Yet
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: "rgba(255, 255, 255, 0.6)",
              maxWidth: 340,
              display: "block",
              mx: "auto",
              lineHeight: 1.5,
            }}
          >
            {isCoinRush
              ? "Complete a match in Coin Rush and collect coins to claim the #1 spot on the leaderboard!"
              : "Play a 1v1 battle in Last Runner to earn your place on the all-time leaderboard!"}
          </Typography>
        </Box>
      )}

      {/* Leaderboard Table / Rows */}
      {displayedList.length > 0 && (
        <Stack spacing={compact ? 1 : 1.2}>
          {displayedList.map((player, idx) => {
            const rank = idx + 1;
            const isTop1 = rank === 1;
            const isTop2 = rank === 2;
            const isTop3 = rank === 3;

            // Rank styling
            let rankBg = "rgba(255, 255, 255, 0.05)";
            let rankBorder = "1px solid rgba(255, 255, 255, 0.08)";
            let rankBadgeBg = "rgba(255, 255, 255, 0.1)";
            let rankTextColor = "#94a3b8";

            if (isTop1) {
              rankBg = "linear-gradient(90deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.04))";
              rankBorder = "1px solid rgba(245, 158, 11, 0.5)";
              rankBadgeBg = "linear-gradient(135deg, #f59e0b, #d97706)";
              rankTextColor = "#fef08a";
            } else if (isTop2) {
              rankBg = "linear-gradient(90deg, rgba(203, 213, 225, 0.14), rgba(203, 213, 225, 0.03))";
              rankBorder = "1px solid rgba(203, 213, 225, 0.4)";
              rankBadgeBg = "linear-gradient(135deg, #94a3b8, #64748b)";
              rankTextColor = "#f1f5f9";
            } else if (isTop3) {
              rankBg = "linear-gradient(90deg, rgba(217, 119, 6, 0.14), rgba(217, 119, 6, 0.03))";
              rankBorder = "1px solid rgba(217, 119, 6, 0.4)";
              rankBadgeBg = "linear-gradient(135deg, #b45309, #78350f)";
              rankTextColor = "#fdba74";
            }

            return (
              <Box
                key={player._id || `${player.playerName}-${idx}`}
                sx={{
                  p: compact ? 1 : 1.25,
                  px: compact ? 1.5 : 2,
                  borderRadius: "14px",
                  background: rankBg,
                  border: rankBorder,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateX(3px)",
                    background: "rgba(255, 255, 255, 0.08)",
                  },
                }}
              >
                {/* Left: Rank badge, Avatar, Name & Title */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: compact ? 26 : 30,
                      height: compact ? 26 : 30,
                      borderRadius: "8px",
                      background: rankBadgeBg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      fontSize: compact ? "11px" : "12px",
                      color: isTop1 || isTop2 || isTop3 ? "#fff" : rankTextColor,
                      flexShrink: 0,
                      boxShadow: isTop1 ? "0 2px 8px rgba(245, 158, 11, 0.4)" : "none",
                    }}
                  >
                    {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                  </Box>

                  <Box
                    sx={{
                      width: compact ? 28 : 34,
                      height: compact ? 28 : 34,
                      borderRadius: "50%",
                      background: isTop1 ? "rgba(245, 158, 11, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      border: isTop1 ? "1px solid #f59e0b" : "1px solid rgba(255,255,255,0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: compact ? "14px" : "17px",
                      flexShrink: 0,
                    }}
                  >
                    {player.avatar || "⚡"}
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={800}
                      noWrap
                      sx={{
                        color: isTop1 ? "#fef08a" : "#fff",
                        fontSize: compact ? "12.5px" : "14px",
                        lineHeight: 1.2,
                      }}
                    >
                      {player.playerName}
                    </Typography>

                    <Typography
                      variant="caption"
                      noWrap
                      sx={{
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: "10.5px",
                        display: "block",
                      }}
                    >
                      {player.badge || "Challenger"}
                    </Typography>
                  </Box>
                </Stack>

                {/* Right: Score & Wins */}
                <Stack direction="row" alignItems="center" spacing={compact ? 1 : 1.5} sx={{ flexShrink: 0 }}>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography
                      variant="body2"
                      fontWeight={900}
                      sx={{
                        color: isCoinRush ? "#fde047" : "#38bdf8",
                        fontFamily: "monospace",
                        fontSize: compact ? "13px" : "14.5px",
                      }}
                    >
                      {player.secondaryMetric || (isCoinRush ? `${player.score} Coins` : `${player.score}m`)}
                    </Typography>

                    <Typography
                      variant="caption"
                      sx={{
                        color: "rgba(255, 255, 255, 0.55)",
                        fontSize: "10px",
                        display: "block",
                      }}
                    >
                      {player.wins || 1} Wins
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
