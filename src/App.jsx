import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  useLocation,
  useNavigate,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import {
  Box,
  CircularProgress,
  Container,
  CssBaseline,
  Paper,
  Stack,
  Typography,
  ThemeProvider,
} from "@mui/material";
import { theme } from "./theme.js";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import VideoPage from "./pages/VideoPage.jsx";

import { useSocket } from "./hooks/useSocket.js";
import { useWebRTC } from "./hooks/useWebRTC.js";
import {
  addMessage,
  clearConversationId,
  resetMessages,
  setConversationId,
  setIsSearching,
  setMessages,
  setMode,
  setPartnerId,
} from "./store/chatSlice.js";
import { BACKEND_URL } from "./lib/constants.js";
import "./styles/app.css";

export default function App() {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const inputRef = useRef(null);
  const dispatch = useDispatch();
  const mode = useSelector((state) => state.chat.mode);
  const partnerId = useSelector((state) => state.chat.partnerId);
  const messages = useSelector((state) => state.chat.messages);
  const isSearching = useSelector((state) => state.chat.isSearching);
  const conversationId = useSelector((state) => state.chat.conversationId);

  const { socketRef, status, socketId } = useSocket();
  const {
    pcRef,
    ensureLocalStream,
    ensurePeerConnection,
    cleanupPeer,
    stopLocalVideo,
  } = useWebRTC(socketRef);

  const [emojiOpen, setEmojiOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const storedConversationId = localStorage.getItem("funchat_conversation");
    if (storedConversationId && !conversationId) {
      dispatch(setConversationId(storedConversationId));
    }

    const onConnect = () => {
      const cid = localStorage.getItem("funchat_conversation");
      if (cid) {
        socket.emit("resume", { conversationId: cid });
      }
    };

    const onMatched = async ({ partnerId: pid, mode: matchedMode, conversationId: cid }) => {
      dispatch(setPartnerId(pid));
      dispatch(setIsSearching(false));
      if (cid) {
        dispatch(setConversationId(cid));
        localStorage.setItem("funchat_conversation", cid);
      }
      if (matchedMode === "video") {
        await ensureLocalStream(localVideoRef);
        await ensurePeerConnection(localVideoRef, remoteVideoRef);
        const isOfferer = socket.id < pid;
        if (isOfferer) {
          const offer = await pcRef.current.createOffer();
          await pcRef.current.setLocalDescription(offer);
          socket.emit("offer", { sdp: offer });
        }
      }
    };

    const onMessage = ({ text, emojiUrl, parts, from }) => {
      let normalizedParts = parts;
      if (!Array.isArray(parts)) {
        if (emojiUrl) {
          normalizedParts = [{ type: "emoji", url: emojiUrl }];
        } else {
          normalizedParts = [{ type: "text", text: text || "" }];
        }
      }
      dispatch(addMessage({ from, parts: normalizedParts }));
    };

    const onHistory = ({ messages: history = [] }) => {
      const mapped = history.map((m) => ({
        from: m.userId || m.from || "system",
        parts:
          m.parts ||
          (m.emojiUrl
            ? [{ type: "emoji", url: m.emojiUrl }]
            : [{ type: "text", text: m.text || "" }])
      }));
      dispatch(setMessages(mapped));
    };

    const onPartnerLeft = () => {
      dispatch(setPartnerId(""));
      dispatch(setIsSearching(false));
      cleanupPeer(remoteVideoRef);
    };

    const onConversationCleared = () => {
      dispatch(resetMessages());
      dispatch(setPartnerId(""));
      dispatch(setIsSearching(false));
      dispatch(clearConversationId());
      localStorage.removeItem("funchat_conversation");
      cleanupPeer(remoteVideoRef);
    };

    const onOffer = async ({ sdp }) => {
      await ensureLocalStream(localVideoRef);
      await ensurePeerConnection(localVideoRef, remoteVideoRef);
      await pcRef.current.setRemoteDescription(sdp);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("answer", { sdp: answer });
    };

    const onAnswer = async ({ sdp }) => {
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(sdp);
    };

    const onIce = async ({ candidate }) => {
      if (!pcRef.current || !candidate) return;
      try {
        await pcRef.current.addIceCandidate(candidate);
      } catch {
        // ignore invalid candidates
      }
    };

    socket.on("connect", onConnect);
    socket.on("matched", onMatched);
    socket.on("message", onMessage);
    socket.on("history", onHistory);
    socket.on("partner_left", onPartnerLeft);
    socket.on("conversation_cleared", onConversationCleared);
    socket.on("offer", onOffer);
    socket.on("answer", onAnswer);
    socket.on("ice-candidate", onIce);

    return () => {
      socket.off("connect", onConnect);
      socket.off("matched", onMatched);
      socket.off("message", onMessage);
      socket.off("history", onHistory);
      socket.off("partner_left", onPartnerLeft);
      socket.off("conversation_cleared", onConversationCleared);
      socket.off("offer", onOffer);
      socket.off("answer", onAnswer);
      socket.off("ice-candidate", onIce);
    };
  }, [socketRef, ensureLocalStream, ensurePeerConnection, cleanupPeer, pcRef]);

  function getRouteMode() {
    return location.pathname === "/video" ? "video" : "chat";
  }

  function getRouteMode() {
    return location.pathname === "/video" ? "video" : "chat";
  }

  function normalizeMode(arg) {
    return typeof arg === "string" ? arg : getRouteMode();
  }

  function handleJoin(nextMode = mode) {
    if (!socketRef.current) return;
    const resolvedMode = normalizeMode(nextMode);
    if (resolvedMode !== mode) {
      dispatch(setMode(resolvedMode));
    }
    dispatch(resetMessages());
    dispatch(setPartnerId(""));
    dispatch(setIsSearching(true));
    dispatch(clearConversationId());
    localStorage.removeItem("funchat_conversation");
    socketRef.current.emit("join", { mode: resolvedMode }, (ack) => {
      console.log("[join ack]", ack);
    });
  }

  function handleLandingStart(selectedMode) {
    dispatch(setMode(selectedMode));
    navigate(`/${selectedMode}`);
    handleJoin(selectedMode);
  }

  function getComposerParts() {
    const container = inputRef.current;
    if (!container) return [];
    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) {
          parts.push({ type: "text", text: node.textContent });
        }
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node;
      if (el.tagName === "IMG" && el.dataset.emojiUrl) {
        parts.push({ type: "emoji", url: el.dataset.emojiUrl });
        return;
      }
      if (el.tagName === "BR") {
        parts.push({ type: "text", text: "\n" });
        return;
      }
      const isBlock = ["DIV", "P"].includes(el.tagName);
      el.childNodes.forEach((child) => walk(child));
      if (isBlock) {
        parts.push({ type: "text", text: "\n" });
      }
    };

    container.childNodes.forEach((node) => walk(node));

    const merged = [];
    parts.forEach((part) => {
      if (part.type === "text") {
        if (!part.text) return;
        const last = merged[merged.length - 1];
        if (last?.type === "text") {
          last.text += part.text;
        } else {
          merged.push({ ...part });
        }
        return;
      }
      merged.push(part);
    });
    return merged;
  }

  function clearComposer() {
    if (inputRef.current) {
      inputRef.current.innerHTML = "";
    }
  }

  function handleSend() {
    const parts = getComposerParts();
    const hasEmoji = parts.some((part) => part.type === "emoji");
    const textContent = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    if (!hasEmoji && textContent.trim() === "") return;

    const firstEmoji = parts.find((part) => part.type === "emoji")?.url;
    const messagePayload = { parts, text: textContent };
    if (firstEmoji && textContent.trim() === "") {
      messagePayload.emojiUrl = firstEmoji;
    }
    dispatch(addMessage({ from: "me", parts }));
    socketRef.current.emit("message", messagePayload);
    clearComposer();
  }

  function handleNext() {
    socketRef.current.emit("next");
    dispatch(resetMessages());
    cleanupPeer(remoteVideoRef);
    dispatch(setIsSearching(true));
    dispatch(clearConversationId());
    localStorage.removeItem("funchat_conversation");
  }

  function handleCloseChat() {
    if (!socketRef.current) return;
    socketRef.current.emit("close_chat");
    cleanupPeer(remoteVideoRef);
    dispatch(setPartnerId(""));
    dispatch(setIsSearching(false));
    dispatch(clearConversationId());
    localStorage.removeItem("funchat_conversation");
    dispatch(addMessage({ from: "system", parts: [{ type: "text", text: "Chat is closed." }] }));
  }

  function handleReport() {
    const reason = window.prompt("Report reason (optional):") || "";
    if (!partnerId) return;
    socketRef.current.emit("report", { reportedId: partnerId, reason });
  }

  function insertEmojiAtCursor(emojiUrl) {
    const container = inputRef.current;
    if (!container) return;
    container.focus();
    const img = document.createElement("img");
    img.src = emojiUrl;
    img.alt = "emoji";
    img.className = "inline-emoji";
    img.setAttribute("data-emoji-url", emojiUrl);

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      container.appendChild(img);
      container.appendChild(document.createTextNode(" "));
      return;
    }
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    const space = document.createTextNode(" ");
    range.setStartAfter(img);
    range.insertNode(space);
    range.setStartAfter(space);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function handleEmojiSelect(selectedEmoji) {
    const emojiUrl = selectedEmoji?.url;
    if (!emojiUrl) return;
    insertEmojiAtCursor(emojiUrl);
    setEmojiOpen(false);
  }

  const isMatched = Boolean(partnerId);

  useEffect(() => {
    if (location.pathname === "/chat" && mode !== "chat") {
      dispatch(setMode("chat"));
    }
    if (location.pathname === "/video" && mode !== "video") {
      dispatch(setMode("video"));
    }
  }, [location.pathname, mode]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className="app">
        <Header status={status} />

        <Container maxWidth="lg" sx={{ pb: 4 }}>
          <Routes>
            <Route
              path="/"
              element={
                <LandingPage
                  status={status}
                  isSearching={isSearching}
                  onStartChat={() => handleLandingStart("chat")}
                  onStartVideo={() => handleLandingStart("video")}
                />
              }
            />
            <Route
              path="/chat"
              element={
                <ChatPage
                  mode={mode}
                  isMatched={isMatched}
                  isSearching={isSearching}
                  showVideo={false}
                  localVideoRef={localVideoRef}
                  remoteVideoRef={remoteVideoRef}
                  messages={messages}
                  onJoin={handleJoin}
                  onNext={handleNext}
                  onClose={handleCloseChat}
                  onReport={handleReport}
                  onStopVideo={() =>
                    stopLocalVideo(localVideoRef, remoteVideoRef)
                  }
                  emojiOpen={emojiOpen}
                  onToggleEmoji={() => setEmojiOpen((v) => !v)}
                  onEmojiSelect={handleEmojiSelect}
                  inputRef={inputRef}
                  onSend={handleSend}
                  backendUrl={BACKEND_URL}
                  socketId={socketId}
                />
              }
            />
            <Route
              path="/video"
              element={
                <VideoPage
                  mode={mode}
                  isMatched={isMatched}
                  isSearching={isSearching}
                  showVideo={true}
                  localVideoRef={localVideoRef}
                  remoteVideoRef={remoteVideoRef}
                  messages={messages}
                  onJoin={handleJoin}
                  onNext={handleNext}
                  onClose={handleCloseChat}
                  onReport={handleReport}
                  onStopVideo={() =>
                    stopLocalVideo(localVideoRef, remoteVideoRef)
                  }
                  emojiOpen={emojiOpen}
                  onToggleEmoji={() => setEmojiOpen((v) => !v)}
                  onEmojiSelect={handleEmojiSelect}
                  inputRef={inputRef}
                  onSend={handleSend}
                  backendUrl={BACKEND_URL}
                  socketId={socketId}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>

        <Footer />

        {isSearching && !isMatched && (
          <Box className="match-overlay">
            <Paper className="match-card" elevation={0}>
              <CircularProgress size={28} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Finding a match…
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  We are pairing you with a {mode} partner.
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
