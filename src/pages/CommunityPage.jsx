import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";

// Icons
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ForumIcon from "@mui/icons-material/Forum";
import GroupsIcon from "@mui/icons-material/Groups";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import KeyboardDoubleArrowRightIcon from "@mui/icons-material/KeyboardDoubleArrowRight";
import CircleIcon from "@mui/icons-material/Circle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import { useSocket } from "../hooks/useSocket.js";
import { Picker } from "ms-3d-emoji-picker";
import { ENV } from "../config/env.js";

// Categories and Group Rooms Definition


const QUICK_KEYWORDS = [
  "Hello everyone! 👋",
  "Hey! What's up?",
  "Anyone here?",
  "Awesome! 🔥",
  "Haha indeed 😂",
  "Help needed!",
  "Great point!"
];

export default function CommunityPage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { socketRef, status, socketId } = useSocket();

  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState({});

  const [messageDelay, setMessageDelay] = useState(0);
  const [lastMessageSentAt, setLastMessageSentAt] = useState(0);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingGroupMessages, setLoadingGroupMessages] = useState(false);
  const [skipCount, setSkipCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [profileName, setProfileName] = useState(
    localStorage.getItem("funchat_profile_name") || "Stranger"
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasClickedInput, setHasClickedInput] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(115);

  const inputRef = useRef(null);
  const messageListRef = useRef(null);
  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const lastTypingSentRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const prevScrollHeightRef = useRef(0);

  // ── scrollToBottom ────────────────────────────────────────────────────────
  // Robust scroll function that guarantees message list is scrolled to the absolute bottom
  const scrollToBottom = useCallback((smooth = false) => {
    if (messageListRef.current) {
      const el = messageListRef.current;
      el.scrollTop = el.scrollHeight + 100000;
    }
  }, []);

  // Whenever keyboard opens/closes, keywords appear, composer resizes, or messages change,
  // ensure the newest message is perfectly positioned above the input with a generous clearance!
  useEffect(() => {
    scrollToBottom(false);
    const t1 = setTimeout(() => scrollToBottom(false), 40);
    const t2 = setTimeout(() => scrollToBottom(false), 120);
    const t3 = setTimeout(() => scrollToBottom(false), 260);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [keyboardHeight, composerHeight, hasClickedInput, messages.length, scrollToBottom]);

  // Monitor global display name change
  useEffect(() => {
    const handleNameChange = () => {
      setProfileName(localStorage.getItem("funchat_profile_name") || "Stranger");
    };
    window.addEventListener("profileNameChanged", handleNameChange);
    return () => window.removeEventListener("profileNameChanged", handleNameChange);
  }, []);

  // Handle window resize for mobile check
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Keyboard / Visual Viewport tracking ────────────────────────────────────
  // Tracks keyboard height as REACT STATE → applied as inline style on the
  // fixed composer (bottom={keyboardHeight}px) and message list (padding-bottom).
  // This is the DEFINITIVE approach: direct React state, no CSS custom properties,
  // works on Android Chrome, iOS Safari, every mobile browser.
  useEffect(() => {
    const onViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;

      // keyboard height = total screen height - visible area - any page scroll offset
      const kbH = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(kbH);

      // Prevent iOS Safari page drift
      if (vv.offsetTop > 0) window.scrollTo(0, 0);

      // Auto-scroll: keep newest message above the composer (staggered for keyboard animation)
      scrollToBottom(false);
      setTimeout(() => scrollToBottom(false), 100);
      setTimeout(() => scrollToBottom(false), 300);
    };

    // Set initial value immediately
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", onViewportChange);
      window.visualViewport.addEventListener("scroll", onViewportChange);
      onViewportChange();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", onViewportChange);
        window.visualViewport.removeEventListener("scroll", onViewportChange);
      }
    };
  }, [scrollToBottom]);

  // Track composer height (for desktop padding-bottom on message list)
  useEffect(() => {
    if (!composerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (composerRef.current) setComposerHeight(composerRef.current.offsetHeight);
    });
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, []);

  // Fetch categories from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${ENV.API_URL}/api/public/community`);
        const json = await res.json();
        if (json.ok && json.data) {
          setCategories(json.data);
          if (json.data.length > 0) {
            setExpandedCategories({ [json.data[0].id]: true });
          }
        }
      } catch (err) {
        console.error("Failed to fetch communities", err);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // Handle accordion expansions automatically if we search
  useEffect(() => {
    if (searchText.trim() !== "") {
      const allExp = {};
      categories.forEach((cat) => {
        const match = cat.groups.some(
          (g) =>
            g.name.toLowerCase().includes(searchText.toLowerCase()) ||
            g.description.toLowerCase().includes(searchText.toLowerCase())
        );
        if (match) {
          allExp[cat.id] = true;
        }
      });
      setExpandedCategories((prev) => ({ ...prev, ...allExp }));
    }
  }, [searchText, categories]);

  // Find currently active group object
  let activeGroup = null;
  for (const cat of categories) {
    const found = cat.groups.find((g) => g.id === groupId);
    if (found) {
      activeGroup = { ...found, categoryName: cat.name, categoryImage: cat.image };
      break;
    }
  }

  // Socket connection and room registration
  useEffect(() => {
    const currentSocket = socketRef.current;
    if (!currentSocket || status !== "connected" || !groupId) return;

    // Set group loading state and reset messages
    setLoadingGroupMessages(true);
    setMessages([]);
    setTypingUsers({});
    setHasMore(false);
    setSkipCount(0);
    setLoadingMore(false);

    // Listen to messages
    const handleGroupMessage = (msg) => {
      if (msg.groupId === groupId) {
        setMessages((prev) => {
          // Reconcile optimistic local messages with incoming server broadcast
          const isDuplicate = prev.some(
            (m) =>
              (m.id && m.id === msg.id) ||
              (m.isOptimistic &&
                m.from === msg.from &&
                m.text === msg.text &&
                Math.abs(new Date(m.createdAt || Date.now()) - new Date(msg.createdAt || Date.now())) < 6000)
          );

          if (isDuplicate) {
            return prev.map((m) =>
              m.isOptimistic && m.from === msg.from && m.text === msg.text
                ? { ...msg, isOptimistic: false }
                : m
            );
          }

          return [...prev, msg];
        });

        // Only auto-scroll if user is near the bottom (WhatsApp smart-scroll behavior)
        if (isAtBottomRef.current) {
          scrollToBottom(false);
          setTimeout(() => scrollToBottom(false), 80);
        }
      }
    };

    // Listen to typing events
    const handleGroupTyping = (data) => {
      if (data.groupId === groupId) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          if (data.isTyping) {
            next[data.userId] = data.senderName;
          } else {
            delete next[data.userId];
          }
          return next;
        });
      }
    };

    const handleSlowModeError = (data) => {
      setCooldownRemaining(Math.ceil(data.remainingMs / 1000));
      setLastMessageSentAt(Date.now() - (messageDelay * 60 * 1000 - data.remainingMs));
    };

    currentSocket.on("group_message", handleGroupMessage);
    currentSocket.on("group_typing", handleGroupTyping);
    currentSocket.on("slow_mode_error", handleSlowModeError);

    // Join room
    currentSocket.emit("join_group", { groupId, name: profileName }, (ack) => {
      setLoadingGroupMessages(false);
      if (ack && ack.ok) {
        setMessages(ack.history || []);
        setHasMore(ack.hasMore || false);
        setSkipCount(0);
        setMessageDelay(ack.messageDelay || 0);
        setCooldownRemaining(ack.userRemainingMs ? Math.ceil(ack.userRemainingMs / 1000) : 0);
        // Scroll to bottom after initial load
        setTimeout(() => scrollToBottom(true), 80);
      }
    });

    return () => {
      currentSocket.off("group_message", handleGroupMessage);
      currentSocket.off("group_typing", handleGroupTyping);
      currentSocket.off("slow_mode_error", handleSlowModeError);
      currentSocket.emit("leave_group", { groupId });
    };
  }, [socketRef, status, groupId, profileName]);

  // Countdown timer for slow mode
  useEffect(() => {
    let timer;
    if (cooldownRemaining > 0) {
      timer = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  // Auto-scroll whenever messages change — but only if user is near the bottom
  // (Smart scroll: preserves position when user intentionally scrolls up)
  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottomRef.current) {
      // Use 'auto' for instant snap (like WhatsApp), 'smooth' for new messages
      scrollToBottom(false);
      const t = setTimeout(() => scrollToBottom(false), 80);
      return () => clearTimeout(t);
    }
  }, [messages.length, scrollToBottom]);

  // Scroll to bottom on typing indicator appearing
  useEffect(() => {
    if (typingUsers && Object.keys(typingUsers).length > 0 && isAtBottomRef.current) {
      scrollToBottom(true);
    }
  }, [typingUsers, scrollToBottom]);

  // Load more (older) messages when scrolled to top
  const handleLoadMore = useCallback(() => {
    if (!socketRef.current || status !== "connected" || !groupId || loadingMore || !hasMore) return;

    setLoadingMore(true);
    // Snapshot current scroll height before prepending messages
    if (messageListRef.current) {
      prevScrollHeightRef.current = messageListRef.current.scrollHeight;
    }

    const nextSkip = skipCount + 10;
    socketRef.current.emit("load_more_messages", { groupId, skip: nextSkip }, (res) => {
      if (res && res.ok) {
        setMessages((prev) => [...(res.messages || []), ...prev]);
        setHasMore(res.hasMore || false);
        setSkipCount(nextSkip);

        // After DOM update: restore scroll so the user stays at the same position
        setTimeout(() => {
          if (messageListRef.current) {
            const newScrollHeight = messageListRef.current.scrollHeight;
            messageListRef.current.scrollTop = newScrollHeight - prevScrollHeightRef.current;
          }
        }, 0);
      }
      setLoadingMore(false);
    });
  }, [socketRef, status, groupId, loadingMore, hasMore, skipCount]);

  // Unified scroll listener: detects scroll-to-top (load more) + tracks isAtBottom
  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;

    const onScroll = () => {
      // Track bottom proximity for smart auto-scroll
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isAtBottomRef.current = distanceFromBottom < 80;

      // Load older messages when scrolled to top
      if (el.scrollTop <= 60 && hasMore && !loadingMore) {
        handleLoadMore();
      }
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingMore, handleLoadMore]);

  const handleCategoryToggle = (catId) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  // Keyboard autocomplete helper
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
    handleComposerInput();
    scrollToBottom(true);
    setTimeout(() => scrollToBottom(true), 60);
    setTimeout(() => scrollToBottom(true), 150);
  };

  // Typing event emissions
  const emitTyping = (isTyping) => {
    if (!socketRef.current || status !== "connected" || !groupId) return;
    if (lastTypingSentRef.current === isTyping) return;
    socketRef.current.emit("group_typing", { groupId, isTyping });
    lastTypingSentRef.current = isTyping;
  };

  const handleComposerInput = () => {
    emitTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      emitTyping(false);
    }, 1200);
  };

  // Extraction of rich structure from contenteditable composer
  const getComposerParts = () => {
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
  };

  const handleSend = () => {
    if (!socketRef.current || status !== "connected" || !groupId) return;
    if (cooldownRemaining > 0) return;

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
    const currentUserId = socketId || localStorage.getItem("funchat_user_id");
    const messagePayload = {
      id: `temp_${Date.now()}_${Math.random()}`,
      groupId,
      parts,
      text: textContent,
      from: currentUserId,
      userId: currentUserId,
      senderName: profileName,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    if (firstEmoji && textContent.trim() === "") {
      messagePayload.emojiUrl = firstEmoji;
    }

    // Instant local UI update — 0ms delay!
    setMessages((prev) => [...prev, messagePayload]);

    socketRef.current.emit("group_message", messagePayload);
    emitTyping(false);

    if (messageDelay > 0) {
      setLastMessageSentAt(Date.now());
      setCooldownRemaining(messageDelay * 60);
    }

    if (inputRef.current) {
      inputRef.current.innerHTML = "";
    }

    // Force-snap to bottom when user sends (always, regardless of scroll position)
    isAtBottomRef.current = true;
    scrollToBottom(false);
    setTimeout(() => scrollToBottom(false), 80);

    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  const insertEmojiAtCursor = (emojiUrl) => {
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
  };

  const handleEmojiSelect = (selectedEmoji) => {
    const emojiUrl = selectedEmoji?.url;
    if (!emojiUrl) return;
    insertEmojiAtCursor(emojiUrl);
    setEmojiOpen(false);
    scrollToBottom(true);
    setTimeout(() => scrollToBottom(true), 60);
    setTimeout(() => scrollToBottom(true), 150);
  };

  // Compile rendering variables for typing users text
  const typingUsersList = Object.entries(typingUsers).filter(
    ([uid]) => uid !== socketId && uid !== localStorage.getItem("funchat_user_id")
  );

  const getTypingText = () => {
    if (typingUsersList.length === 0) return "";
    if (typingUsersList.length === 1) {
      return `${typingUsersList[0][1]} is typing...`;
    }
    if (typingUsersList.length === 2) {
      return `${typingUsersList[0][1]} and ${typingUsersList[1][1]} are typing...`;
    }
    return "Multiple users typing...";
  };

  // Sidebar filtering logic
  const filteredCategories = categories.map((cat) => {
    const filteredGroups = cat.groups.filter(
      (g) =>
        g.name.toLowerCase().includes(searchText.toLowerCase()) ||
        g.description.toLowerCase().includes(searchText.toLowerCase())
    );
    return { ...cat, groups: filteredGroups };
  }).filter((cat) => cat.groups.length > 0);

  const handleGroupSelect = (gId) => {
    navigate(`/community/${gId}`);
  };

  const handleBackToSidebar = () => {
    navigate("/community");
  };

  return (
    <Box className="comp-container">

      {/* ── MOBILE TOP CHAT HEADER (shown on mobile when inside an active group chat) ── */}
      {groupId && activeGroup && (
        <Box className="comp-mobile-header">
          {/* Left: back + avatar + info */}
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
            <IconButton
              onClick={handleBackToSidebar}
              size="small"
              className="comp-mhdr-back-btn"
            >
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </IconButton>

            {/* Group avatar */}
            <Box className="comp-mhdr-avatar">
              <Box
                component="img"
                src={`${ENV.IMAGE_URL}/logos/${activeGroup.categoryImage}`}
                alt={activeGroup.name}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </Box>

            {/* Group name + description */}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography className="comp-mhdr-title">
                # {activeGroup.name}
              </Typography>
              <Typography className="comp-mhdr-subtitle">
                {activeGroup.description || activeGroup.categoryName}
              </Typography>
            </Box>
          </Stack>

          {/* Right: timing pill + live pill */}
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0, ml: 1 }}>
            <Box className="comp-mhdr-timing-pill">
              <AccessTimeIcon sx={{ fontSize: 13, color: "#6366f1" }} />
              <Typography className="comp-mhdr-timing-text">
                {activeGroup.chat_timing || "24/7"}
              </Typography>
            </Box>

            <Box className={`comp-mhdr-live-pill ${status === "connected" ? "live" : "offline"}`}>
              <Box className="comp-mhdr-live-dot" />
              <Typography className="comp-mhdr-live-text">
                {status === "connected" ? "Live" : "..."}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}

      {/* ── SIDEBAR PANEL ── */}
      <Box
        className={`comp-sidebar ${groupId ? "comp-sidebar-hidden-mobile" : ""
          }`}
      >
        <Box className="comp-sidebar-header">
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: "12px",
                background: "linear-gradient(135deg,#6366f1,#3b82f6)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(99,102,241,.25)",
              }}
              onClick={() => navigate("/")}
            >
              <GroupsIcon />
            </Box>
            <Box>
              <Typography variant="h6" className="comp-sidebar-title">
                Communities
              </Typography>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)" }}>
                Real-time group discussions
              </Typography>
            </Box>
          </Stack>

          <TextField
            fullWidth
            placeholder="Search group chats..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "rgba(255,255,255,0.4)", fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: {
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "12px",
                color: "#fff",
                "& fieldset": { border: "none" },
                "& input::placeholder": { color: "rgba(255,255,255,0.4)" },
              },
            }}
          />
        </Box>

        <Box className="comp-sidebar-scroll">
          {loadingCategories ? (
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 5 }}>
              <CircularProgress size={30} thickness={4} sx={{ color: "#818cf8", mb: 2 }} />
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                Loading communities...
              </Typography>
            </Box>
          ) : filteredCategories.length === 0 ? (
            <Box sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.5)" }}>
                No groups found matching "{searchText}"
              </Typography>
            </Box>
          ) : (
            filteredCategories.map((cat) => (
              <Accordion
                key={cat.id}
                expanded={Boolean(expandedCategories[cat.id])}
                onChange={() => handleCategoryToggle(cat.id)}
                disableGutters
                elevation={0}
                sx={{
                  background: "transparent",
                  color: "#fff",
                  position: "unset",
                  "&::before": { display: "none" },
                  "&.Mui-expanded": { margin: 0 },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon sx={{ color: "rgba(255,255,255,0.45)" }} />}
                  sx={{
                    px: 2.5,
                    py: 1,
                    "&.Mui-expanded": { minHeight: "unset" },
                    "& .MuiAccordionSummary-content": {
                      margin: "0 !important",
                      alignItems: "center",
                      gap: 1.5,
                    },
                  }}
                >
                  <Box
                    component="img"
                    src={`${ENV.IMAGE_URL}/logos/${cat.image}`}
                    alt={cat.name}
                    sx={{ width: 28, height: 28, borderRadius: "6px", objectFit: "cover" }}
                  />
                  <Box>
                    <Typography sx={{ fontWeight: 700, fontSize: "14px", letterSpacing: "0.2px" }}>
                      {cat.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "rgba(255, 255, 255, 0.4)", display: "block" }}
                    >
                      {cat.groups.length} groups
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, pb: 1 }}>
                  <List disablePadding>
                    {cat.groups.map((group) => {
                      const isActive = group.id === groupId;
                      return (
                        <ListItemButton
                          key={group.id}
                          selected={isActive}
                          onClick={() => handleGroupSelect(group.id)}
                          sx={{
                            pl: 4,
                            pr: 2.5,
                            py: 1.25,
                            mx: 1.5,
                            borderRadius: "10px",
                            mb: 0.5,
                            background: isActive
                              ? "rgba(99, 102, 241, 0.15) !important"
                              : "transparent",
                            border: isActive
                              ? "1.5px solid rgba(99, 102, 241, 0.3)"
                              : "1.5px solid transparent",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              background: "rgba(255, 255, 255, 0.04)",
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "13.5px",
                                    color: isActive ? "#818cf8" : "#fff",
                                  }}
                                >
                                  # {group.name}
                                </Typography>
                              </Stack>
                            }
                            secondary={
                              <Typography
                                sx={{
                                  fontSize: "11px",
                                  color: "rgba(255,255,255,0.45)",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 1,
                                  WebkitBoxOrient: "vertical",
                                  overflow: "hidden",
                                }}
                              >
                                {group.description}
                              </Typography>
                            }
                            disableTypography
                          />
                        </ListItemButton>
                      );
                    })}
                  </List>
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>
      </Box>

      {/* ── CHAT PANEL ── */}
      <Box
        className={`comp-chat-panel ${!groupId ? "comp-chat-panel-hidden-mobile" : ""
          }`}
      >
        {activeGroup ? (
          <Box className="comp-chat-frame">
            {/* Group Chat Header */}
            <Box className="comp-chat-header">
              <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <IconButton
                    onClick={handleBackToSidebar}
                    sx={{
                      color: "#64748b",
                      display: { xs: "flex", md: "none" },
                      mr: 0.5,
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>

                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #e0f2fe, #eef2ff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      component="img"
                      src={`${ENV.IMAGE_URL}/logos/${activeGroup.categoryImage}`}
                      alt="Category"
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </Box>

                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: "15px", color: "#0f172a" }}>
                      # {activeGroup.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#64748b",
                        display: "-webkit-box",
                        WebkitLineClamp: 1,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {activeGroup.description}
                    </Typography>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  {activeGroup.chat_timing && (
                    <Chip
                      label={`🕒 ${activeGroup.chat_timing}`}
                      variant="outlined"
                      size="small"
                      sx={{
                        fontWeight: 600,
                        borderColor: "rgba(99,102,241,0.3)",
                        color: "#6366f1",
                        background: "rgba(99,102,241,0.03)",
                      }}
                    />
                  )}
                  <Chip
                    icon={
                      <CircleIcon
                        sx={{
                          fontSize: "8px !important",
                          color: status === "connected" ? "#10b981" : "#ef4444",
                        }}
                      />
                    }
                    label={status === "connected" ? "Live" : "Connecting..."}
                    variant="outlined"
                    size="small"
                    sx={{
                      fontWeight: 700,
                      borderColor: status === "connected" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
                      color: status === "connected" ? "#10b981" : "#ef4444",
                      background: status === "connected" ? "rgba(16,185,129,0.03)" : "rgba(239,68,68,0.03)",
                    }}
                  />
                </Stack>
              </Stack>
            </Box>

            <Divider sx={{ opacity: 0.07 }} />

            {/* Group Chat Messages List */}
            <Box
              className="comp-message-list"
              ref={messageListRef}
            >
              {/* Load More Spinner */}
              {hasMore && (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 1.5,
                  }}
                >
                  {loadingMore ? (
                    <CircularProgress size={22} thickness={4} sx={{ color: "#6366f1" }} />
                  ) : (
                    <Typography
                      variant="caption"
                      sx={{
                        color: "#94a3b8",
                        cursor: "pointer",
                        userSelect: "none",
                        "&:hover": { color: "#6366f1" },
                        transition: "color 0.15s",
                      }}
                      onClick={handleLoadMore}
                    >
                      ↑ Scroll up to load older messages
                    </Typography>
                  )}
                </Box>
              )}
              {loadingGroupMessages ? (
                <Box
                  className="comp-group-loader"
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flex: 1,
                    minHeight: "320px",
                    p: 4,
                    textAlign: "center",
                  }}
                >
                  <Box
                    sx={{
                      position: "relative",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      mb: 2.5,
                    }}
                  >
                    {/* Outer glowing ring */}
                    <Box
                      sx={{
                        position: "absolute",
                        width: 72,
                        height: 72,
                        borderRadius: "50%",
                        background: "rgba(99, 102, 241, 0.15)",
                        animation: "pulseGlow 2s infinite ease-in-out",
                      }}
                    />
                    <CircularProgress
                      size={60}
                      thickness={3.5}
                      sx={{
                        color: "#6366f1",
                        animationDuration: "1.1s",
                      }}
                    />
                    <Box
                      component="img"
                      src={`${ENV.IMAGE_URL}/logos/${activeGroup.categoryImage}`}
                      alt={activeGroup.name}
                      sx={{
                        position: "absolute",
                        width: 30,
                        height: 30,
                        borderRadius: "9px",
                        objectFit: "cover",
                        boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
                      }}
                    />
                  </Box>

                  <Typography
                    sx={{
                      fontWeight: 800,
                      fontSize: "15.5px",
                      color: "#0f172a",
                      mb: 0.5,
                      letterSpacing: "-0.2px",
                    }}
                  >
                    Connecting to # {activeGroup.name}
                  </Typography>

                  <Typography variant="body2" sx={{ color: "#64748b", fontSize: "13px", maxWidth: 260 }}>
                    Fetching group messages and discussion history...
                  </Typography>
                </Box>
              ) : messages.length === 0 ? (
                <Box className="comp-empty-state">
                  <ForumIcon sx={{ fontSize: 44, color: "#c7d2fe", mb: 1.5 }} />
                  <Typography sx={{ fontWeight: 700, color: "#0f172a", fontSize: "15px" }}>
                    Welcome to # {activeGroup.name}!
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#64748b", maxWidth: 300, mt: 0.5 }}>
                    This is the start of the chat. Be the first to send a message!
                  </Typography>
                </Box>
              ) : (
                messages.map((msg, i) => {
                  const senderId = msg.from || msg.userId;
                  const isMe =
                    senderId === socketId ||
                    senderId === localStorage.getItem("funchat_user_id");
                  const isSystem = msg.from === "system";

                  return (
                    <Box
                      key={i}
                      sx={{
                        display: "flex",
                        justifyContent: isSystem
                          ? "center"
                          : isMe
                            ? "flex-end"
                            : "flex-start",
                        mb: 1.5,
                        width: "100%",
                      }}
                    >
                      {isSystem ? (
                        <Box className="comp-system-msg">
                          {msg.text}
                        </Box>
                      ) : (
                        <Stack spacing={0.3} sx={{ maxWidth: "75%" }}>
                          {!isMe && (
                            <Typography className="comp-bubble-sender">
                              {msg.senderName || "Stranger"}
                            </Typography>
                          )}
                          <Box
                            className={
                              isMe ? "comp-bubble comp-bubble-me" : "comp-bubble comp-bubble-them"
                            }
                          >
                            <Box className="comp-bubble-content">
                              {(
                                msg.parts ||
                                (msg.emojiUrl
                                  ? [{ type: "emoji", url: msg.emojiUrl }]
                                  : [{ type: "text", text: msg.text || "" }])
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
                        </Stack>
                      )}
                    </Box>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingUsersList.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
                  <Stack spacing={0.3}>
                    <Typography className="comp-bubble-sender">
                      {getTypingText()}
                    </Typography>
                    <Box className="comp-bubble comp-bubble-them comp-typing-bubble">
                      <Box className="typing-dots" aria-label="Users typing">
                        <span />
                        <span />
                        <span />
                      </Box>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* Dynamic Spacer: Guarantees latest message is positioned with generous breathing room above composer & keywords */}
              <Box
                ref={messagesEndRef}
                sx={{
                  height: isMobile ? `${Math.max(composerHeight, 115) + keyboardHeight + 36}px` : "24px",
                  minHeight: isMobile ? `${Math.max(composerHeight, 115) + keyboardHeight + 36}px` : "24px",
                  width: "100%",
                  flexShrink: 0,
                  transition: "height 0.12s ease-out",
                }}
              />
            </Box>

            {/* Composer Section — Fixed above keyboard on mobile */}
            <Box
              className="comp-composer"
              ref={composerRef}
              style={isMobile ? {
                position: "fixed",
                left: 0,
                right: 0,
                bottom: `${keyboardHeight}px`,
                zIndex: 1200,
                paddingBottom: keyboardHeight > 0 ? "8px" : "calc(10px + env(safe-area-inset-bottom, 0px))",
                transition: "bottom 0.12s ease-out",
              } : undefined}
            >
              {hasClickedInput && (
                <Box className="comp-keywords-container">
                  {QUICK_KEYWORDS.map((kw, idx) => (
                    <Box
                      key={idx}
                      className="comp-keyword-chip"
                      onClick={() => handleKeywordClick(kw)}
                    >
                      {kw}
                    </Box>
                  ))}
                </Box>
              )}
              <Stack direction="row" spacing={1.5} alignItems="flex-end">
                <Box className="comp-input-capsule">
                  <Box sx={{ position: "relative" }} className="comp-emoji-wrapper">
                    <Tooltip title="Emoji" arrow>
                      <IconButton
                        size="small"
                        className="comp-emoji-btn"
                        onClick={() => setEmojiOpen((v) => !v)}
                      >
                        <EmojiEmotionsOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {emojiOpen && (
                      <Box className="emoji-picker" sx={{ bottom: "50px", left: "0", zIndex: 1300 }}>
                        <Picker isOpen handleEmojiSelect={handleEmojiSelect} />
                      </Box>
                    )}
                  </Box>

                  <Box
                    className="comp-input"
                    contentEditable={cooldownRemaining === 0}
                    role="textbox"
                    aria-label="Group message input"
                    data-placeholder={cooldownRemaining > 0 ? `Slow mode active. Wait ${cooldownRemaining}s...` : `Message # ${activeGroup.name}...`}
                    ref={inputRef}
                    onInput={handleComposerInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    onClick={() => {
                      setHasClickedInput(true);
                      setTimeout(() => scrollToBottom(false), 50);
                      setTimeout(() => scrollToBottom(false), 150);
                    }}
                    onFocus={() => {
                      setHasClickedInput(true);
                      setTimeout(() => scrollToBottom(false), 50);
                      setTimeout(() => scrollToBottom(false), 150);
                      setTimeout(() => scrollToBottom(false), 350);
                    }}
                    suppressContentEditableWarning
                  />

                  <IconButton
                    size="small"
                    className="comp-attach-btn"
                    sx={{ color: "#94a3b8", p: "4px", ml: "2px", mb: "4px" }}
                    onClick={() => {
                      if (inputRef.current) inputRef.current.focus();
                      scrollToBottom(true);
                      setTimeout(() => scrollToBottom(true), 60);
                      setTimeout(() => scrollToBottom(true), 150);
                    }}
                  >
                    <AttachFileIcon sx={{ fontSize: 20 }} />
                  </IconButton>
                </Box>

                <Tooltip title="Send (Enter)" arrow>
                  <span>
                    <IconButton
                      id="comp-send-btn"
                      className="comp-send-btn"
                      onClick={handleSend}
                      disabled={cooldownRemaining > 0}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <SendRoundedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>
            </Box>
          </Box>
        ) : (
          <Box className="comp-welcome-screen">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 6 },
                textAlign: "center",
                maxWidth: 550,
                background: "rgba(255,255,255,0.72)",
                backdropFilter: "blur(16px)",
                border: "1px solid rgba(226,232,240,0.8)",
                boxShadow: "0 12px 40px rgba(15,23,42,0.05)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "20px",
                  background: "linear-gradient(135deg, #e0f2fe, #eef2ff)",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 3,
                  boxShadow: "0 8px 24px rgba(2,132,199,0.12)",
                }}
              >
                <GroupsIcon sx={{ fontSize: 32 }} />
              </Box>

              <Typography variant="h5" sx={{ fontWeight: 800, color: "#0f172a", mb: 1.5 }}>
                FunChat Communities
              </Typography>
              <Typography variant="body2" sx={{ color: "#64748b", mb: 3.5, lineHeight: 1.6 }}>
                Welcome to the group chat portal! Select a specialized room on the left side menu to join real-time conversations with other community members. Practice languages, discuss technology, debate Android vs iPhone, or talk gaming!
              </Typography>

              <Box sx={{ width: "100%", textAlign: "left" }}>
                <Typography variant="caption" sx={{ color: "#4f46e5", fontWeight: 800, letterSpacing: "1px", mb: 2, display: "block" }}>
                  POPULAR CATEGORIES
                </Typography>
                <Stack spacing={1.5}>
                  <Box
                    onClick={() => handleGroupSelect("tech-ai")}
                    sx={{
                      p: 1.75,
                      borderRadius: "12px",
                      border: "1.5px solid rgba(226,232,240,0.8)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      background: "#fff",
                      transition: "all 0.18s ease",
                      "&:hover": {
                        borderColor: "#4f46e5",
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: 20 }}>💻</Typography>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                        # AI & Machine Learning
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        Chat about LLMs, neural networks, and future tech.
                      </Typography>
                    </Box>
                    <KeyboardDoubleArrowRightIcon sx={{ color: "#94a3b8", ml: "auto", fontSize: 18 }} />
                  </Box>

                  <Box
                    onClick={() => handleGroupSelect("debates-ai-jobs")}
                    sx={{
                      p: 1.75,
                      borderRadius: "12px",
                      border: "1.5px solid rgba(226,232,240,0.8)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      background: "#fff",
                      transition: "all 0.18s ease",
                      "&:hover": {
                        borderColor: "#4f46e5",
                        transform: "translateX(4px)",
                      },
                    }}
                  >
                    <Typography sx={{ fontSize: 20 }}>⚖️</Typography>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }}>
                        # AI Will Replace Jobs?
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#64748b" }}>
                        Automation impact, basic income, and future careers.
                      </Typography>
                    </Box>
                    <KeyboardDoubleArrowRightIcon sx={{ color: "#94a3b8", ml: "auto", fontSize: 18 }} />
                  </Box>
                </Stack>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}
