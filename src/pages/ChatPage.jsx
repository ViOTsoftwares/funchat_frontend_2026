import { useEffect, useRef } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import ReportIcon from "@mui/icons-material/Report";
import SendIcon from "@mui/icons-material/Send";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import StopCircleIcon from "@mui/icons-material/StopCircle";
import { Picker } from "ms-3d-emoji-picker";

export default function ChatPage({
  mode,
  isMatched,
  isSearching,
  showVideo,
  localVideoRef,
  remoteVideoRef,
  messages,
  onJoin,
  onNext,
  onClose,
  onReport,
  onStopVideo,
  emojiOpen,
  onToggleEmoji,
  onEmojiSelect,
  inputRef,
  onSend,
  backendUrl,
  socketId
}) {
  const messageListRef = useRef(null);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth"
    });
  }, [messages.length]);

  return (
    <>
      <Paper className="hero-card" elevation={0}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" sx={{ mb: 1 }}>Meet someone new in seconds</Typography>
            <Typography variant="body1" color="text.secondary">
              Instant matching for private 1:1 chats and video calls with real-time safety controls.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} className="stat-row">
            <Box className="stat-card">
              <Typography variant="caption" color="text.secondary">Mode</Typography>
              <Typography variant="h6">{mode}</Typography>
            </Box>
            <Box className="stat-card">
              <Typography variant="caption" color="text.secondary">Partner</Typography>
              <Typography variant="h6">{isMatched ? "Connected" : "Waiting"}</Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>

      <Paper className="control-card" elevation={0}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          {mode === "chat" ? (
            <ToggleButtonGroup value="chat" exclusive size="small">
              <ToggleButton value="chat">
                <ChatBubbleOutlineIcon sx={{ mr: 1 }} /> Chat
              </ToggleButton>
            </ToggleButtonGroup>
          ) : (
            <ToggleButtonGroup value="video" exclusive size="small">
              <ToggleButton value="video">
                <VideocamOutlinedIcon sx={{ mr: 1 }} /> Video
              </ToggleButton>
            </ToggleButtonGroup>
          )}

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button variant="contained" onClick={() => onJoin()} disabled={isSearching || isMatched}>
              {isSearching ? "Matching..." : "Start"}
            </Button>
            <Button variant="contained" onClick={onNext} disabled={!isMatched || isSearching} startIcon={<SkipNextIcon />}>Next</Button>
            <Button variant="outlined" color="secondary" onClick={onClose} disabled={!isMatched || isSearching}>Close Chat</Button>
            <Button variant="outlined" color="secondary" onClick={onReport} disabled={!isMatched || isSearching} startIcon={<ReportIcon />}>Report</Button>
            {showVideo && (
              <Button variant="text" color="secondary" onClick={onStopVideo} startIcon={<StopCircleIcon />} disabled={isSearching}>Stop Video</Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {showVideo && (
        <Box className="video-layout">
          <Paper className="video-stage" elevation={0}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>Stranger</Typography>
            <Box component="video" ref={remoteVideoRef} autoPlay playsInline className="video-feed video-feed-main" />
            <Paper className="video-pip" elevation={0}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>You</Typography>
              <Box component="video" ref={localVideoRef} autoPlay playsInline muted className="video-feed video-feed-pip" />
            </Paper>
          </Paper>
        </Box>
      )}

      <Paper className="chat-card phone-chat" elevation={0}>
        <Stack spacing={2} className="chat-stack">
          <Stack spacing={1} className="message-list" ref={messageListRef}>
            {messages.map((m, i) => (
              <Stack key={i} direction="row" justifyContent={m.from === "me" ? "flex-end" : "flex-start"}>
                <Paper className={m.from === "me" ? "bubble bubble-me" : "bubble"} elevation={0}>
                  <Typography variant="caption" color="text.secondary">
                    {m.from === "me" ? "Me" : "Stranger"}
                  </Typography>
                  <Box className="message-content">
                    {(m.parts || (m.emojiUrl ? [{ type: "emoji", url: m.emojiUrl }] : [{ type: "text", text: m.text || "" }])).map((part, idx) =>
                      part.type === "emoji" ? (
                        <Box
                          key={`emoji-${idx}`}
                          component="img"
                          src={part.url}
                          alt="emoji"
                          className="inline-emoji"
                        />
                      ) : (
                        <Box key={`text-${idx}`} component="span">
                          {part.text}
                        </Box>
                      )
                    )}
                  </Box>
                </Paper>
              </Stack>
            ))}
          </Stack>

          <Divider className="chat-divider" />

          <Stack className="chat-composer" direction="row" spacing={1} alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center" sx={{ position: "relative" }}>
              <IconButton size="small" onClick={onToggleEmoji}>
                <EmojiEmotionsIcon fontSize="small" />
              </IconButton>
              {emojiOpen && (
                <Box className="emoji-picker">
                  <Picker isOpen={true} handleEmojiSelect={onEmojiSelect} />
                </Box>
              )}
            </Stack>
            <Box
              className="message-input"
              contentEditable
              role="textbox"
              aria-label="Message input"
              data-placeholder="Type a message"
              ref={inputRef}
              suppressContentEditableWarning
            />
            <Button className="send-button" variant="contained" endIcon={<SendIcon />} onClick={onSend} disabled={!isMatched || isSearching}>
              Send
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Paper className="footer-card" elevation={0}>
        <Typography variant="caption">Backend: {backendUrl}</Typography>
        <Typography variant="caption">My ID: {socketId}</Typography>
      </Paper>
    </>
  );
}
