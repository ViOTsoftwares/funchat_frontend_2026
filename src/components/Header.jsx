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

const NAV_LINKS = [
  {
    label: "Home",
    path: "/",
    Icon: HomeOutlinedIcon,
  },
  {
    label: "Chat",
    path: "/chat",
    Icon: ChatBubbleOutlineIcon,
  },
  {
    label: "Video",
    path: "/video",
    Icon: VideocamOutlinedIcon,
  },
];

export default function Header({ status = "Online" }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
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
        position="sticky"
        elevation={0}
        sx={{
          backdropFilter: "blur(20px)",
          background: "rgba(15,23,42,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <Container maxWidth="xl">
          <Toolbar
            disableGutters
            sx={{
              minHeight: 74,
              justifyContent: "space-between",
            }}
          >
            {/* LOGO */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              sx={{ cursor: "pointer" }}
              onClick={() => navigate("/")}
            >
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: "14px",
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
                <BoltIcon />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: "1.1rem",
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
              {NAV_LINKS.map(({ label, path, Icon }) => {
                const active = location.pathname === path;

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

                      "&:hover": {
                        background:
                          "rgba(255,255,255,.08)",
                      },
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </Stack>

            {/* STATUS + MOBILE MENU */}
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
            >
              {/* Editable Name Field in Header */}
              <Box
                sx={{
                  display: { xs: "none", sm: "flex" },
                  alignItems: "center",
                  background: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  px: 1.5,
                  py: 0.5,
                  border: "1px solid rgba(255, 255, 255, 0.12)"
                }}
              >
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.6)", mr: 1, fontWeight: 600 }}>
                  Profile Name:
                </Typography>
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
                    fontSize: "12px",
                    width: "90px",
                    textAlign: "left"
                  }}
                />
              </Box>

              <Tooltip title={`Server Status: ${status}`}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isOnline
                        ? "#22c55e"
                        : "#ef4444",

                      boxShadow: isOnline
                        ? "0 0 12px #22c55e"
                        : "0 0 12px #ef4444",
                    }}
                  />

                  <Typography
                    variant="caption"
                    sx={{
                      color: "#fff",
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
                sx={{
                  color: "#fff",
                  display: {
                    xs: "flex",
                    md: "none",
                  },
                }}
              >
                <MenuIcon />
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

          <List>
            {NAV_LINKS.map(
              ({ label, path, Icon }) => {
                const active =
                  location.pathname === path;

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