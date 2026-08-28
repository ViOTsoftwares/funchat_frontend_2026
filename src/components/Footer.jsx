import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Grid,
  Stack,
  Typography,
  IconButton,
  Button,
  Divider,
  Chip,
  Tooltip,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import SecurityIcon from "@mui/icons-material/Security";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import LanguageIcon from "@mui/icons-material/Language";
import SendIcon from "@mui/icons-material/Send";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SpeedIcon from "@mui/icons-material/Speed";
import GitHubIcon from "@mui/icons-material/GitHub";
import TwitterIcon from "@mui/icons-material/Twitter";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import TelegramIcon from "@mui/icons-material/Telegram";
import RedditIcon from "@mui/icons-material/Reddit";
import FacebookIcon from "@mui/icons-material/Facebook";
import InstagramIcon from "@mui/icons-material/Instagram";
import PhoneIcon from "@mui/icons-material/Phone";
import EmailIcon from "@mui/icons-material/Email";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import { ENV } from "../config/env.js";
import { GetCMSApi, GetSettingApi } from "../Api.js";

const DEFAULT_CMS_LINKS = [
  { identifier: "privacy-policy", title: "Privacy Policy" },
  { identifier: "terms-of-service", title: "Terms of Service" },
  { identifier: "community-guidelines", title: "Community Guidelines" },
  { identifier: "safety-center", title: "Safety & Security" },
  { identifier: "about-us", title: "About FunChat" },
  { identifier: "cookie-policy", title: "Cookie Policy" },
];

