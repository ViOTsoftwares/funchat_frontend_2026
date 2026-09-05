import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  Divider,
  Menu,
  MenuItem,
  Avatar,
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import BoltIcon from "@mui/icons-material/Bolt";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import GroupsIcon from "@mui/icons-material/Groups";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";

import { useAuth } from "../context/AuthContext.jsx";
import { GetSettingApi } from "../Api.js";
import { ENV } from "../config/env.js";

const NAV_LINKS = [
  {
    label: "Home",
    path: "/",
    Icon: HomeOutlinedIcon,
    featureKey: null,
  },
  {
    label: "Chat",
    path: "/chat",
    Icon: ChatBubbleOutlineIcon,
    featureKey: "chat",
  },
  {
    label: "Video",
    path: "/video",
    Icon: VideocamOutlinedIcon,
    featureKey: "video",
  },
  {
    label: "Community",
    path: "/community",
    Icon: GroupsIcon,
    featureKey: "community",
  },
  {
    label: "Games",
    path: "/game",
    Icon: SportsEsportsIcon,
    featureKey: null,
  },
];

export default function Header({ status = "Online", featureControl = {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout, openLoginModal } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const [settings, setSettings] = useState(null);
  const [profileName, setProfileName] = useState(
    user?.username || localStorage.getItem("funchat_profile_name") || "Stranger"
  );

  useEffect(() => {
    GetSettingApi()
      .then((res) => {
        if (res?.success && res?.result) {
          setSettings(res.result);
        }
      })
      .catch((err) => console.warn("Could not load header settings:", err));
  }, []);

  useEffect(() => {
    if (user?.username) {
      setProfileName(user.username);
    } else {
      setProfileName(localStorage.getItem("funchat_profile_name") || "Stranger");
    }
  }, [user]);

  useEffect(() => {
    const handleNameChange = () => {
      setProfileName(localStorage.getItem("funchat_profile_name") || "Stranger");
    };
    window.addEventListener("profileNameChanged", handleNameChange);
    return () => window.removeEventListener("profileNameChanged", handleNameChange);
  }, []);

  const isOnline = status?.toLowerCase().includes("online");

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleOpenUserMenu = (e) => {
    setUserMenuAnchor(e.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    handleCloseUserMenu();
    logout();
    setProfileName("Stranger");
    setMobileOpen(false);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backdropFilter: "blur(24px)",
          background: "rgba(15, 23, 42, 0.8)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: { xs: "14px", sm: "18px", md: "24px" },
          zIndex: 1100,
          top: { xs: "8px", sm: "10px", md: "16px" },
          left: { xs: "8px", sm: "10px", md: "20px" },
          right: { xs: "8px", sm: "10px", md: "20px" },
          width: { xs: "calc(100% - 16px)", sm: "calc(100% - 20px)", md: "calc(100% - 40px)" },
          mx: "auto",
          boxShadow: "0 8px 32px rgba(15, 23, 42, 0.15), 0 4px 12px rgba(99, 102, 241, 0.05)",
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 1, sm: 2, md: 3 } }}>
          <Toolbar
            disableGutters
            sx={{
              minHeight: { xs: 52, sm: 60, md: 74 },
              height: { xs: 52, sm: 60, md: 74 },
              justifyContent: "space-between",
            }}
          >
            {/* LOGO */}
            <Stack
              direction="row"
              spacing={{ xs: 1, sm: 1.5 }}
              alignItems="center"
              sx={{ cursor: "pointer", flexShrink: 0 }}
              onClick={() => navigate("/")}
            >
              <Box
                sx={{
                  width: { xs: 32, sm: 36, md: 42 },
                  height: { xs: 32, sm: 36, md: 42 },
                  borderRadius: { xs: "10px", sm: "12px", md: "14px" },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg,#6366f1,#3b82f6)",
                  color: "#fff",
                  boxShadow:
                    "0 10px 25px rgba(99,102,241,.35)",
                  overflow: "hidden",
                }}
              >
                {settings?.logo ? (
                  <Box
                    component="img"
                    src={`${ENV.IMAGE_URL}/logos/${settings.logo}`}
                    alt="Logo"
                    sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <BoltIcon sx={{ fontSize: { xs: 18, sm: 20, md: 24 } }} />
                )}
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "0.95rem", sm: "1.05rem", md: "1.15rem" },
                    lineHeight: 1,
                    color: "#fff",
                  }}
                >
                  {settings?.title || "FunChat"}
                </Typography>

                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,.65)",
                    fontSize: "11px",
                    display: {
                      xs: "none",
                      sm: "block",
                    },
                  }}
                >
                  {settings?.project ? `${settings.project}` : "Private · Secure · Live"}
                </Typography>
              </Box>
            </Stack>

            {/* DESKTOP NAVIGATION */}
            <Stack
              direction="row"
              spacing={1}
              sx={{
                display: {
                  xs: "none",
                  md: "flex",
                },
              }}
            >
              {NAV_LINKS.map(({ label, path, Icon, featureKey }) => {
                const active = location.pathname === path;
                const fStatus = featureKey ? (featureControl[featureKey] ?? "live") : "live";
                const isComingSoon = fStatus === "coming_soon";
                const isMaintenance = fStatus === "maintenance";

                return (
                  <Button
                    key={path}
                    startIcon={<Icon />}
                    onClick={() => navigate(path)}
                    sx={{
                      px: 2,
                      py: 1,
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: 600,
                      color: active
                        ? "#818cf8"
                        : "rgba(255,255,255,.85)",
                      background: active
                        ? "rgba(99,102,241,.15)"
                        : "transparent",
                      position: "relative",
                      "&:hover": {
                        background:
                          "rgba(255,255,255,.08)",
                      },
                    }}
                  >
                    <span>{label}</span>
                    {isComingSoon && (
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          fontSize: "10px",
                          fontWeight: 700,
                          px: 0.8,
                          py: 0.2,
                          borderRadius: "6px",
                          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(236, 72, 153, 0.4))",
                          color: "#f5d0fe",
                          border: "1px solid rgba(236, 72, 153, 0.4)",
                          letterSpacing: "0.5px",
                        }}
                      >
                        SOON
                      </Box>
                    )}
                    {isMaintenance && (
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          fontSize: "10px",
                          fontWeight: 700,
                          px: 0.8,
                          py: 0.2,
                          borderRadius: "6px",
                          background: "rgba(245, 158, 11, 0.3)",
                          color: "#fde047",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          letterSpacing: "0.5px",
                        }}
                      >
                        MAINT
                      </Box>
                    )}
                  </Button>
                );
              })}
            </Stack>

            {/* RIGHT SIDE ACTIONS: Profile / Auth + Status + Mobile Menu */}
            <Stack
              direction="row"
              spacing={{ xs: 0.75, sm: 1.25, md: 1.5 }}
              alignItems="center"
              sx={{ flexShrink: 0 }}
            >
              {/* Header Handle Display: Read-Only for guests, Editable/Linkable for logged-in users */}
              <Box
                onClick={() => {
                  if (isAuthenticated) {
                    navigate("/profile");
                  } else {
                    window.dispatchEvent(new Event("openProfileWelcomeModal"));
                  }
                }}
                sx={{
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.06)",
                  borderRadius: { xs: "10px", sm: "12px" },
                  px: { xs: 0.75, sm: 1.25, md: 1.5 },
                  py: { xs: 0.35, sm: 0.5, md: 0.75 },
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    background: "rgba(255, 255, 255, 0.1)",
                    borderColor: "rgba(99, 102, 241, 0.4)",
                    boxShadow: "0 0 12px rgba(99, 102, 241, 0.15)"
                  }
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "rgba(255,255,255,0.55)",
                    mr: 0.75,
                    fontWeight: 600,
                    fontSize: "11px",
                  }}
                >
                  Handle:
                </Typography>

                <Typography
                  sx={{
                    color: "#a5b4fc",
                    fontWeight: 700,
                    fontSize: { xs: "12.5px", sm: "14px", md: "15px" },
                  }}
                >
                  @{profileName}
                </Typography>
              </Box>

              {/* AUTH BUTTON / USER PILL */}
              {isAuthenticated ? (
                <>
                  <Button
                    onClick={handleOpenUserMenu}
                    endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      background: "rgba(99, 102, 241, 0.12)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      borderRadius: { xs: "10px", sm: "12px" },
                      px: { xs: 1, sm: 1.5 },
                      py: { xs: 0.4, sm: 0.6 },
                      color: "#fff",
                      textTransform: "none",
                      "&:hover": {
                        background: "rgba(99, 102, 241, 0.22)",
                        borderColor: "rgba(99, 102, 241, 0.5)",
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: { xs: 22, sm: 26 },
                        height: { xs: 22, sm: 26 },
                        background: "linear-gradient(135deg, #6366f1, #ec4899)",
                        fontSize: "12px",
                        fontWeight: 800,
                      }}
                    >
                      {user?.username ? user.username.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}
                    </Avatar>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "12px", sm: "13.5px" },
                        maxWidth: { xs: "70px", sm: "100px", md: "120px" },
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        color: "#fff",
                      }}
                    >
                      {user?.username || profileName}
                    </Typography>
                  </Button>

                  {/* USER MENU DROPDOWN */}
                  <Menu
                    anchorEl={userMenuAnchor}
                    open={Boolean(userMenuAnchor)}
                    onClose={handleCloseUserMenu}
                    anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                    transformOrigin={{ vertical: "top", horizontal: "right" }}
                    PaperProps={{
                      sx: {
                        mt: 1.5,
                        background: "rgba(17, 24, 39, 0.98)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(99, 102, 241, 0.25)",
                        borderRadius: "16px",
                        boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
                        color: "#fff",
                        minWidth: "220px",
                        p: 1,
                      },
                    }}
                  >
                    <Box sx={{ px: 2, py: 1.5, borderBottom: "1px solid rgba(255,255,255,0.08)", mb: 0.5 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
                        <CheckCircleIcon sx={{ fontSize: 14, color: "#86efac" }} />
                        <Typography variant="caption" sx={{ color: "#86efac", fontWeight: 700, fontSize: "11px" }}>
                          Verified Member
                        </Typography>
                      </Stack>
                      <Typography sx={{ fontWeight: 800, fontSize: "14px", color: "#fff" }}>
                        {user?.username || profileName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", fontSize: "11.5px", display: "block" }}>
                        {user?.email}
                      </Typography>
                    </Box>

                    <MenuItem
                      onClick={() => {
                        handleCloseUserMenu();
                        navigate("/profile");
                      }}
                      sx={{
                        borderRadius: "10px",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 600,
                        gap: 1.5,
                        mb: 0.5,
                        "&:hover": {
                          background: "rgba(99, 102, 241, 0.15)",
                        },
                      }}
                    >
                      <PersonOutlineIcon sx={{ fontSize: 18, color: "#818cf8" }} />
                      My Profile Settings
                    </MenuItem>

                    <MenuItem
                      onClick={handleLogout}
                      sx={{
                        borderRadius: "10px",
                        color: "#f87171",
                        fontSize: "13px",
                        fontWeight: 600,
                        gap: 1.5,
                        "&:hover": {
                          background: "rgba(239, 68, 68, 0.12)",
                        },
                      }}
                    >
                      <LogoutIcon sx={{ fontSize: 18 }} />
                      Sign Out
                    </MenuItem>
                  </Menu>
                </>
              ) : (
                <Button
                  startIcon={<PersonOutlineIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />}
                  onClick={openLoginModal}
                  sx={{
                    background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: { xs: "12px", sm: "13px" },
                    textTransform: "none",
                    borderRadius: { xs: "10px", sm: "12px" },
                    px: { xs: 1.5, sm: 2 },
                    py: { xs: 0.45, sm: 0.65 },
                    boxShadow: "0 4px 15px rgba(99, 102, 241, 0.35)",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      background: "linear-gradient(135deg, #4f46e5 0%, #2563eb 100%)",
                      transform: "translateY(-1px)",
                      boxShadow: "0 6px 20px rgba(99, 102, 241, 0.45)",
                    },
                  }}
                >
                  Sign In
                </Button>
              )}

              <Tooltip title={`Server Status: ${status}`}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ cursor: "default" }}
                >
                  <Box
                    sx={{
                      width: { xs: 8, sm: 10 },
                      height: { xs: 8, sm: 10 },
                      borderRadius: "50%",
                      background: isOnline
                        ? "#22c55e"
                        : "#ef4444",

                      boxShadow: isOnline
                        ? "0 0 10px #22c55e"
                        : "0 0 10px #ef4444",
                    }}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      color: "#fff",
                      fontSize: "12px",
                      display: {
                        xs: "none",
                        sm: "block",
                      },
                    }}
                  >
                    {isOnline ? "Online" : status}
                  </Typography>
                </Stack>
              </Tooltip>

              {/* MOBILE MENU BUTTON */}
              <IconButton
                onClick={() =>
                  setMobileOpen(true)
                }
                size="small"
                sx={{
                  color: "#fff",
                  p: { xs: 0.5, sm: 0.75 },
                  display: {
                    xs: "flex",
                    md: "none",
                  },
                }}
              >
                <MenuIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
              </IconButton>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      {/* MOBILE DRAWER */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() =>
          setMobileOpen(false)
        }
        PaperProps={{
          sx: {
            width: 280,
            background:
              "linear-gradient(180deg,#0f172a,#111827)",
            color: "#fff",
          },
        }}
      >
        <Box p={2}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography
              variant="h6"
              fontWeight={700}
            >
              FunChat
            </Typography>

            <IconButton
              onClick={() =>
                setMobileOpen(false)
              }
              sx={{ color: "#fff" }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>

          <Divider
            sx={{
              my: 2,
              borderColor:
                "rgba(255,255,255,.1)",
            }}
          />

          {/* Mobile Auth Card / Button */}
          {isAuthenticated ? (
            <Box
              sx={{
                mb: 2.5,
                p: 2,
                borderRadius: "16px",
                background: "rgba(99, 102, 241, 0.1)",
                border: "1px solid rgba(99, 102, 241, 0.25)",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    background: "linear-gradient(135deg, #6366f1, #ec4899)",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                >
                  {user?.username ? user.username.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || "U"}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: "14px", color: "#fff" }} noWrap>
                    {user?.username || profileName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.55)", fontSize: "11px" }} noWrap display="block">
                    {user?.email}
                  </Typography>
                </Box>
              </Stack>
              <Button
                fullWidth
                size="small"
                variant="outlined"
                startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                onClick={handleLogout}
                sx={{
                  color: "#f87171",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  borderRadius: "10px",
                  textTransform: "none",
                  fontSize: "12px",
                  fontWeight: 600,
                  "&:hover": {
                    background: "rgba(239, 68, 68, 0.1)",
                    borderColor: "#ef4444",
                  },
                }}
              >
                Sign Out
              </Button>
            </Box>
          ) : (
            <Button
              fullWidth
              startIcon={<PersonOutlineIcon />}
              onClick={() => {
                setMobileOpen(false);
                openLoginModal();
              }}
              sx={{
                mb: 2.5,
                py: 1.2,
                borderRadius: "14px",
                background: "linear-gradient(135deg, #6366f1 0%, #3b82f6 100%)",
                color: "#fff",
                fontWeight: 700,
                fontSize: "13.5px",
                textTransform: "none",
                boxShadow: "0 6px 20px rgba(99, 102, 241, 0.35)",
              }}
            >
              Sign In with Email
            </Button>
          )}

          {/* Mobile Profile Handle Display Box */}
          <Box
            onClick={() => {
              setMobileOpen(false);
              if (isAuthenticated) {
                navigate("/profile");
              } else {
                window.dispatchEvent(new Event("openProfileWelcomeModal"));
              }
            }}
            sx={{
              mb: 2.5,
              p: 1.8,
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "rgba(255, 255, 255, 0.08)",
                borderColor: "rgba(99, 102, 241, 0.4)",
              },
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <Box
                sx={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                <Typography sx={{ fontSize: "8px", fontWeight: 800 }}>U</Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: "0.5px" }}>
                RESERVED HANDLE
              </Typography>
            </Stack>

            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography sx={{ fontWeight: 800, color: "#818cf8", fontSize: "15px" }}>
                @{profileName}
              </Typography>
            </Stack>
          </Box>

          <List>
            {NAV_LINKS.map(
              ({ label, path, Icon, featureKey }) => {
                const active =
                  location.pathname === path;
                const fStatus = featureKey ? (featureControl[featureKey] ?? "live") : "live";
                const isComingSoon = fStatus === "coming_soon";
                const isMaintenance = fStatus === "maintenance";

                return (
                  <ListItemButton
                    key={path}
                    onClick={() =>
                      handleNavigate(path)
                    }
                    sx={{
                      mb: 1,
                      borderRadius: "12px",

                      background: active
                        ? "rgba(99,102,241,.15)"
                        : "transparent",

                      "&:hover": {
                        background:
                          "rgba(255,255,255,.08)",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        color: active
                          ? "#818cf8"
                          : "#fff",
                        minWidth: 40,
                      }}
                    >
                      <Icon />
                    </ListItemIcon>

                    <ListItemText
                      primary={label}
                    />

                    {isComingSoon && (
                      <Box
                        sx={{
                          fontSize: "10px",
                          fontWeight: 700,
                          px: 1,
                          py: 0.3,
                          borderRadius: "6px",
                          background: "linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(236, 72, 153, 0.4))",
                          color: "#f5d0fe",
                          border: "1px solid rgba(236, 72, 153, 0.4)",
                          letterSpacing: "0.5px",
                        }}
                      >
                        SOON
                      </Box>
                    )}

                    {isMaintenance && (
                      <Box
                        sx={{
                          fontSize: "10px",
                          fontWeight: 700,
                          px: 1,
                          py: 0.3,
                          borderRadius: "6px",
                          background: "rgba(245, 158, 11, 0.3)",
                          color: "#fde047",
                          border: "1px solid rgba(245, 158, 11, 0.4)",
                          letterSpacing: "0.5px",
                        }}
                      >
                        MAINT
                      </Box>
                    )}
                  </ListItemButton>
                );
              }
            )}
          </List>

          <Divider
            sx={{
              my: 2,
              borderColor:
                "rgba(255,255,255,.1)",
            }}
          />

          <Box
            sx={{
              p: 2,
              borderRadius: "14px",
              background:
                "rgba(255,255,255,.05)",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color:
                  "rgba(255,255,255,.65)",
              }}
            >
              Server Status
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              mt={1}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: isOnline
                    ? "#22c55e"
                    : "#ef4444",
                }}
              />

              <Typography>
                {isOnline
                  ? "Online"
                  : status}
              </Typography>
            </Stack>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}