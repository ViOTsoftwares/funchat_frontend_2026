import { AppBar, Box, Button, Chip, Container, IconButton, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import { useLocation, useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home",  path: "/",      Icon: HomeOutlinedIcon },
  { label: "Chat",  path: "/chat",  Icon: ChatBubbleOutlineIcon },
  { label: "Video", path: "/video", Icon: VideocamOutlinedIcon },
];

export default function Header({ status }) {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnline = status && status.toLowerCase().includes("online");

  return (
    <AppBar position="sticky" elevation={0} className="app-header-bar">
      <Container maxWidth="lg">
        <Toolbar disableGutters className="app-header-toolbar">
          {/* Brand */}
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.2}
            sx={{ flexGrow: 1, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <Box className="brand-dot">
              <BoltIcon fontSize="small" />
            </Box>
            <Stack spacing={0}>
              <Typography variant="h6" className="brand-name">FunChat</Typography>
              <Typography variant="caption" className="brand-sub">Private · Secure · Live</Typography>
            </Stack>
          </Stack>

          {/* Nav links */}
          <Stack direction="row" spacing={0.5} alignItems="center" className="header-nav">
            {NAV_LINKS.map(({ label, path, Icon }) => {
              const active = location.pathname === path;
              return (
                <Button
                  key={path}
                  id={`nav-${label.toLowerCase()}`}
                  startIcon={<Icon sx={{ fontSize: "16px !important" }} />}
                  onClick={() => navigate(path)}
                  className={active ? "nav-btn nav-btn-active" : "nav-btn"}
                  size="small"
                >
                  {label}
                </Button>
              );
            })}
          </Stack>

          {/* Status + CTA */}
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ ml: 2 }}>
            <Tooltip title={`Server: ${status}`} arrow>
              <Box className={`status-dot-wrap ${isOnline ? "status-online" : "status-offline"}`}>
                <Box className="status-pulse" />
                <Typography variant="caption" className="status-label">
                  {isOnline ? "Online" : status}
                </Typography>
              </Box>
            </Tooltip>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
