import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ReportOutlinedIcon from "@mui/icons-material/ReportOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";

export default function VideoPage({
  isMatched,
  isSearching,
  localVideoRef,
  remoteVideoRef,
  onJoin,
  onNext,
  onClose,
  onReport,
  onStopVideo,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  localStream,
  remoteStream,
  backendUrl,
  socketId,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    onClose();
    navigate("/");
  };

  // Stop video stream completely when leaving the VideoPage component
  useEffect(() => {
    return () => {
      onStopVideo();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Bind local stream imperatively ---
  // localVideoRef always points to the local <video> element (never changes).
  // We just need to assign srcObject whenever localStream appears.
  useEffect(() => {
    const el = localVideoRef.current;
    if (!el) return;
    if (localStream) {
      if (el.srcObject !== localStream) {
        el.srcObject = localStream;
      }
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [localStream]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Bind remote stream imperatively ---
  // remoteVideoRef always points to the remote <video> element.
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (!el) return;
    if (remoteStream) {
      if (el.srcObject !== remoteStream) {
        el.srcObject = remoteStream;
      }
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [remoteStream]); // eslint-disable-line react-hooks/exhaustive-deps

  const connectionStatus = isSearching
    ? "Searching…"
    : isMatched
      ? "Connected"
      : "Idle";

  const statusColor = isSearching
    ? "warning"
    : isMatched
      ? "success"
      : "default";

  return (
    <Box className="cp-root vp-root">
      {/* ── TOP SESSION BAR ── */}
      <Box className="cp-session-bar">
        {/* Left: Mode badge + status */}
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Tooltip title="Back to Home" arrow>
            <IconButton onClick={handleBack} size="small" sx={{ color: "#64748b", mr: 0.5 }}>
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box className="cp-mode-icon">
            <VideocamOutlinedIcon sx={{ fontSize: 18 }} />
          </Box>
          <Stack spacing={0}>
            <Typography className="cp-mode-label">Video Chat</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <FiberManualRecordIcon
                sx={{
                  fontSize: 8,
                  color: isMatched
                    ? "#10b981"
                    : isSearching
                      ? "#f59e0b"
                      : "#94a3b8",
                }}
              />
              <Typography className="cp-status-text">{connectionStatus}</Typography>
            </Stack>
          </Stack>
          <Chip
            label={connectionStatus}
            color={statusColor}
            size="small"
            className="cp-status-chip"
          />
        </Stack>

        {/* Right: Actions — shown only when NOT matched */}
        {!isMatched && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              id="cp-btn-start"
              size="small"
              variant="contained"
              className="cp-btn cp-btn-start"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={() => onJoin()}
              disabled={isSearching}
            >
              {isSearching ? "Searching…" : "Start Session"}
            </Button>
          </Stack>
        )}
      </Box>

      {/* ── VIDEO STAGE ── */}
      <Box className="cp-body">
        <Box className="cp-video-stage cp-video-stage-fullscreen">

          {/* ── REMOTE VIDEO (main stage) — always rendered, hidden when not matched ── */}
          <Box
            component="video"
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="cp-video-main"
            sx={{ display: isMatched ? "block" : "none" }}
          />

          {/* ── LOCAL VIDEO full-screen — shown while searching, acts as preview ── */}
          <Box
            component="video"
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="cp-video-main"
            sx={{ display: isMatched ? "none" : "block" }}
          />

          {/* ── "Partner" label overlay (only when matched) ── */}
          {isMatched && (
            <Box className="cp-video-label">
              <FiberManualRecordIcon sx={{ fontSize: 8, color: "#ef4444" }} />
              <Typography variant="caption">Partner</Typography>
            </Box>
          )}

          {/* ── "You (Preview)" label overlay (when searching) ── */}
          {!isMatched && (
            <Box className="cp-video-label">
              <FiberManualRecordIcon sx={{ fontSize: 8, color: "#10b981" }} />
              <Typography variant="caption">You (Preview)</Typography>
            </Box>
          )}

          {/* ── PiP: local video in top-right when matched ── */}
          {isMatched && (
            <Box className="cp-video-pip">
              <Typography variant="caption" className="cp-pip-label">You</Typography>
              {/* Re-use a second independent video element for PiP.
                  We drive it via a callback ref so srcObject is always in sync. */}
              <Box
                component="video"
                autoPlay
                playsInline
                muted
                className="cp-video-pip-feed"
                ref={useCallback(
                  (el) => {
                    if (el && localStream && el.srcObject !== localStream) {
                      el.srcObject = localStream;
                      el.play().catch(() => {});
                    }
                  },
                  [localStream]
                )}
              />
            </Box>
          )}

          {/* ── Floating Controls (only when matched) ── */}
          {isMatched && (
            <Box className="cp-video-controls">
              {/* Mic toggle */}
              <Tooltip title={isMuted ? "Unmute microphone" : "Mute microphone"} arrow>
                <IconButton
                  onClick={onToggleMute}
                  className={`cp-video-ctrl-btn ${isMuted ? "cp-video-ctrl-btn-muted" : ""}`}
                >
                  {isMuted ? <MicOffIcon /> : <MicIcon />}
                </IconButton>
              </Tooltip>

              {/* Camera toggle */}
              <Tooltip title={isVideoOff ? "Turn camera on" : "Turn camera off"} arrow>
                <IconButton
                  onClick={onToggleVideo}
                  className={`cp-video-ctrl-btn ${isVideoOff ? "cp-video-ctrl-btn-muted" : ""}`}
                >
                  {isVideoOff ? <VideocamOffIcon /> : <VideocamIcon />}
                </IconButton>
              </Tooltip>

              {/* Next */}
              <Tooltip title="Find next match" arrow>
                <Button
                  onClick={onNext}
                  variant="contained"
                  className="cp-video-ctrl-next"
                  startIcon={<SkipNextIcon />}
                >
                  Next
                </Button>
              </Tooltip>

              {/* Report */}
              <Tooltip title="Report this user" arrow>
                <IconButton
                  onClick={onReport}
                  className="cp-video-ctrl-btn cp-video-ctrl-btn-report"
                >
                  <ReportOutlinedIcon />
                </IconButton>
              </Tooltip>

              {/* End */}
              <Tooltip title="End this session" arrow>
                <IconButton
                  onClick={onClose}
                  className="cp-video-ctrl-btn cp-video-ctrl-btn-end"
                >
                  <StopCircleOutlinedIcon />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>

      {/* ── SESSION FOOTER ── */}
      <Box className="cp-footer">
        <Typography className="cp-footer-text">
          Session · {socketId ? `ID: ${socketId.slice(0, 8)}…` : "Not connected"}
        </Typography>
        <Typography className="cp-footer-text">{backendUrl}</Typography>
      </Box>
    </Box>
  );
}
