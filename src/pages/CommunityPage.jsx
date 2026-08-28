import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from "react";
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
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import CloseIcon from "@mui/icons-material/Close";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import TagIcon from "@mui/icons-material/Tag";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldIcon from "@mui/icons-material/Shield";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ReplyRoundedIcon from "@mui/icons-material/ReplyRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import ImageIcon from "@mui/icons-material/Image";
import ZoomInRoundedIcon from "@mui/icons-material/ZoomInRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import { useSocket } from "../hooks/useSocket.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Picker } from "ms-3d-emoji-picker";
import { ENV } from "../config/env.js";
import { GetCommunityApi, UploadCommunityImageApi, GetCommunityMediaSettingsApi } from "../Api.js";
import { toastMessage } from "../lib/toast.message.js";
import AdBanner from "../components/AdBanner.jsx";
import AdPopup from "../components/AdPopup.jsx";

function isMessageEditable(createdAt) {
  if (!createdAt) return true;
  const msgTime = new Date(createdAt).getTime();
  if (isNaN(msgTime)) return true;
  const TEN_MINUTES_MS = 10 * 60 * 1000;
  return Date.now() - msgTime <= TEN_MINUTES_MS;
}

function formatMessageTime(dateString) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

function formatDateHeader(dateString) {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const today = new Date();
    const isToday =
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();
    if (isToday) return "Today";

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getDate() === yesterday.getDate() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getFullYear() === yesterday.getFullYear();
    if (isYesterday) return "Yesterday";

    return d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  } catch {
    return "";
  }
}

