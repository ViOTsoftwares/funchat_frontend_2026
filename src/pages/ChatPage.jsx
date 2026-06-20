import { useState, useEffect, useRef } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ReportOutlinedIcon from "@mui/icons-material/ReportOutlined";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import FiberManualRecordIcon from "@mui/icons-material/FiberManualRecord";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import { Picker } from "ms-3d-emoji-picker";

export default function ChatPage({
  mode,
  isMatched,
  isSearching,
  showVideo,
  localVideoRef,
  remoteVideoRef,
  messages,
  isPartnerTyping,
  onJoin,
  onNext,
  onClose,
  onReport,
  onStopVideo,
  emojiOpen,
  onToggleEmoji,
  onEmojiSelect,
  inputRef,
  onComposerInput,
  onSend,
  backendUrl,
  socketId,
  partnerName,
}) {
  const messageListRef = useRef(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  const [hasClickedInput, setHasClickedInput] = useState(false);
  const [profileName, setProfileName] = useState(
    localStorage.getItem("funchat_profile_name") || "Stranger"
  );

  useEffect(() => {
    const handleNameChange = () => {
      setProfileName(localStorage.getItem("funchat_profile_name") || "Stranger");
    };
    window.addEventListener("profileNameChanged", handleNameChange);
    return () => window.removeEventListener("profileNameChanged", handleNameChange);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMatched && mode === "chat") {
      setIsChatExpanded(true);
    } else {
      setIsChatExpanded(false);
    }
  }, [isMatched, mode]);

  const QUICK_KEYWORDS = [
    "Hi 👋",
    "Hey!",
    "How are you?",
    "Where are you from?",
    "Nice to meet you",
    "Haha 😂",
    "What's up?",
    "M",
    "F"
  ];

  const handleKeywordClick = (keyword) => {
    const container = inputRef.current;
    if (!container) return;
    container.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      container.appendChild(document.createTextNode(keyword));
      container.appendChild(document.createTextNode(" "));
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(keyword);
      range.insertNode(textNode);
      const space = document.createTextNode(" ");
      range.setStartAfter(textNode);
      range.insertNode(space);
      range.setStartAfter(space);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    if (onComposerInput) {
      onComposerInput();
    }
  };

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

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
    <Box className={`cp-root ${isChatExpanded ? "cp-root-expanded" : ""}`}>
      {/* ── TOP SESSION BAR ── */}
      {!isChatExpanded && (
        <Box className="cp-session-bar">
          {/* Left: Mode badge + status */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box className="cp-mode-icon">
              {mode === "video" ? (
                <VideocamOutlinedIcon sx={{ fontSize: 18 }} />
              ) : (
                <ChatBubbleOutlineIcon sx={{ fontSize: 18 }} />
              )}
            </Box>
            <Stack spacing={0}>
              <Typography className="cp-mode-label">
                {mode === "video" ? "Video Chat" : "Text Chat"}
              </Typography>
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

            {showVideo && (
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
            )}
          </Stack>
        </Box>
      )}

      {/* ── MAIN CONTENT ── */}
      <Box className="cp-body">
        {/* Video stage */}
        {showVideo && !isChatExpanded && (
          <Box className="cp-video-stage">
            <Box className="cp-video-label">
              <FiberManualRecordIcon sx={{ fontSize: 8, color: "#ef4444" }} />
              <Typography variant="caption">Partner</Typography>
            </Box>
            <Box
              component="video"
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="cp-video-main"
            />
            {/* PiP */}
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
          </Box>
        )}

        {/* ── CHAT PANEL ── */}
        <Box className="cp-chat-panel">
          {/* Chat header */}
          <Box className="cp-chat-header">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1} alignItems="center">
                <Box className="cp-chat-avatar">
                  {isMatched ? (partnerName ? partnerName.charAt(0).toUpperCase() : "P") : "–"}
                </Box>
                <Stack spacing={0}>
                  <Typography className="cp-chat-partner-name">
                    {isMatched ? (partnerName || "Partner") : "No partner yet"}
                  </Typography>
                  <Typography className="cp-chat-partner-sub">
                    {isMatched
                      ? isPartnerTyping
                        ? "Typing…"
                        : "Active now"
                      : "Start a session to connect"}
                  </Typography>
                </Stack>
              </Stack>

              {/* Full Width Toggle Button */}
              <Tooltip title={isChatExpanded ? "Exit Fullscreen Chat" : "Fullscreen Chat"} arrow>
                <IconButton
                  size="small"
                  className="cp-expand-btn"
                  onClick={() => setIsChatExpanded(!isChatExpanded)}
                  sx={{ color: "#64748b" }}
                >
                  {isChatExpanded ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Divider sx={{ opacity: 0.06 }} />

          {/* Messages */}
          <Stack
            spacing={1}
            className="cp-message-list"
            ref={messageListRef}
          >
            {messages.length === 0 && !isMatched && (
              <Box className="cp-empty-state">
                <ChatBubbleOutlineIcon sx={{ fontSize: 40, color: "#c7d2fe", mb: 1 }} />
                <Typography className="cp-empty-title">No conversation yet</Typography>
                <Typography className="cp-empty-sub">
                  Press <strong>Start Session</strong> to get matched instantly.
                </Typography>
              </Box>
            )}

            {messages.map((m, i) => {
              const isMe = m.from === "me";
              const isSystem = m.from === "system";
              return (
                <Stack
                  key={i}
                  direction="row"
                  justifyContent={
                    isSystem ? "center" : isMe ? "flex-end" : "flex-start"
                  }
                  sx={{ width: "100%" }}
                >
                  {isSystem ? (
                    <Box className="cp-system-msg">
                      {(m.parts || [{ type: "text", text: m.text || "" }]).map(
                        (p, idx) => (
                          <span key={idx}>{p.text}</span>
                        )
                      )}
                    </Box>
                  ) : (
                    <Box className={isMe ? "cp-bubble cp-bubble-me" : "cp-bubble cp-bubble-them"}>
                      <Box className="cp-bubble-content">
                        {(
                          m.parts ||
                          (m.emojiUrl
                            ? [{ type: "emoji", url: m.emojiUrl }]
                            : [{ type: "text", text: m.text || "" }])
                        ).map((part, idx) =>
                          part.type === "emoji" ? (
                            <Box
                              key={idx}
                              component="img"
                              src={part.url}
                              alt="emoji"
                              className="inline-emoji"
                            />
                          ) : (
                            <Box key={idx} component="span" className="message-content">
                              {part.text}
                            </Box>
                          )
                        )}
                      </Box>
                    </Box>
                  )}
                </Stack>
              );
            })}

            {/* Typing indicator */}
            {isMatched && isPartnerTyping && (
              <Stack direction="row" justifyContent="flex-start" sx={{ width: "100%" }}>
                <Box className="cp-bubble cp-bubble-them cp-typing-bubble">
                  <Box className="typing-dots" aria-label="Partner is typing">
                    <span /><span /><span />
                  </Box>
                </Box>
              </Stack>
            )}
          </Stack>

          {/* Composer */}
          <Box className="cp-composer">
            {isMobile && hasClickedInput && isMatched && (
              <Box className="cp-keywords-container">
                {QUICK_KEYWORDS.map((kw, idx) => (
                  <Box
                    key={idx}
                    className="cp-keyword-chip"
                    onClick={() => handleKeywordClick(kw)}
                  >
                    {kw}
                  </Box>
                ))}
              </Box>
            )}
            <Stack direction="row" spacing={1} alignItems="flex-end">
              {/* Capsule enclosing emoji + input + attachment */}
              <Box className="cp-input-capsule">
                {/* Emoji toggle */}
                <Box sx={{ position: "relative" }} className="cp-emoji-wrapper">
                  <Tooltip title="Emoji" arrow>
                    <IconButton
                      size="small"
                      className="cp-emoji-btn"
                      onClick={onToggleEmoji}
                    >
                      <EmojiEmotionsOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {emojiOpen && (
                    <Box className="emoji-picker">
                      <Picker isOpen handleEmojiSelect={onEmojiSelect} />
                    </Box>
                  )}
                </Box>

                {/* Input */}
                <Box
                  className="cp-input"
                  contentEditable
                  role="textbox"
                  aria-label="Message input"
                  data-placeholder={
                    isMatched
                      ? "Write a message…"
                      : "Connect to start chatting…"
                  }
                  ref={inputRef}
                  onInput={onComposerInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  onClick={() => setHasClickedInput(true)}
                  onFocus={() => setHasClickedInput(true)}
                  suppressContentEditableWarning
                />

                {/* Attachment icon */}
                <IconButton
                  size="small"
                  className="cp-attach-btn"
                  sx={{ color: "#94a3b8", p: "4px", ml: "2px", mb: "4px" }}
                >
                  <AttachFileIcon sx={{ fontSize: 20 }} />
                </IconButton>
              </Box>

              {/* Send */}
              <Tooltip title="Send (Enter)" arrow>
                <span>
                  <IconButton
                    id="cp-send-btn"
                    className="cp-send-btn"
                    onClick={onSend}
                    onMouseDown={(e) => e.preventDefault()}
                    disabled={!isMatched || isSearching}
                  >
                    <SendRoundedIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>
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
