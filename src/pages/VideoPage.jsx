import { useEffect } from "react";
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
  }, [onStopVideo]);

  // Bind local stream to whichever ref element is currently active
  useEffect(() => {
    const el = localVideoRef.current;
    if (el) {
      if (localStream) {
        if (el.srcObject !== localStream) {
          el.srcObject = localStream;
        }
        el.play?.().catch((err) => console.log("Local video play error:", err));
      } else {
        el.srcObject = null;
      }
    }
  }, [localStream, isMatched, localVideoRef, localVideoRef.current]);

  // Bind remote stream
  useEffect(() => {
    const el = remoteVideoRef.current;
    if (el) {
      if (remoteStream) {
        if (el.srcObject !== remoteStream) {
          el.srcObject = remoteStream;
        }
        el.play?.().catch((err) => console.log("Remote video play error:", err));
      } else {
        el.srcObject = null;
      }
    }
  }, [remoteStream, isMatched, remoteVideoRef, remoteVideoRef.current]);
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
    <Box className="cp-root">
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

        {/* Right: Actions */}
        {!isMatched && (
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Button
              id="cp-btn-start"
              size="small"
              variant="contained"
              className="cp-btn cp-btn-start"
              startIcon={<PlayArrowRoundedIcon />}
              onClick={() => onJoin()}
              disabled={isSearching || isMatched}
            >
              {isSearching ? "Searching…" : "Start Session"}
            </Button>

            <Tooltip title="Find next match" arrow>
              <span>
                <Button
                  id="cp-btn-next"
                  size="small"
                  variant="outlined"
                  className="cp-btn cp-btn-next"
                  startIcon={<SkipNextIcon />}
                  onClick={onNext}
                  disabled={!isMatched || isSearching}
                >
                  Next
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="End this session" arrow>
              <span>
                <Button
                  id="cp-btn-end"
                  size="small"
                  variant="outlined"
                  className="cp-btn cp-btn-end"
                  onClick={onClose}
                  disabled={!isMatched || isSearching}
                >
                  End
                </Button>
              </span>
            </Tooltip>

            <Tooltip title="Report this user" arrow>
              <span>
                <IconButton
                  id="cp-btn-report"
                  size="small"
                  className="cp-icon-btn-report"
                  onClick={onReport}
                  disabled={!isMatched || isSearching}
                >
                  <ReportOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title="Turn off your camera" arrow>
              <span>
                <IconButton
                  id="cp-btn-stop-video"
                  size="small"
                  className="cp-icon-btn"
                  onClick={onStopVideo}
                  disabled={isSearching}
                >
                  <StopCircleOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        )}
      </Box>

      {/* ── MAIN CONTENT ── */}
      <Box className="cp-body">
        {/* Video stage */}
        <Box className="cp-video-stage cp-video-stage-fullscreen">
          <Box className="cp-video-label">
            <FiberManualRecordIcon sx={{ fontSize: 8, color: isMatched ? "#ef4444" : "#10b981" }} />
            <Typography variant="caption">{isMatched ? "Partner" : "You (Preview)"}</Typography>
          </Box>
          <Box
            component="video"
            ref={isMatched ? remoteVideoRef : localVideoRef}
            autoPlay
            playsInline
            muted={!isMatched}
            className="cp-video-main"
          />
          {/* PiP */}
          {isMatched && (
            <Box className="cp-video-pip">
              <Typography variant="caption" className="cp-pip-label">You</Typography>
              <Box
                component="video"
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="cp-video-pip-feed"
              />
            </Box>
          )}
          {/* Floating Controls Overlay */}
          {isMatched && (
            <Box className="cp-video-controls">
              {/* Mic toggle */}
              <Tooltip title={isMuted ? "Unmute microphone" : "Mute microphone"} arrow>
                <span>
                  <IconButton
                    onClick={onToggleMute}
                    className={`cp-video-ctrl-btn ${isMuted ? "cp-video-ctrl-btn-muted" : ""}`}
                  >
                    {isMuted ? <MicOffIcon fontSize="small" /> : <MicIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>

              {/* Camera toggle */}
              <Tooltip title={isVideoOff ? "Turn camera on" : "Turn camera off"} arrow>
                <span>
                  <IconButton
                    onClick={onToggleVideo}
                    className={`cp-video-ctrl-btn ${isVideoOff ? "cp-video-ctrl-btn-muted" : ""}`}
                  >
                    {isVideoOff ? <VideocamOffIcon fontSize="small" /> : <VideocamIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>

              {/* Next button */}
              <Tooltip title="Find next match" arrow>
                <span>
                  <Button
                    onClick={onNext}
                    variant="contained"
                    className="cp-video-ctrl-next"
                    startIcon={<SkipNextIcon />}
                  >
                    Next
                  </Button>
                </span>
              </Tooltip>

              {/* Report button */}
              <Tooltip title="Report this user" arrow>
                <span>
                  <IconButton
                    onClick={onReport}
                    className="cp-video-ctrl-btn cp-video-ctrl-btn-report"
                  >
                    <ReportOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>

              {/* End button */}
              <Tooltip title="End this session" arrow>
                <span>
                  <IconButton
                    onClick={onClose}
                    className="cp-video-ctrl-btn cp-video-ctrl-btn-end"
                  >
                    <StopCircleOutlinedIcon fontSize="small" />
                  </IconButton>
                </span>
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