export default function CommunityPage() {
  const { groupId: urlGroupId } = useParams();
  const navigate = useNavigate();
  const { socketRef, status, socketId } = useSocket();
  const { isAuthenticated, user, openLoginModal, loading: authLoading } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [groupId, setGroupId] = useState(urlGroupId || "");
  const [searchText, setSearchText] = useState("");
  const [expandedCategories, setExpandedCategories] = useState({});

  // Synchronize groupId with urlGroupId whenever route parameter changes
  useEffect(() => {
    setGroupId(urlGroupId || "");
  }, [urlGroupId]);

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

  // Reply & Edit states
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const [activeActionMsgId, setActiveActionMsgId] = useState(null);

  // Image upload, Auth prompt & Lightbox states
  const [selectedImage, setSelectedImage] = useState(null); // { file, previewUrl, name, sizeStr }
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState(null);
  const [communityMediaSettings, setCommunityMediaSettings] = useState({ enabled: true, maxFileSizeMB: 5 });
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const [profileName, setProfileName] = useState(
    user?.username || localStorage.getItem("funchat_profile_name") || "Stranger"
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hasClickedInput, setHasClickedInput] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [composerHeight, setComposerHeight] = useState(76);

  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageListRef = useRef(null);
  const messagesEndRef = useRef(null);
  const composerRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const lastTypingSentRef = useRef(false);
  const typingTimeoutRef = useRef(null);
  const prevScrollHeightRef = useRef(0);
  const prevScrollTopRef = useRef(0);
  const isLoadingOlderRef = useRef(false);

  const getFullImageUrl = useCallback((path) => {
    if (!path) return "";
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("blob:") || path.startsWith("data:")) {
      return path;
    }
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    const base = (ENV.API_URL || "http://localhost:4000").replace(/\/+$/, "");
    return `${base}${cleanPath}`;
  }, []);

  // ── scrollToBottom ────────────────────────────────────────────────────────
  // Robust multi-frame scroll function guaranteeing latest message is completely visible
  const scrollToBottom = useCallback((smooth = false) => {
    const doScroll = () => {
      if (messageListRef.current) {
        const el = messageListRef.current;
        el.scrollTop = el.scrollHeight + 100000;
      }
    };
    doScroll();
    requestAnimationFrame(doScroll);
    setTimeout(doScroll, 20);
    setTimeout(doScroll, 80);
  }, []);

  // Synchronously anchor scroll position when older messages are prepended to the top
  useLayoutEffect(() => {
    if (isLoadingOlderRef.current && messageListRef.current) {
      const el = messageListRef.current;
      const newScrollHeight = el.scrollHeight;
      const heightDelta = newScrollHeight - prevScrollHeightRef.current;
      if (heightDelta > 0) {
        el.scrollTop = prevScrollTopRef.current + heightDelta;
      }
      isLoadingOlderRef.current = false;
    }
  }, [messages]);

  // Whenever keyboard opens/closes or composer resizes,
  // ensure the newest message is positioned above input ONLY IF user is at the bottom!
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom(false);
      const t1 = setTimeout(() => scrollToBottom(false), 30);
      const t2 = setTimeout(() => scrollToBottom(false), 120);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [keyboardHeight, composerHeight, scrollToBottom]);

  // Monitor auth user changes
  useEffect(() => {
    if (user?.username) {
      setProfileName(user.username);
    } else {
      setProfileName(localStorage.getItem("funchat_profile_name") || "Stranger");
    }
  }, [user]);

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

  // Track composer height dynamically (including quick keywords chips bar)
  useEffect(() => {
    if (!composerRef.current) return;
    const update = () => {
      if (composerRef.current) {
        const h = composerRef.current.offsetHeight || composerRef.current.getBoundingClientRect().height;
        if (h > 0) {
          setComposerHeight(h);
          scrollToBottom(false);
        }
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, [hasClickedInput, scrollToBottom]);

  // Fetch categories & media settings from backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const json = await GetCommunityApi();
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

    const fetchMediaSettings = async () => {
      try {
        const res = await GetCommunityMediaSettingsApi();
        if (res?.success && res?.result) {
          setCommunityMediaSettings(res.result);
        }
      } catch (err) {
        console.error("Failed to fetch media settings", err);
      }
    };

    fetchCategories();
    fetchMediaSettings();
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

  // Compute popular categories & rooms dynamically based on admin config
  const popularItems = useMemo(() => {
    const items = [];
    categories.forEach((cat) => {
      cat.groups?.forEach((g) => {
        if (g.isPopular || cat.isPopular) {
          items.push({
            ...g,
            categoryName: cat.name,
            categoryImage: cat.image,
          });
        }
      });
    });

    // Fallback to the first few groups if none are explicitly flagged yet
    if (items.length === 0) {
      categories.forEach((cat) => {
        cat.groups?.forEach((g) => {
          if (items.length < 5) {
            items.push({
              ...g,
              categoryName: cat.name,
              categoryImage: cat.image,
            });
          }
        });
      });
    }
    return items;
  }, [categories]);

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
    if (!isAuthenticated || !currentSocket || status !== "connected" || !groupId) return;

    // Set group loading state and reset messages
    setLoadingGroupMessages(true);
    setMessages([]);
    setTypingUsers({});
    setHasMore(false);
    setSkipCount(0);
    setLoadingMore(false);

    // Listen to messages
    const handleGroupMessage = (msg) => {
      if (!msg) return;
      if (msg.groupId && msg.groupId !== groupId) return;

      setMessages((prev) => {
        const myUserId = localStorage.getItem("funchat_user_id") || "";
        const mySockId = socketRef.current?.id || socketId || "";
        const currentProfileName = (profileName || localStorage.getItem("funchat_profile_name") || "").trim().toLowerCase();

        const isSenderMe =
          Boolean(msg.tempId && prev.some((m) => m.tempId === msg.tempId)) ||
          (myUserId && (msg.from === myUserId || msg.userId === myUserId)) ||
          (mySockId && (msg.from === mySockId || msg.userId === mySockId)) ||
          (currentProfileName && currentProfileName !== "stranger" && msg.senderName && msg.senderName.trim().toLowerCase() === currentProfileName);

        // Case 1: System messages (prevent duplicate join/leave broadcasts)
        if (msg.from === "system") {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.from === "system" && lastMsg.text === msg.text) {
            return prev;
          }
          return [...prev, msg];
        }

        // Case 2: Matching an optimistic message sent locally
        let replacedOptimistic = false;
        const withOptimisticReplaced = prev.map((m) => {
          if (replacedOptimistic) return m;

          // Direct ID / tempId match
          const directIdMatch =
            (msg.id && (m.id === msg.id || m.tempId === msg.id)) ||
            (msg.tempId && (m.tempId === msg.tempId || m.id === msg.tempId));

          if (directIdMatch) {
            replacedOptimistic = true;
            return {
              ...msg,
              id: msg.id || m.id || m.tempId,
              tempId: m.tempId || m.id,
              isOptimistic: false,
            };
          }

          // If this is an optimistic pending message from me
          if (m.isOptimistic) {
            const sameSender =
              isSenderMe ||
              m.from === msg.from ||
              (m.senderName && msg.senderName && m.senderName.trim().toLowerCase() === msg.senderName.trim().toLowerCase());

            const textMatches = (m.text || "").trim() === (msg.text || "").trim();
            const emojiMatches = Boolean(m.emojiUrl && msg.emojiUrl && m.emojiUrl === msg.emojiUrl);
            const contentMatches = textMatches || emojiMatches;

            // Check if this optimistic message was created recently (within last 2 minutes on client clock)
            const timeSinceCreation = Date.now() - (m.localTimestamp || (m.createdAt ? new Date(m.createdAt).getTime() : Date.now()));
            const isRecent = isNaN(timeSinceCreation) || timeSinceCreation < 120000;

            if (contentMatches && (sameSender || isRecent)) {
              replacedOptimistic = true;
              return {
                ...msg,
                id: msg.id || m.id || m.tempId,
                tempId: m.tempId || m.id,
                isOptimistic: false,
                from: m.from || msg.from,
                userId: m.userId || msg.userId || myUserId,
                senderName: m.senderName || msg.senderName,
              };
            }
          }

          return m;
        });

        if (replacedOptimistic) {
          return withOptimisticReplaced;
        }

        // Case 3: Message is already in the list (duplicate server broadcast or already fetched)
        const isDuplicate = prev.some((m) => {
          if (msg.id && m.id === msg.id) return true;
          if (msg.tempId && (m.tempId === msg.tempId || m.id === msg.tempId)) return true;
          if (m.tempId && (m.tempId === msg.id || m.tempId === msg.tempId)) return true;
          
          if (
            m.text === msg.text &&
            (m.from === msg.from || m.senderName === msg.senderName) &&
            m.createdAt === msg.createdAt
          ) {
            return true;
          }
          return false;
        });

        if (isDuplicate) {
          return prev;
        }

        // Case 4: Brand new message from another user or confirmed message
        const newMsg = {
          ...msg,
          id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          isOptimistic: false,
        };
        return [...prev, newMsg];
      });

      // Only auto-scroll if user is near the bottom (WhatsApp smart-scroll behavior)
      if (isAtBottomRef.current) {
        scrollToBottom(false);
        setTimeout(() => scrollToBottom(false), 80);
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

    const handleGroupMessageEdited = (data) => {
      if (!data || !data.messageId) return;
      const targetId = String(data.messageId);
      setMessages((prev) =>
        prev.map((m) => {
          const currentId = String(m.id || m.tempId || "");
          if (currentId && currentId === targetId) {
            return {
              ...m,
              text: data.text,
              parts: data.parts || m.parts,
              emojiUrl: data.emojiUrl !== undefined ? data.emojiUrl : m.emojiUrl,
              isEdited: true,
              editedAt: data.editedAt || new Date().toISOString(),
            };
          }
          return m;
        })
      );
    };

    const handleMediaSettingsUpdated = (data) => {
      if (data) {
        setCommunityMediaSettings(data);
      }
    };

    currentSocket.on("group_message", handleGroupMessage);
    currentSocket.on("group_message_edited", handleGroupMessageEdited);
    currentSocket.on("group_typing", handleGroupTyping);
    currentSocket.on("slow_mode_error", handleSlowModeError);
    currentSocket.on("community_media_settings_updated", handleMediaSettingsUpdated);

    // Join room
    currentSocket.emit("join_group", { groupId, name: profileName }, (ack) => {
      setLoadingGroupMessages(false);
      if (ack && ack.ok) {
        const rawHistory = ack.history || [];
        const normalizedHistory = rawHistory.map((m, idx) => ({
          ...m,
          id: m.id || m._id || `hist_${m.createdAt ? new Date(m.createdAt).getTime() : idx}_${idx}`,
          isEdited: Boolean(m.isEdited),
        }));
        setMessages(normalizedHistory);
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
      currentSocket.off("group_message_edited", handleGroupMessageEdited);
      currentSocket.off("group_typing", handleGroupTyping);
      currentSocket.off("slow_mode_error", handleSlowModeError);
      currentSocket.off("community_media_settings_updated", handleMediaSettingsUpdated);
      currentSocket.emit("leave_group", { groupId });
    };
  }, [socketRef, status, groupId, profileName]);

  // Escape key handler to close lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && activeLightboxImage) {
        setActiveLightboxImage(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeLightboxImage]);

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

  // Auto-scroll whenever new messages arrive — ONLY if user is already at the bottom
  // and NOT when older messages are being loaded via pagination
  useEffect(() => {
    if (messages.length === 0) return;
    if (isLoadingOlderRef.current) return;
    if (isAtBottomRef.current) {
      scrollToBottom(false);
      const t = setTimeout(() => scrollToBottom(false), 80);
      return () => clearTimeout(t);
    }
  }, [messages.length, scrollToBottom]);

  // Scroll to bottom on typing indicator appearing only if user is at the bottom
  useEffect(() => {
    if (typingUsers && Object.keys(typingUsers).length > 0 && isAtBottomRef.current) {
      scrollToBottom(true);
    }
  }, [typingUsers, scrollToBottom]);

  // Load more (older) messages when scrolled to top
  const handleLoadMore = useCallback(() => {
    if (!socketRef.current || status !== "connected" || !groupId || loadingMore || !hasMore || isLoadingOlderRef.current) return;

    setLoadingMore(true);
    isLoadingOlderRef.current = true;

    // Snapshot current scroll height and scrollTop before prepending older messages
    if (messageListRef.current) {
      prevScrollHeightRef.current = messageListRef.current.scrollHeight;
      prevScrollTopRef.current = messageListRef.current.scrollTop;
    }

    const nextSkip = skipCount + 10;
    socketRef.current.emit("load_more_messages", { groupId, skip: nextSkip }, (res) => {
      if (res && res.ok && Array.isArray(res.messages)) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id || m.tempId).filter(Boolean));
          const newOlder = res.messages.filter((m) => !existingIds.has(m.id || m.tempId));
          return [...newOlder, ...prev];
        });
        setHasMore(res.hasMore || false);
        setSkipCount(nextSkip);
      } else {
        isLoadingOlderRef.current = false;
      }
      setLoadingMore(false);
    });
  }, [socketRef, status, groupId, loadingMore, hasMore, skipCount]);

  // Unified scroll listener: detects scroll-to-top (load more) + tracks isAtBottom
  useEffect(() => {
    const el = messageListRef.current;
    if (!el) return;

    const onScroll = () => {
      // Track bottom proximity for smart auto-scroll (user is within 80px of bottom)
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isAtBottomRef.current = distanceFromBottom < 80;

      // Load older messages when scrolled to top
      if (el.scrollTop <= 60 && hasMore && !loadingMore && !isLoadingOlderRef.current) {
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

    const emojiImgs = container.querySelectorAll("img.inline-emoji, img[data-emoji-url]");
    if (emojiImgs.length === 0) {
      const rawText = container.innerText || container.textContent || "";
      return rawText.trim() ? [{ type: "text", text: rawText.trim() }] : [];
    }

    const parts = [];
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) {
          parts.push({ type: "text", text: node.textContent });
        }
        return;
      }
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "IMG") {
          const url = node.getAttribute("data-emoji-url") || node.src;
          if (url) {
            parts.push({ type: "emoji", url });
            return;
          }
        }
        if (node.tagName === "BR") {
          parts.push({ type: "text", text: "\n" });
          return;
        }
        node.childNodes.forEach((child) => walk(child));
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

  const handleJumpToMessage = (targetMsgId) => {
    if (!targetMsgId) return;

    let targetEl = document.getElementById(`msg-${targetMsgId}`);
    if (!targetEl) {
      const foundMsg = messages.find((m) => m.id === targetMsgId || m.tempId === targetMsgId);
      if (foundMsg) {
        targetEl = document.getElementById(`msg-${foundMsg.id}`) || document.getElementById(`msg-${foundMsg.tempId}`);
      }
    }

    const containerEl = messageListRef.current;
    if (targetEl && containerEl) {
      const containerRect = containerEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const scrollTop =
        containerEl.scrollTop + (targetRect.top - containerRect.top) - containerRect.height / 2 + targetRect.height / 2;

      containerEl.scrollTo({ top: Math.max(0, scrollTop), behavior: "smooth" });

      setHighlightedMsgId(targetMsgId);
      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2000);
    } else if (targetEl) {
      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMsgId(targetMsgId);
      setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2000);
    }
  };

  const handleStartReply = (msg) => {
    setEditingMessage(null);
    let snippet = msg.text || "";
    if (!snippet && msg.emojiUrl) snippet = "🎨 Emoji";
    if (!snippet && Array.isArray(msg.parts)) {
      snippet =
        msg.parts.map((p) => p.text || "").join("") ||
        (msg.parts.some((p) => p.type === "emoji") ? "🎨 Emoji" : "Message");
    }
    setReplyingTo({
      id: msg.id || msg.tempId,
      senderName: msg.senderName || "Stranger",
      text: snippet || "Message",
      emojiUrl: msg.emojiUrl || "",
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  const handleStartEdit = (msg) => {
    setReplyingTo(null);
    setEditingMessage({
      id: msg.id || msg.tempId,
      text: msg.text || "",
      parts: msg.parts || [],
      emojiUrl: msg.emojiUrl || "",
    });

    const container = inputRef.current;
    if (container) {
      container.innerHTML = "";
      if (Array.isArray(msg.parts) && msg.parts.length > 0) {
        msg.parts.forEach((part) => {
          if (part.type === "emoji" && part.url) {
            const img = document.createElement("img");
            img.src = part.url;
            img.alt = "emoji";
            img.className = "inline-emoji";
            img.setAttribute("data-emoji-url", part.url);
            container.appendChild(img);
          } else if (part.type === "text" && part.text) {
            container.appendChild(document.createTextNode(part.text));
          }
        });
      } else {
        container.textContent = msg.text || "";
      }
      container.focus();

      // Place cursor at end
      try {
        const range = document.createRange();
        const sel = window.getSelection();
        range.selectNodeContents(container);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch {}
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    if (inputRef.current) {
      inputRef.current.innerHTML = "";
    }
  };

  const handleSaveEdit = () => {
    if (!editingMessage || !socketRef.current || !groupId) return;
    const container = inputRef.current;
    if (!container) return;

    const rawText = (container.innerText || container.textContent || "").trim();
    let parts = getComposerParts();
    const hasEmoji = parts.some((part) => part.type === "emoji");

    let textContent = "";
    if (parts.length > 0) {
      textContent = parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
    } else {
      textContent = rawText;
      if (rawText) {
        parts = [{ type: "text", text: rawText }];
      }
    }

    if (!hasEmoji && textContent.trim() === "" && rawText === "") return;

    const messageId = String(editingMessage?.id || "");
    if (!messageId) return;

    const newParts = parts.length > 0 ? parts : [{ type: "text", text: textContent || rawText }];
    const newText = textContent || rawText;

    // Optimistic local update ONLY for the targeted message
    setMessages((prev) =>
      prev.map((m) => {
        const currentId = String(m.id || m.tempId || "");
        if (currentId && currentId === messageId) {
          return {
            ...m,
            text: newText,
            parts: newParts,
            isEdited: true,
            editedAt: new Date().toISOString(),
          };
        }
        return m;
      })
    );

    let derivedEmoji = "";
    if (Array.isArray(newParts)) {
      const firstEmoji = newParts.find((part) => part?.type === "emoji");
      if (firstEmoji && newText.trim() === "") {
        derivedEmoji = firstEmoji.url;
      }
    }

    socketRef.current.emit("edit_group_message", {
      groupId,
      messageId,
      text: newText,
      parts: newParts,
      emojiUrl: derivedEmoji,
    });

    setEditingMessage(null);
    container.innerHTML = "";
  };

  const handleAttachClick = () => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageSelect = (e) => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      e.target.value = "";
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // reset file input

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toastMessage("Only image files (PNG, JPG, WEBP, GIF) are allowed.", "warning");
      return;
    }

    // Validate size (max 5MB)
    const maxLimitMB = Math.min(communityMediaSettings?.maxFileSizeMB || 5, 5);
    const maxBytes = maxLimitMB * 1024 * 1024;
    if (file.size > maxBytes) {
      toastMessage(`Selected image exceeds the maximum limit of ${maxLimitMB}MB. Please choose a smaller photo.`, "error");
      return;
    }

    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }

    const previewUrl = URL.createObjectURL(file);
    const sizeMB = file.size / (1024 * 1024);
    const sizeStr = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${Math.round(file.size / 1024)} KB`;

    setSelectedImage({
      file,
      previewUrl,
      name: file.name,
      sizeStr,
    });

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRemoveSelectedImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
  };

  const handleSend = async () => {
    if (editingMessage) {
      handleSaveEdit();
      return;
    }

    if (!socketRef.current || !groupId) return;
    if (cooldownRemaining > 0) return;

    const container = inputRef.current;
    const rawText = container ? (container.innerText || container.textContent || "").trim() : "";
    let parts = getComposerParts();
    const hasEmoji = parts.some((part) => part.type === "emoji");

    let textContent = "";
    if (parts.length > 0) {
      textContent = parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join("");
    } else {
      textContent = rawText;
      if (rawText) {
        parts = [{ type: "text", text: rawText }];
      }
    }

    // Must have text, emoji, or an image to send
    if (!hasEmoji && textContent.trim() === "" && rawText === "" && !selectedImage) return;

    let finalImageUrl = "";
    if (selectedImage?.file) {
      if (!isAuthenticated) {
        setAuthPromptOpen(true);
        return;
      }

      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("image", selectedImage.file);
        formData.append("groupId", groupId);
        const uploadRes = await UploadCommunityImageApi(formData);
        if (!uploadRes?.ok || !uploadRes?.imageUrl) {
          if (uploadRes?.status === 401) {
            setAuthPromptOpen(true);
            toastMessage("Please sign in to upload photos.", "info");
          } else {
            toastMessage(uploadRes?.message || "Failed to upload image. Please try again.", "error");
          }
          setUploadingImage(false);
          return;
        }
        finalImageUrl = uploadRes.imageUrl;
      } catch (err) {
        console.error("Upload error:", err);
        toastMessage("Failed to upload image. Please check your connection.", "error");
        setUploadingImage(false);
        return;
      } finally {
        setUploadingImage(false);
      }
    }

    const currentUserId = localStorage.getItem("funchat_user_id") || socketRef.current?.id || socketId || "";
    const currentSenderName = profileName || localStorage.getItem("funchat_profile_name") || "Stranger";
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const currentReply = replyingTo
      ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text,
          emojiUrl: replyingTo.emojiUrl || "",
          imageUrl: replyingTo.imageUrl || "",
        }
      : null;

    const messagePayload = {
      id: msgId,
      tempId: msgId,
      groupId,
      parts: parts.length > 0 ? parts : (textContent || rawText ? [{ type: "text", text: textContent || rawText }] : []),
      text: textContent || rawText,
      emojiUrl: "",
      imageUrl: finalImageUrl,
      from: currentUserId,
      userId: currentUserId,
      senderName: currentSenderName,
      replyTo: currentReply,
      isEdited: false,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      localTimestamp: Date.now(),
    };

    // Instant local UI update — 0ms delay!
    setMessages((prev) => [...prev, messagePayload]);
    setReplyingTo(null);

    if (selectedImage) {
      handleRemoveSelectedImage();
    }

    socketRef.current.emit("group_message", messagePayload);
    emitTyping(false);

    if (messageDelay > 0) {
      setLastMessageSentAt(Date.now());
      setCooldownRemaining(messageDelay * 60);
    }

    if (container) {
      container.innerHTML = "";
    }

    // Force-snap to bottom when user sends
    isAtBottomRef.current = true;
    scrollToBottom(false);
    setTimeout(() => scrollToBottom(false), 50);

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
    ([uid]) => uid !== socketId && uid !== socketRef.current?.id && uid !== localStorage.getItem("funchat_user_id")
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
    setGroupId(gId);
    navigate(`/community/${gId}`);
  };

  const handleBackToSidebar = () => {
    setGroupId("");
    navigate("/community");
  };

  if (authLoading) {
    return (
      <Box sx={{ minHeight: "calc(100vh - 80px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress size={40} sx={{ color: "#818cf8" }} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "calc(100vh - 80px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          py: 6,
          background: "radial-gradient(circle at 50% 30%, rgba(99, 102, 241, 0.15) 0%, rgba(15, 23, 42, 0) 70%)",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            maxWidth: 520,
            width: "100%",
            p: { xs: 3.5, sm: 5 },
            borderRadius: "24px",
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(99, 102, 241, 0.2)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "20px",
              background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 3,
              boxShadow: "0 10px 25px rgba(99, 102, 241, 0.4)",
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 38, color: "#ffffff" }} />
          </Box>

          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: "#ffffff",
              mb: 1.5,
              letterSpacing: "-0.5px",
              fontSize: { xs: "22px", sm: "26px" },
            }}
          >
            Community Chat Restricted
          </Typography>

          <Typography
            variant="body1"
            sx={{
              color: "rgba(255, 255, 255, 0.7)",
              mb: 4,
              fontSize: { xs: "14px", sm: "15px" },
              lineHeight: 1.6,
            }}
          >
            Community chat channels are reserved exclusively for registered & authenticated FunChat members. Please sign in or create an account to join group conversations, share media, and chat in live rooms.
          </Typography>

          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              onClick={openLoginModal}
              startIcon={<ShieldIcon />}
              sx={{
                py: 1.5,
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "15px",
                textTransform: "none",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                boxShadow: "0 8px 20px rgba(99, 102, 241, 0.35)",
                "&:hover": {
                  background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                  boxShadow: "0 12px 25px rgba(99, 102, 241, 0.5)",
                },
              }}
            >
              Sign In / Create Account
            </Button>

            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate("/")}
              sx={{
                py: 1.4,
                borderRadius: "14px",
                fontWeight: 600,
                fontSize: "15px",
                textTransform: "none",
                borderColor: "rgba(255, 255, 255, 0.15)",
                color: "rgba(255, 255, 255, 0.8)",
                "&:hover": {
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "#ffffff",
                },
              }}
            >
              Return to Home
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

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

          {/* Sponsored Ad Banner in Sidebar */}
          <Box sx={{ p: 2, pt: 1 }}>
            <AdBanner placement="community_sidebar" />
          </Box>
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
                  const myCurrentId = localStorage.getItem("funchat_user_id") || socketRef.current?.id || socketId;
                  const currentProfileName = (profileName || localStorage.getItem("funchat_profile_name") || "").trim().toLowerCase();
                  const isMe =
                    Boolean(msg.isOptimistic) ||
                    (myCurrentId && (senderId === myCurrentId || msg.userId === myCurrentId)) ||
                    (socketId && (senderId === socketId || msg.userId === socketId)) ||
                    (socketRef.current?.id && (senderId === socketRef.current.id || msg.userId === socketRef.current.id)) ||
                    (Boolean(msg.senderName) && Boolean(currentProfileName) && currentProfileName !== "stranger" && msg.senderName.trim().toLowerCase() === currentProfileName);
                  const isSystem = msg.from === "system";
                  const msgKey = msg.id || msg.tempId || `msg_${i}`;

                  // Date divider calculation
                  const prevMsg = i > 0 ? messages[i - 1] : null;
                  const currentDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
                  const prevDate = prevMsg?.createdAt ? new Date(prevMsg.createdAt).toDateString() : null;
                  const showDateDivider = currentDate && currentDate !== prevDate;
                  const dateHeaderStr = showDateDivider ? formatDateHeader(msg.createdAt) : null;

                  const isHighlighted = highlightedMsgId && (msg.id === highlightedMsgId || msg.tempId === highlightedMsgId);
                  const isActionActive = activeActionMsgId === msgKey;

                  const canEdit = isMe && isMessageEditable(msg.createdAt || msg.localTimestamp);

                  return (
                    <Box key={msgKey} sx={{ width: "100%" }}>
                      {/* Date Divider */}
                      {showDateDivider && dateHeaderStr && (
                        <Box className="comp-date-divider-wrap">
                          <Typography className="comp-date-divider">
                            {dateHeaderStr}
                          </Typography>
                        </Box>
                      )}

                      {/* Message Row */}
                      <Box
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
                          <Box
                            className={`comp-msg-wrapper ${isActionActive ? "active-action" : ""}`}
                            sx={{
                              maxWidth: { xs: "90%", sm: "80%" },
                              alignItems: isMe ? "flex-end" : "flex-start",
                            }}
                            onMouseEnter={() => !isMobile && setActiveActionMsgId(msgKey)}
                            onMouseLeave={() => !isMobile && setActiveActionMsgId(null)}
                          >
                            {!isMe && (
                              <Typography className="comp-bubble-sender">
                                {msg.senderName || "Stranger"}
                              </Typography>
                            )}

                            <Box className={`comp-msg-row ${isMe ? "comp-msg-row-me" : "comp-msg-row-them"}`}>
                              {/* If isMe: Action buttons appear to the left of bubble */}
                              {isMe && (
                                <Box className="comp-msg-actions">
                                  <Tooltip title="Reply" arrow>
                                    <IconButton
                                      size="small"
                                      className="comp-action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartReply(msg);
                                      }}
                                    >
                                      <ReplyRoundedIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                  {canEdit && (
                                    <Tooltip title="Edit (within 10m)" arrow>
                                      <IconButton
                                        size="small"
                                        className="comp-action-btn"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartEdit(msg);
                                        }}
                                      >
                                        <EditRoundedIcon sx={{ fontSize: 13 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              )}

                              <Box
                                id={`msg-${msg.id || msg.tempId}`}
                                className={`${isMe ? "comp-bubble comp-bubble-me" : "comp-bubble comp-bubble-them"} ${
                                  isHighlighted ? "comp-highlight-msg" : ""
                                }`}
                              >
                                {/* Reply Quote inside bubble */}
                                {msg.replyTo && (msg.replyTo.text || msg.replyTo.senderName || msg.replyTo.imageUrl) && (
                                  <Box
                                    className="comp-reply-quote"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleJumpToMessage(msg.replyTo.id);
                                    }}
                                  >
                                    <Typography className="comp-reply-quote-sender">
                                      {msg.replyTo.senderName || "User"}
                                    </Typography>
                                    <Typography className="comp-reply-quote-text">
                                      {msg.replyTo.imageUrl && !msg.replyTo.text
                                        ? "📷 Photo"
                                        : msg.replyTo.imageUrl
                                          ? `📷 Photo: ${msg.replyTo.text}`
                                          : msg.replyTo.text || (msg.replyTo.emojiUrl ? "🎨 Emoji" : "Message")}
                                    </Typography>
                                  </Box>
                                )}

                                {/* Image attachment inside bubble */}
                                {msg.imageUrl && (
                                  <Box
                                    className="comp-bubble-image-wrap"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveLightboxImage(getFullImageUrl(msg.imageUrl));
                                    }}
                                  >
                                    <img
                                      src={getFullImageUrl(msg.imageUrl)}
                                      alt="Attached photo"
                                      className="comp-bubble-image"
                                      loading="lazy"
                                    />
                                    <Box className="comp-bubble-image-overlay">
                                      <ZoomInRoundedIcon sx={{ fontSize: 20, color: "#ffffff" }} />
                                    </Box>
                                  </Box>
                                )}

                                {/* Message Content */}
                                {(msg.text || msg.emojiUrl || (msg.parts && msg.parts.length > 0)) && (
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
                                )}

                                {/* Footer: Time + Edited tag + Read tick */}
                                <Box className="comp-bubble-footer">
                                  {msg.isEdited && (
                                    <Typography className="comp-edited-tag">
                                      edited
                                    </Typography>
                                  )}
                                  <Typography className="comp-msg-time">
                                    {formatMessageTime(msg.createdAt || msg.localTimestamp || Date.now())}
                                  </Typography>
                                  {isMe && (
                                    <DoneAllIcon className="comp-msg-tick" />
                                  )}
                                </Box>
                              </Box>

                              {/* If !isMe: Action buttons appear to the right of bubble */}
                              {!isMe && (
                                <Box className="comp-msg-actions">
                                  <Tooltip title="Reply" arrow>
                                    <IconButton
                                      size="small"
                                      className="comp-action-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartReply(msg);
                                      }}
                                    >
                                      <ReplyRoundedIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        )}
                      </Box>
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

              {/* Dynamic Spacer: Guarantees latest message is positioned with generous breathing room above composer */}
              <Box
                ref={messagesEndRef}
                sx={{
                  height: isMobile ? `${Math.max(composerHeight, 76) + keyboardHeight + 48}px` : "32px",
                  minHeight: isMobile ? `${Math.max(composerHeight, 76) + keyboardHeight + 48}px` : "32px",
                  width: "100%",
                  flexShrink: 0,
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
                paddingBottom: keyboardHeight > 0 ? "8px" : "calc(12px + env(safe-area-inset-bottom, 0px))",
              } : undefined}
            >
              {/* Reply Preview Bar */}
              {replyingTo && (
                <Box className="comp-banner-bar comp-banner-reply">
                  <Box className="comp-banner-content">
                    <Box className="comp-banner-header">
                      <ReplyRoundedIcon sx={{ fontSize: 16 }} />
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 700 }}>
                        Replying to {replyingTo.senderName}
                      </Typography>
                    </Box>
                    <Typography className="comp-banner-text">
                      {replyingTo.imageUrl && !replyingTo.text
                        ? "📷 Photo"
                        : replyingTo.imageUrl
                          ? `📷 Photo: ${replyingTo.text}`
                          : replyingTo.text || (replyingTo.emojiUrl ? "🎨 Emoji" : "Message")}
                    </Typography>
                  </Box>
                  <Tooltip title="Cancel Reply" arrow>
                    <IconButton size="small" className="comp-banner-close" onClick={handleCancelReply}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {/* Edit Preview Bar */}
              {editingMessage && (
                <Box className="comp-banner-bar comp-banner-edit">
                  <Box className="comp-banner-content">
                    <Box className="comp-banner-header">
                      <EditRoundedIcon sx={{ fontSize: 16 }} />
                      <Typography sx={{ fontSize: "11.5px", fontWeight: 700 }}>
                        Editing Message
                      </Typography>
                    </Box>
                    <Typography className="comp-banner-text">
                      {editingMessage.text}
                    </Typography>
                  </Box>
                  <Tooltip title="Cancel Edit (Esc)" arrow>
                    <IconButton size="small" className="comp-banner-close" onClick={handleCancelEdit}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              {/* Selected Image Attachment Preview Bar */}
              {selectedImage && (
                <Box className="comp-image-preview-bar">
                  <Box className="comp-image-preview-thumb-wrap">
                    <img src={selectedImage.previewUrl} alt="Selected" className="comp-image-preview-thumb" />
                    {uploadingImage && (
                      <Box className="comp-image-upload-overlay">
                        <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, ml: 1.5 }}>
                    <Typography className="comp-image-preview-name" noWrap>
                      {selectedImage.name}
                    </Typography>
                    <Typography className="comp-image-preview-size">
                      {selectedImage.sizeStr} • Max 5MB
                    </Typography>
                  </Box>
                  <Tooltip title="Remove Image" arrow>
                    <IconButton
                      size="small"
                      className="comp-image-preview-remove"
                      onClick={handleRemoveSelectedImage}
                      disabled={uploadingImage}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}

              <Stack direction="row" spacing={1.5} alignItems="center">
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
                    data-placeholder={
                      cooldownRemaining > 0
                        ? `Slow mode active. Wait ${cooldownRemaining}s...`
                        : editingMessage
                          ? "Edit your message... (Esc to cancel, Enter to save)"
                          : replyingTo
                            ? `Reply to ${replyingTo.senderName}...`
                            : selectedImage
                              ? "Add a caption (optional)..."
                              : `Message # ${activeGroup.name}...`
                    }
                    ref={inputRef}
                    onInput={handleComposerInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (!isMobile && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      } else if (e.key === "Escape") {
                        if (editingMessage) {
                          e.preventDefault();
                          handleCancelEdit();
                        } else if (replyingTo) {
                          e.preventDefault();
                          handleCancelReply();
                        } else if (selectedImage) {
                          e.preventDefault();
                          handleRemoveSelectedImage();
                        }
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

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
                    style={{ display: "none" }}
                    onChange={handleImageSelect}
                  />

                  <Tooltip
                    title={
                      activeGroup?.allowImages === false || communityMediaSettings?.enabled === false
                        ? "Image uploads are disabled in this group"
                        : !isAuthenticated
                          ? "Sign in to attach photos"
                          : "Attach photo (Max 5MB)"
                    }
                    arrow
                  >
                    <span>
                      <IconButton
                        size="small"
                        className="comp-attach-btn"
                        disabled={activeGroup?.allowImages === false || communityMediaSettings?.enabled === false || uploadingImage}
                        sx={{ color: "#94a3b8", p: "4px" }}
                        onClick={handleAttachClick}
                      >
                        <AttachFileIcon sx={{ fontSize: 20 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>

                <Tooltip title={editingMessage ? "Save changes (Enter)" : uploadingImage ? "Uploading..." : "Send (Enter)"} arrow>
                  <span style={{ display: "inline-flex", alignItems: "center" }}>
                    <IconButton
                      id="comp-send-btn"
                      className="comp-send-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        handleSend();
                      }}
                      disabled={cooldownRemaining > 0 || uploadingImage}
                      sx={editingMessage ? {
                        background: "linear-gradient(135deg, #d97706, #f59e0b) !important",
                        boxShadow: "0 3px 10px rgba(217, 119, 6, 0.25) !important",
                        "&:hover": {
                          boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35) !important",
                        }
                      } : undefined}
                    >
                      {uploadingImage ? (
                        <CircularProgress size={18} sx={{ color: "#ffffff" }} />
                      ) : editingMessage ? (
                        <CheckRoundedIcon fontSize="small" />
                      ) : (
                        <SendRoundedIcon sx={{ fontSize: 20, ml: "2px" }} />
                      )}
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

              {popularItems.length > 0 && (
                <Box sx={{ width: "100%", textAlign: "left" }}>
                  <Typography variant="caption" sx={{ color: "#4f46e5", fontWeight: 800, letterSpacing: "1px", mb: 2, display: "block" }}>
                    POPULAR ROOMS & CATEGORIES
                  </Typography>
                  <Stack spacing={1.5}>
                    {popularItems.map((item) => (
                      <Box
                        key={item.id}
                        onClick={() => handleGroupSelect(item.id)}
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
                            boxShadow: "0 4px 12px rgba(79,70,229,0.08)",
                          },
                        }}
                      >
                        {item.categoryImage ? (
                          <Box
                            component="img"
                            src={`${ENV.IMAGE_URL}/logos/${item.categoryImage}`}
                            alt={item.categoryName}
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: "8px",
                              objectFit: "cover",
                              flexShrink: 0,
                              border: "1px solid #e2e8f0",
                            }}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <Typography sx={{ fontSize: 22 }}>💬</Typography>
                        )}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: "13px", color: "#0f172a" }} noWrap>
                              # {item.name}
                            </Typography>
                            {item.categoryName && (
                              <Chip
                                label={item.categoryName}
                                size="small"
                                sx={{
                                  height: 18,
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  backgroundColor: "#eef2ff",
                                  color: "#4f46e5",
                                }}
                              />
                            )}
                          </Box>
                          {item.description && (
                            <Typography variant="caption" sx={{ color: "#64748b", display: "block" }} noWrap>
                              {item.description}
                            </Typography>
                          )}
                        </Box>
                        <KeyboardDoubleArrowRightIcon sx={{ color: "#94a3b8", ml: "auto", fontSize: 18, flexShrink: 0 }} />
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Featured Sponsored Ad on Welcome Screen */}
              <Box sx={{ mt: 3, width: "100%" }}>
                <AdBanner placement="landing_featured" />
              </Box>
            </Paper>
          </Box>
        )}
      </Box>

      {/* ── POPUP DIALOG AD ── */}
      <AdPopup placement="popup_interstitial" delayMs={4500} />

      {/* ── Fullscreen Image Lightbox Modal ── */}
      {activeLightboxImage && (
        <Box
          className="comp-lightbox-backdrop"
          onClick={() => setActiveLightboxImage(null)}
        >
          <Box className="comp-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <Box className="comp-lightbox-top-bar">
              <Typography sx={{ color: "#ffffff", fontSize: "14px", fontWeight: 700, letterSpacing: "-0.2px" }}>
                🖼️ Community Image Viewer
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <IconButton
                  className="comp-lightbox-btn"
                  onClick={() => window.open(activeLightboxImage, "_blank")}
                  title="Open original in new tab"
                >
                  <DownloadRoundedIcon sx={{ fontSize: 20, color: "#ffffff" }} />
                </IconButton>
                <IconButton
                  className="comp-lightbox-btn"
                  onClick={() => setActiveLightboxImage(null)}
                  title="Close (Esc)"
                >
                  <CloseIcon sx={{ fontSize: 22, color: "#ffffff" }} />
                </IconButton>
              </Box>
            </Box>
            <Box className="comp-lightbox-img-wrap">
              <img
                src={activeLightboxImage}
                alt="Enlarged view"
                className="comp-lightbox-img"
              />
            </Box>
          </Box>
        </Box>
      )}

      {/* ── Professional Sign-In Required Modal ── */}
      {authPromptOpen && (
        <Box
          className="comp-auth-modal-backdrop"
          onClick={() => setAuthPromptOpen(false)}
        >
          <Box className="comp-auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <IconButton
              className="comp-auth-modal-close"
              size="small"
              onClick={() => setAuthPromptOpen(false)}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>

            <Box className="comp-auth-modal-header">
              <Box className="comp-auth-modal-icon-badge">
                <ImageIcon sx={{ fontSize: 30, color: "#4f46e5" }} />
                <Box className="comp-auth-modal-lock-pill">
                  <LockOutlinedIcon sx={{ fontSize: 12, color: "#ffffff" }} />
                </Box>
              </Box>
              <Chip
                label="MEMBER FEATURE"
                size="small"
                sx={{
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  fontWeight: 800,
                  fontSize: "10.5px",
                  letterSpacing: "0.5px",
                  height: 22,
                  mb: 1.5,
                }}
              />
              <Typography className="comp-auth-modal-title">
                Sign In to Share Photos
              </Typography>
              <Typography className="comp-auth-modal-subtitle">
                To keep community discussions safe, photo uploads are reserved for verified FunChat members.
              </Typography>
            </Box>

            <Box className="comp-auth-modal-features">
              <Box className="comp-auth-feature-item">
                <Box className="comp-auth-feature-dot">🖼️</Box>
                <Box>
                  <Typography className="comp-auth-feature-title">High Quality Photos up to 5MB</Typography>
                  <Typography className="comp-auth-feature-desc">Share pictures, screenshots, and visual discussions</Typography>
                </Box>
              </Box>
              <Box className="comp-auth-feature-item">
                <Box className="comp-auth-feature-dot">⚡</Box>
                <Box>
                  <Typography className="comp-auth-feature-title">Fast Instant Sync & Lightbox</Typography>
                  <Typography className="comp-auth-feature-desc">Interactive previews, photo replies, and fullscreen viewer</Typography>
                </Box>
              </Box>
              <Box className="comp-auth-feature-item">
                <Box className="comp-auth-feature-dot">🛡️</Box>
                <Box>
                  <Typography className="comp-auth-feature-title">100% Free & Fast Login</Typography>
                  <Typography className="comp-auth-feature-desc">Quick Google One-Tap or Mobile OTP verification in seconds</Typography>
                </Box>
              </Box>
            </Box>

            <Box className="comp-auth-modal-actions">
              <Button
                variant="contained"
                className="comp-auth-btn-primary"
                fullWidth
                onClick={() => {
                  setAuthPromptOpen(false);
                  if (typeof openLoginModal === "function") {
                    openLoginModal();
                  } else {
                    navigate("/login");
                  }
                }}
              >
                ✨ Sign In / Join Free
              </Button>
              <Button
                variant="outlined"
                className="comp-auth-btn-secondary"
                fullWidth
                onClick={() => {
                  setAuthPromptOpen(false);
                  navigate("/login");
                }}
              >
                Go to Sign In Page →
              </Button>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
