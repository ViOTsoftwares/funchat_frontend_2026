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
  const typingTimeoutRef = useRef(null);
  const lastTypingSentRef = useRef(false);
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
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!window.visualViewport) return;
    const updateVisualViewportHeight = () => {
      const vh = window.visualViewport.height;
      document.documentElement.style.setProperty("--visual-vh", `${vh}px`);
    };
    window.visualViewport.addEventListener("resize", updateVisualViewportHeight);
    window.visualViewport.addEventListener("scroll", updateVisualViewportHeight);
    updateVisualViewportHeight();
    return () => {
      window.visualViewport.removeEventListener("resize", updateVisualViewportHeight);
      window.visualViewport.removeEventListener("scroll", updateVisualViewportHeight);
    };
  }, []);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // ── Restore session state after a page refresh ──
    const storedConversationId = localStorage.getItem("funchat_conversation");
    const storedPartnerId      = localStorage.getItem("funchat_partner_id");
    const storedMode           = localStorage.getItem("funchat_mode");

    if (storedConversationId && !conversationId) {
      dispatch(setConversationId(storedConversationId));
    }
    if (storedPartnerId && !partnerId) {
      dispatch(setPartnerId(storedPartnerId));
      dispatch(setIsSearching(false));
    }
    if (storedMode && storedMode !== mode) {
      dispatch(setMode(storedMode));
    }
    // Navigate to the stored route if we're on the landing page with an active session
    if (storedPartnerId && storedMode) {
      const targetPath = `/${storedMode}`;
      if (location.pathname === "/") {
        navigate(targetPath, { replace: true });
      }
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
      // Persist so we can restore after refresh
      if (pid) localStorage.setItem("funchat_partner_id", pid);
      if (matchedMode) localStorage.setItem("funchat_mode", matchedMode);
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
      // Treat any server-generated "from" that isn't the local user as a partner message
      const localUserId = localStorage.getItem("funchat_user_id");
      const resolvedFrom =
        !from || from === localUserId
          ? "me"
          : from === "system"
          ? "partner"   // backend auto-message → show on left
          : "partner";
      dispatch(addMessage({ from: resolvedFrom, parts: normalizedParts }));
      if (from && from !== socket.id && from !== localUserId) {
        setIsPartnerTyping(false);
      }
    };

    const onHistory = ({ messages: history = [] }) => {
      const localUserId = localStorage.getItem("funchat_user_id");
      const mapped = history.map((m) => {
        // Determine if the stored message belongs to the current user
        const rawFrom = m.userId || m.from;
        let resolvedFrom;
        if (!rawFrom || rawFrom === "system") {
          // Unknown sender → show as partner message (left side)
          resolvedFrom = "partner";
        } else if (rawFrom === localUserId) {
          resolvedFrom = "me";
        } else {
          resolvedFrom = "partner"; // partner's ID/socket id → left side
        }
        return {
          from: resolvedFrom,
          parts:
            m.parts ||
            (m.emojiUrl
              ? [{ type: "emoji", url: m.emojiUrl }]
              : [{ type: "text", text: m.text || "" }]),
        };
      });
      dispatch(setMessages(mapped));
    };

    const onPartnerLeft = () => {
      dispatch(setPartnerId(""));
      dispatch(setIsSearching(false));
      setIsPartnerTyping(false);
      cleanupPeer(remoteVideoRef);
      // Partner disconnected — clear persisted session
      localStorage.removeItem("funchat_partner_id");
      localStorage.removeItem("funchat_mode");
      localStorage.removeItem("funchat_conversation");
    };

    const onConversationCleared = () => {
      dispatch(resetMessages());
      dispatch(setPartnerId(""));
      dispatch(setIsSearching(false));
      setIsPartnerTyping(false);
      dispatch(clearConversationId());
      localStorage.removeItem("funchat_conversation");
      localStorage.removeItem("funchat_partner_id");
      localStorage.removeItem("funchat_mode");
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
    socket.on("typing", ({ isTyping }) => {
      setIsPartnerTyping(Boolean(isTyping));
    });

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
      socket.off("typing");
    };
  }, [socketRef, ensureLocalStream, ensurePeerConnection, cleanupPeer, pcRef]);

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
    // Starting a fresh session — clear all persisted session data
    localStorage.removeItem("funchat_conversation");
    localStorage.removeItem("funchat_partner_id");
    localStorage.removeItem("funchat_mode");
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

  function emitTyping(isTyping) {
    if (!socketRef.current || !isMatched) return;
    if (lastTypingSentRef.current === isTyping) return;
    socketRef.current.emit("typing", { isTyping });
    lastTypingSentRef.current = isTyping;
  }

  function scheduleTypingStop() {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
  }

  function handleComposerInput() {
    emitTyping(true);
    scheduleTypingStop();
  }

  function handleSend() {
    let parts = getComposerParts();
    const hasEmoji = parts.some((part) => part.type === "emoji");
    let textContent = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    const trimmedText = textContent.trim();
    if (!hasEmoji && trimmedText === "") return;

    if (parts.length) {
      parts = parts.map((part) =>
        part.type === "text" ? { ...part, text: part.text.replace(/\s+/g, " ") } : part
      );
      let start = 0;
      let end = parts.length - 1;
      while (start <= end && parts[start].type === "text" && parts[start].text.trim() === "") {
        start += 1;
      }
      while (end >= start && parts[end].type === "text" && parts[end].text.trim() === "") {
        end -= 1;
      }
      parts = parts.slice(start, end + 1);
      if (parts.length && parts[0].type === "text") {
        parts[0].text = parts[0].text.replace(/^\s+/, "");
      }
      if (parts.length && parts[parts.length - 1].type === "text") {
        parts[parts.length - 1].text = parts[parts.length - 1].text.replace(/\s+$/, "");
      }
    }

    textContent = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    const firstEmoji = parts.find((part) => part.type === "emoji")?.url;
    const messagePayload = { parts, text: textContent };
    if (firstEmoji && textContent.trim() === "") {
      messagePayload.emojiUrl = firstEmoji;
    }
    dispatch(addMessage({ from: "me", parts }));
    socketRef.current.emit("message", messagePayload);
    emitTyping(false);
    clearComposer();

    // Refocus the input box immediately to keep keyboard open on mobile
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);
  }

  function handleNext() {
    socketRef.current.emit("next");
    emitTyping(false);
    dispatch(resetMessages());
    cleanupPeer(remoteVideoRef);
    dispatch(setIsSearching(true));
    dispatch(clearConversationId());
    // Explicit user action — clear all persisted session data
    localStorage.removeItem("funchat_conversation");
    localStorage.removeItem("funchat_partner_id");
    localStorage.removeItem("funchat_mode");
  }

  function handleCloseChat() {
    if (!socketRef.current) return;
    socketRef.current.emit("close_chat");
    emitTyping(false);
    cleanupPeer(remoteVideoRef);
    dispatch(setPartnerId(""));
    dispatch(setIsSearching(false));
    dispatch(clearConversationId());
    // Explicit user action — clear all persisted session data
    localStorage.removeItem("funchat_conversation");
    localStorage.removeItem("funchat_partner_id");
    localStorage.removeItem("funchat_mode");
    dispatch(addMessage({ from: "system", parts: [{ type: "text", text: "Session ended successfully." }] }));
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

  useEffect(() => {
    if (!isMatched) {
      setIsPartnerTyping(false);
      emitTyping(false);
    }
  }, [isMatched]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box className={`app ${location.pathname !== "/" ? "app-fullscreen-chat" : ""}`}>
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
                  isPartnerTyping={isPartnerTyping}
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
                  onComposerInput={handleComposerInput}
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
                  isPartnerTyping={isPartnerTyping}
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
                  onComposerInput={handleComposerInput}
                  onSend={handleSend}
                  backendUrl={BACKEND_URL}
                  socketId={socketId}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Container>

        {location.pathname !== "/chat" && location.pathname !== "/video" && <Footer />}

        {isSearching && !isMatched && (
          <Box className="match-overlay">
            <Paper className="match-card" elevation={0}>
              <CircularProgress size={28} />
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Finding a suitable match...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  We are connecting you with an available {mode} partner.
                </Typography>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}