export default function Footer() {
  const navigate = useNavigate();
  const [cmsPages, setCmsPages] = useState(DEFAULT_CMS_LINKS);
  const [settings, setSettings] = useState(null);
  const [emailInput, setEmailInput] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    GetCMSApi()
      .then((data) => {
        if (data?.success && Array.isArray(data.result) && data.result.length > 0) {
          setCmsPages(data.result);
        }
      })
      .catch((err) => console.warn("Could not load dynamic CMS pages in footer:", err));

    GetSettingApi()
      .then((data) => {
        if (data?.success && data.result) {
          setSettings(data.result);
        }
      })
      .catch((err) => console.warn("Could not load public settings in footer:", err));
  }, []);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmailInput("");
    }, 1000);
  };

  // Group CMS pages dynamically
  const legalIdentifiers = ["privacy-policy", "terms-of-service", "cookie-policy", "safety-center", "community-guidelines"];
  const legalPages = cmsPages.filter((p) => legalIdentifiers.includes(p.identifier));
  const companyPages = cmsPages.filter((p) => !legalIdentifiers.includes(p.identifier));

  // Dynamic social links from Settings with fallback
  const configuredSocials = [
    settings?.xlink && {
      icon: <TwitterIcon fontSize="small" />,
      label: "X / Twitter",
      href: settings.xlink,
    },
    settings?.facebooklink && {
      icon: <FacebookIcon fontSize="small" />,
      label: "Facebook",
      href: settings.facebooklink,
    },
    settings?.instagramlink && {
      icon: <InstagramIcon fontSize="small" />,
      label: "Instagram",
      href: settings.instagramlink,
    },
    settings?.linkedinlink && {
      icon: <LinkedInIcon fontSize="small" />,
      label: "LinkedIn",
      href: settings.linkedinlink,
    },
  ].filter(Boolean);

  const socialLinks =
    configuredSocials.length > 0
      ? configuredSocials
      : [
          { icon: <TwitterIcon fontSize="small" />, label: "X / Twitter", href: "https://twitter.com" },
          { icon: <GitHubIcon fontSize="small" />, label: "GitHub", href: "https://github.com" },
          { icon: <LinkedInIcon fontSize="small" />, label: "LinkedIn", href: "https://linkedin.com" },
          { icon: <TelegramIcon fontSize="small" />, label: "Telegram", href: "https://telegram.org" },
          { icon: <RedditIcon fontSize="small" />, label: "Reddit", href: "https://reddit.com" },
        ];

  return (
    <Box
      component="footer"
      sx={{
        position: "relative",
        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, #090d16 100%)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        color: "#fff",
        pt: { xs: 6, md: 9 },
        pb: { xs: 4, md: 6 },
        mt: 8,
        overflow: "hidden",
      }}
    >
      {/* Background ambient lighting */}
      <Box
        sx={{
          position: "absolute",
          top: "-120px",
          left: "20%",
          width: "480px",
          height: "240px",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />
      <Box
        sx={{
          position: "absolute",
          top: "-80px",
          right: "15%",
          width: "400px",
          height: "200px",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.12) 0%, rgba(236, 72, 153, 0) 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2 }}>
        {/* ── TOP SECTION: Main Grid ── */}
        <Grid container spacing={{ xs: 4, md: 5 }} sx={{ mb: { xs: 5, md: 7 } }}>
          {/* Brand & Mission Column */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2.5}>
              {/* Logo */}
              <Stack
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{ cursor: "pointer" }}
                onClick={() => navigate("/")}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                    color: "#fff",
                    boxShadow: "0 8px 20px rgba(99, 102, 241, 0.4)",
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
                    <BoltIcon sx={{ fontSize: 24 }} />
                  )}
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, color: "#fff", letterSpacing: "-0.5px" }}>
                    {settings?.title || "FunChat Connect"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "11px" }}>
                    {settings?.project ? `${settings.project} · Private & Secure` : "Private · Secure · Real-Time"}
                  </Typography>
                </Box>
              </Stack>

              {/* Tagline */}
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(255, 255, 255, 0.68)",
                  lineHeight: 1.65,
                  fontSize: "13.5px",
                  pr: { md: 2 },
                }}
              >
                Next-generation anonymous social connection platform designed with privacy, zero-latency WebRTC streams, and vibrant community channels.
              </Typography>

              {/* Server Status Pill */}
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: "6px 14px",
                  borderRadius: "20px",
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.2)",
                  width: "fit-content",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#22c55e",
                    boxShadow: "0 0 8px #22c55e",
                  }}
                />
                <Typography sx={{ color: "#86efac", fontSize: "12px", fontWeight: 700 }}>
                  All Systems Live & Operational
                </Typography>
              </Box>

              {/* Contact Details from Settings */}
              {(settings?.email || settings?.phone || settings?.address) && (
                <Stack spacing={1} sx={{ pt: 1 }}>
                  {settings.email && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <EmailIcon sx={{ fontSize: 16, color: "#818cf8" }} />
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "12.5px" }}>
                        {settings.email}
                      </Typography>
                    </Stack>
                  )}
                  {settings.phone && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <PhoneIcon sx={{ fontSize: 16, color: "#818cf8" }} />
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "12.5px" }}>
                        {settings.phone}
                      </Typography>
                    </Stack>
                  )}
                  {settings.address && (
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <LocationOnIcon sx={{ fontSize: 16, color: "#818cf8", mt: 0.2 }} />
                      <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.75)", fontSize: "12px", lineHeight: 1.4 }}>
                        {settings.address}
                      </Typography>
                    </Stack>
                  )}
                </Stack>
              )}

              {/* Social Icons */}
              <Stack direction="row" spacing={1} sx={{ pt: 0.5, flexWrap: "wrap", gap: 1 }}>
                {socialLinks.map((social, idx) => (
                  <Tooltip key={idx} title={social.label} arrow>
                    <IconButton
                      component="a"
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      sx={{
                        color: "rgba(255, 255, 255, 0.7)",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "10px",
                        p: 1,
                        "&:hover": {
                          background: "rgba(99, 102, 241, 0.2)",
                          color: "#818cf8",
                          borderColor: "rgba(99, 102, 241, 0.4)",
                          transform: "translateY(-2px)",
                        },
                        transition: "all 0.2s ease",
                      }}
                    >
                      {social.icon}
                    </IconButton>
                  </Tooltip>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* Navigation Column: Platforms & Features */}
          <Grid item xs={6} sm={4} md={2.5}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "#fff",
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                mb: 2.5,
              }}
            >
              Platform
            </Typography>
            <Stack spacing={1.5}>
              {[
                { label: "Anonymous Text Chat", path: "/chat" },
                { label: "HD Video Rooms", path: "/video" },
                { label: "Community Channels", path: "/community" },
                { label: "Instant Matchmaking", path: "/" },
                { label: "Profile & Identity", path: "/" },
              ].map((link, idx) => (
                <Typography
                  key={idx}
                  onClick={() => navigate(link.path)}
                  sx={{
                    color: "rgba(255, 255, 255, 0.65)",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      color: "#818cf8",
                      transform: "translateX(3px)",
                    },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Stack>
          </Grid>

          {/* Navigation Column: Legal & Privacy (Dynamic CMS) */}
          <Grid item xs={6} sm={4} md={2.5}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "#fff",
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                mb: 2.5,
              }}
            >
              Legal & Safety
            </Typography>
            <Stack spacing={1.5}>
              {legalPages.length > 0 ? (
                legalPages.map((page) => (
                  <Typography
                    key={page.identifier}
                    onClick={() => navigate(`/page/${page.identifier}`)}
                    sx={{
                      color: "rgba(255, 255, 255, 0.65)",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        color: "#818cf8",
                        transform: "translateX(3px)",
                      },
                    }}
                  >
                    {page.title}
                  </Typography>
                ))
              ) : (
                DEFAULT_CMS_LINKS.slice(0, 4).map((page) => (
                  <Typography
                    key={page.identifier}
                    onClick={() => navigate(`/page/${page.identifier}`)}
                    sx={{
                      color: "rgba(255, 255, 255, 0.65)",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      cursor: "pointer",
                      "&:hover": { color: "#818cf8" },
                    }}
                  >
                    {page.title}
                  </Typography>
                ))
              )}
            </Stack>
          </Grid>

          {/* Navigation Column: Company & Newsletter */}
          <Grid item xs={12} sm={4} md={3}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: "#fff",
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                mb: 2.5,
              }}
            >
              Company & Docs
            </Typography>

            {/* Dynamic Company CMS Links */}
            <Stack spacing={1.5} sx={{ mb: 3 }}>
              {companyPages.length > 0 ? (
                companyPages.map((page) => (
                  <Typography
                    key={page.identifier}
                    onClick={() => navigate(`/page/${page.identifier}`)}
                    sx={{
                      color: "rgba(255, 255, 255, 0.65)",
                      fontSize: "13.5px",
                      fontWeight: 500,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        color: "#818cf8",
                        transform: "translateX(3px)",
                      },
                    }}
                  >
                    {page.title}
                  </Typography>
                ))
              ) : (
                <Typography
                  onClick={() => navigate("/page/about-us")}
                  sx={{
                    color: "rgba(255, 255, 255, 0.65)",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    cursor: "pointer",
                    "&:hover": { color: "#818cf8" },
                  }}
                >
                  About FunChat
                </Typography>
              )}
            </Stack>

            {/* Newsletter Pill Input */}
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", display: "block", mb: 1 }}>
              Stay informed on new features:
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubscribe}
              sx={{
                display: "flex",
                alignItems: "center",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: "14px",
                p: "4px 6px",
                transition: "all 0.2s ease",
                "&:focus-within": {
                  borderColor: "#818cf8",
                  background: "rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 0 16px rgba(99, 102, 241, 0.2)",
                },
              }}
            >
              <Box
                component="input"
                type="email"
                required
                placeholder={subscribed ? "✓ You're subscribed!" : "Enter email..."}
                disabled={subscribed}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                sx={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "#fff",
                  fontSize: "13px",
                  px: 1.5,
                  width: "100%",
                  "&::placeholder": {
                    color: subscribed ? "#86efac" : "rgba(255, 255, 255, 0.4)",
                  },
                }}
              />
              <IconButton
                type="submit"
                size="small"
                disabled={subscribed}
                sx={{
                  background: subscribed
                    ? "rgba(34, 197, 94, 0.2)"
                    : "linear-gradient(135deg, #6366f1, #3b82f6)",
                  color: "#fff",
                  borderRadius: "10px",
                  p: 0.8,
                  "&:hover": {
                    background: "linear-gradient(135deg, #4f46e5, #2563eb)",
                  },
                }}
              >
                {subscribed ? <CheckCircleIcon sx={{ fontSize: 16, color: "#86efac" }} /> : <SendIcon sx={{ fontSize: 15 }} />}
              </IconButton>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.08)", mb: 4 }} />

        {/* ── BOTTOM BAR: Security Pills + Copyright ── */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          justifyContent="space-between"
          alignItems={{ xs: "center", sm: "center" }}
          sx={{
            textAlign: { xs: "center", sm: "left" },
          }}
        >
          {/* Security & Reliability Badges */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" justifyContent="center">
            <Chip
              icon={<LockOutlinedIcon sx={{ fontSize: "14px !important", color: "#a5b4fc !important" }} />}
              label="256-Bit Encrypted"
              size="small"
              sx={{
                background: "rgba(99, 102, 241, 0.1)",
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
            <Chip
              icon={<ShieldOutlinedIcon sx={{ fontSize: "14px !important", color: "#86efac !important" }} />}
              label="Zero Log Policy"
              size="small"
              sx={{
                background: "rgba(34, 197, 94, 0.1)",
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
            <Chip
              icon={<SpeedIcon sx={{ fontSize: "14px !important", color: "#fde047 !important" }} />}
              label="WebRTC Ultra HD"
              size="small"
              sx={{
                background: "rgba(245, 158, 11, 0.1)",
                color: "rgba(255, 255, 255, 0.75)",
                fontSize: "11px",
                fontWeight: 600,
                borderRadius: "8px",
              }}
            />
          </Stack>

          {/* Copyright & Region */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "12px" }}>
              © {new Date().getFullYear()} {settings?.title || "FunChat Connect Inc."}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.3)" }}>•</Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: "rgba(255, 255, 255, 0.5)" }}>
              <LanguageIcon sx={{ fontSize: 13 }} />
              <Typography variant="caption" sx={{ fontSize: "11px", fontWeight: 600 }}>
                Global (EN)
              </Typography>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
