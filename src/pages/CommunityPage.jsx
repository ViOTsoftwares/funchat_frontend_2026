import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
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
  const [typingUsers, setTypingUsers] = useState({});
  const [emojiOpen, setEmojiOpen] = useState(false);

  const [profileName, setProfileName] = useState(
    localStorage.getItem("funchat_profile_name") || "Stranger"
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasClickedInput, setHasClickedInput] = useState(false);

  const inputRef = useRef(null);
  const messageListRef = useRef(null);
  const lastTypingSentRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const composerRef = useRef(null);
  const [composerHeight, setComposerHeight] = useState(64);

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
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track composer height so message list can pad-bottom to avoid content hiding
  useEffect(() => {
    if (!composerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (composerRef.current) {
        setComposerHeight(composerRef.current.offsetHeight);
      }
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

    // Reset messages and typing indicators when changing group
    setMessages([]);
    setTypingUsers({});

    // Listen to messages
    const handleGroupMessage = (msg) => {
      if (msg.groupId === groupId) {
        setMessages((prev) => [...prev, msg]);
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
      if (ack && ack.ok) {
        setMessages(ack.history || []);
        setMessageDelay(ack.messageDelay || 0);
        setCooldownRemaining(ack.userRemainingMs ? Math.ceil(ack.userRemainingMs / 1000) : 0);
        // Scroll to bottom
        setTimeout(scrollToBottom, 80);
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

  // Always scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, typingUsers]);

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

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
    const messagePayload = {
      groupId,
      parts,
      text: textContent,
      senderName: profileName
    };
    if (firstEmoji && textContent.trim() === "") {
      messagePayload.emojiUrl = firstEmoji;
    }

    socketRef.current.emit("group_message", messagePayload);
    emitTyping(false);

    if (messageDelay > 0) {
      setLastMessageSentAt(Date.now());
      setCooldownRemaining(messageDelay * 60);
    }

    if (inputRef.current) {
      inputRef.current.innerHTML = "";
    }

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
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
          {filteredCategories.length === 0 ? (
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
              style={isMobile ? { paddingBottom: composerHeight + 8 } : undefined}
            >
              {messages.length === 0 ? (
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
            </Box>

            {/* Composer Section - WhatsApp style: fixed to bottom on mobile */}
            <Box
              className="comp-composer"
              ref={composerRef}
              style={isMobile ? {
                position: "fixed",
                left: 0,
                right: 0,
                bottom: "var(--keyboard-offset, 0px)",
                zIndex: 200,
                background: "rgba(255,255,255,0.98)",
                backdropFilter: "blur(16px)",
                borderTop: "1px solid rgba(226,232,240,0.8)",
                padding: "8px 12px 10px",
                boxShadow: "0 -2px 12px rgba(15,23,42,0.07)",
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
                    onClick={() => setHasClickedInput(true)}
                    onFocus={() => setHasClickedInput(true)}
                    suppressContentEditableWarning
                  />

                  <IconButton
                    size="small"
                    className="comp-attach-btn"
                    sx={{ color: "#94a3b8", p: "4px", ml: "2px", mb: "4px" }}
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
