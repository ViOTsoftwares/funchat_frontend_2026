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
} from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import BoltIcon from "@mui/icons-material/Bolt";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import EditIcon from "@mui/icons-material/Edit";
import GroupsIcon from "@mui/icons-material/Groups";

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
];

export default function Header({ status = "Online", featureControl = {} }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileName, setProfileName] = useState(
    localStorage.getItem("funchat_profile_name") ?? "Stranger"
  );

  useEffect(() => {
    const handleNameChange = () => {
      setProfileName(localStorage.getItem("funchat_profile_name") ?? "Stranger");
    };
    window.addEventListener("profileNameChanged", handleNameChange);
    return () => window.removeEventListener("profileNameChanged", handleNameChange);
  }, []);

  const handleProfileNameChange = (val) => {
    setProfileName(val);
    localStorage.setItem("funchat_profile_name", val);
    window.dispatchEvent(new Event("profileNameChanged"));
  };

  const isOnline = status?.toLowerCase().includes("online");

  const handleNavigate = (path) => {
    navigate(path);
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
                }}
              >
                <BoltIcon sx={{ fontSize: { xs: 18, sm: 20, md: 24 } }} />
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
                  FunChat
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
                  Private · Secure · Live
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

            {/* STATUS + MOBILE MENU */}
            <Stack
              direction="row"
              spacing={{ xs: 0.75, sm: 1.25, md: 2 }}
              alignItems="center"
              sx={{ flexShrink: 0 }}
            >
              {/* Editable Name Field in Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.06)",
                  borderRadius: { xs: "10px", sm: "12px" },
                  px: { xs: 0.75, sm: 1.25, md: 1.5 },
                  py: { xs: 0.35, sm: 0.5, md: 0.75 },
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  transition: "all 0.2s ease",
                  "&:hover, &:focus-within": {
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
                    display: { xs: "none", sm: "block" }
                  }}
                >
                  Name:
                </Typography>
                <Box
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <Box
                    component="input"
                    type="text"
                    value={profileName}
                    onChange={(e) => handleProfileNameChange(e.target.value)}
                    sx={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: { xs: "12.5px", sm: "14px", md: "15px" },
                      width: { xs: "52px", sm: "70px", md: "90px" },
                      paddingRight: "16px",
                      textAlign: "left"
                    }}
                  />
                  <EditIcon
                    sx={{
                      position: "absolute",
                      right: 0,
                      color: "rgba(255, 255, 255, 0.55)",
                      fontSize: { xs: 11, sm: 13, md: 14 },
                      pointerEvents: "none"
                    }}
                  />
                </Box>
              </Box>

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

          {/* Mobile Profile Name Input */}
          <Box
            sx={{
              mb: 2.5,
              p: 2,
              borderRadius: "16px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
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
                MY DISPLAY NAME
              </Typography>
            </Stack>
            <Box
              sx={{
                position: "relative",
                display: "flex",
                alignItems: "center"
              }}
            >
              <Box
                component="input"
                type="text"
                value={profileName}
                onChange={(e) => handleProfileNameChange(e.target.value)}
                placeholder="Stranger"
                sx={{
                  width: "100%",
                  padding: "10px 36px 10px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  outline: "none",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#fff",
                  background: "rgba(15, 23, 42, 0.4)",
                  transition: "all 0.18s ease",
                  "&:focus": {
                    borderColor: "#818cf8",
                    background: "rgba(15, 23, 42, 0.75)",
                    boxShadow: "0 0 0 3px rgba(129, 140, 248, 0.15)"
                  }
                }}
              />
              <EditIcon
                sx={{
                  position: "absolute",
                  right: 12,
                  color: "#818cf8",
                  fontSize: 16,
                  pointerEvents: "none",
                  opacity: 0.8
                }}
              />
            </Box>
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