import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Stack,
  Typography,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Breadcrumbs,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SecurityIcon from "@mui/icons-material/Security";
import { ENV } from "../config/env.js";

export default function CMSPage() {
  const { identifier } = useParams();
  const navigate = useNavigate();

  const [pageData, setPageData] = useState(null);
  const [allPages, setAllPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Fetch all active pages for the sidebar
  useEffect(() => {
    fetch(`${ENV.API_URL}/api/public/cms`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.result)) {
          setAllPages(data.result);
        }
      })
      .catch((err) => console.warn("Could not load CMS sidebar list:", err));
  }, []);

  // Fetch the current page content
  useEffect(() => {
    if (!identifier) return;
    setLoading(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });

    fetch(`${ENV.API_URL}/api/public/cms/${identifier}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Page not found" : "Failed to load document");
        }
        return res.json();
      })
      .then((data) => {
        if (data?.success && data.result) {
          setPageData(data.result);
        } else {
          setError(data?.message || "Page not found");
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load content");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [identifier]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "Recently Updated";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "August 2026";
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        py: { xs: 3, md: 6 },
        position: "relative",
        zIndex: 5,
      }}
    >
      <Container maxWidth="lg">
        {/* Top Breadcrumbs */}
        <Box sx={{ mb: 3 }}>
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" sx={{ color: "rgba(255, 255, 255, 0.4)" }} />}
            aria-label="breadcrumb"
          >
            <Link
              to="/"
              style={{
                color: "rgba(255, 255, 255, 0.65)",
                textDecoration: "none",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              Home
            </Link>
            <Typography sx={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "14px" }}>
              Legal & Information
            </Typography>
            <Typography
              sx={{
                color: "#818cf8",
                fontWeight: 700,
                fontSize: "14px",
              }}
            >
              {pageData?.title || identifier}
            </Typography>
          </Breadcrumbs>
        </Box>

        {/* Layout Grid: Sidebar + Main Content */}
        <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems="flex-start">
          {/* ── Left Sidebar: Documents directory ── */}
          <Box
            sx={{
              width: { xs: "100%", md: "280px" },
              flexShrink: 0,
              position: { md: "sticky" },
              top: { md: "110px" },
            }}
          >
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: "20px",
                background: "linear-gradient(145deg, rgba(15, 23, 42, 0.75), rgba(30, 41, 59, 0.65))",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 12px 30px rgba(0, 0, 0, 0.2)",
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, px: 1 }}>
                <MenuBookIcon sx={{ fontSize: 18, color: "#818cf8" }} />
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: "12px",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Document Center
                </Typography>
              </Stack>

              <Stack spacing={0.5}>
                {allPages.length > 0 ? (
                  allPages.map((item) => {
                    const active = item.identifier === identifier;
                    return (
                      <Button
                        key={item.identifier}
                        onClick={() => navigate(`/page/${item.identifier}`)}
                        sx={{
                          justifyContent: "flex-start",
                          textAlign: "left",
                          px: 2,
                          py: 1,
                          borderRadius: "12px",
                          textTransform: "none",
                          fontSize: "13.5px",
                          fontWeight: active ? 700 : 500,
                          color: active ? "#818cf8" : "rgba(255, 255, 255, 0.75)",
                          background: active ? "rgba(99, 102, 241, 0.15)" : "transparent",
                          border: active
                            ? "1px solid rgba(99, 102, 241, 0.3)"
                            : "1px solid transparent",
                          "&:hover": {
                            background: "rgba(255, 255, 255, 0.06)",
                            color: "#fff",
                          },
                          transition: "all 0.2s ease",
                        }}
                      >
                        {item.title}
                      </Button>
                    );
                  })
                ) : (
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)", px: 1 }}>
                    Loading documents…
                  </Typography>
                )}
              </Stack>

              <Divider sx={{ my: 2.5, borderColor: "rgba(255, 255, 255, 0.08)" }} />

              {/* Help Box */}
              <Box
                sx={{
                  p: 2,
                  borderRadius: "14px",
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.18)",
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                  <HelpOutlineIcon sx={{ fontSize: 16, color: "#818cf8" }} />
                  <Typography variant="caption" sx={{ color: "#fff", fontWeight: 700 }}>
                    Need Assistance?
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.65)", display: "block", mb: 1.5, lineHeight: 1.4 }}>
                  Our moderation and support team is available 24/7.
                </Typography>
                <Button
                  size="small"
                  onClick={() => navigate("/")}
                  sx={{
                    width: "100%",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "none",
                    color: "#fff",
                    background: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    "&:hover": { background: "rgba(255, 255, 255, 0.18)" },
                  }}
                >
                  Return to Home
                </Button>
              </Box>
            </Paper>
          </Box>

          {/* ── Main Content Area ── */}
          <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>
            {loading ? (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  borderRadius: "24px",
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  backdropFilter: "blur(20px)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "400px",
                }}
              >
                <CircularProgress size={36} sx={{ color: "#818cf8", mb: 2 }} />
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.6)" }}>
                  Loading document…
                </Typography>
              </Paper>
            ) : error ? (
              <Paper
                elevation={0}
                sx={{
                  p: 6,
                  borderRadius: "24px",
                  background: "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  backdropFilter: "blur(20px)",
                  textAlign: "center",
                }}
              >
                <Typography variant="h5" sx={{ color: "#f87171", fontWeight: 700, mb: 1.5 }}>
                  Document Not Found
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.65)", mb: 3 }}>
                  The requested information page could not be located or may have been updated.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate("/")}
                  sx={{
                    background: "linear-gradient(135deg, #6366f1, #3b82f6)",
                    borderRadius: "12px",
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Return to Home
                </Button>
              </Paper>
            ) : (
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 5, md: 6 },
                  borderRadius: { xs: "20px", sm: "28px" },
                  background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.75))",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(28px)",
                  boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3), 0 0 30px rgba(99, 102, 241, 0.08)",
                  color: "#fff",
                }}
              >
                {/* Header Strip */}
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  sx={{ mb: 3 }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Chip
                      icon={<SecurityIcon sx={{ fontSize: "14px !important", color: "#818cf8 !important" }} />}
                      label="OFFICIAL PLATFORM POLICY"
                      sx={{
                        background: "rgba(99, 102, 241, 0.15)",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                        color: "#c7d2fe",
                        fontWeight: 800,
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        borderRadius: "8px",
                      }}
                    />
                    <Chip
                      icon={<VerifiedUserIcon sx={{ fontSize: "14px !important", color: "#22c55e !important" }} />}
                      label="Verified"
                      size="small"
                      sx={{
                        background: "rgba(34, 197, 94, 0.12)",
                        color: "#86efac",
                        fontWeight: 700,
                        fontSize: "11px",
                        borderRadius: "8px",
                      }}
                    />
                  </Stack>

                  <Button
                    size="small"
                    startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                    onClick={handleCopyLink}
                    sx={{
                      color: copied ? "#86efac" : "rgba(255, 255, 255, 0.7)",
                      background: copied ? "rgba(34, 197, 94, 0.15)" : "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: 600,
                      textTransform: "none",
                      px: 1.5,
                      "&:hover": { background: "rgba(255, 255, 255, 0.12)" },
                    }}
                  >
                    {copied ? "Link Copied!" : "Share Document"}
                  </Button>
                </Stack>

                {/* Main Page Title */}
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.75rem", sm: "2.35rem", md: "2.75rem" },
                    lineHeight: 1.2,
                    mb: 2,
                    background: "linear-gradient(135deg, #ffffff 40%, #c7d2fe 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {pageData.title}
                </Typography>

                {/* Metadata row */}
                <Stack direction="row" spacing={3} alignItems="center" sx={{ mb: 4, pb: 3, borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AccessTimeIcon sx={{ fontSize: 16, color: "rgba(255, 255, 255, 0.5)" }} />
                    <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 500 }}>
                      Last updated: {formatDate(pageData.updatedAt)}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.4)" }}>•</Typography>
                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.6)", fontWeight: 500 }}>
                    FunChat Compliance Team
                  </Typography>
                </Stack>

                {/* Formatted HTML Content Body */}
                <Box
                  sx={{
                    color: "rgba(255, 255, 255, 0.88)",
                    fontSize: { xs: "14.5px", sm: "16px" },
                    lineHeight: 1.75,
                    "& h2": {
                      fontSize: { xs: "1.35rem", sm: "1.65rem" },
                      fontWeight: 800,
                      color: "#fff",
                      mt: 4,
                      mb: 1.5,
                      borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                      pb: 1,
                    },
                    "& h3": {
                      fontSize: { xs: "1.1rem", sm: "1.3rem" },
                      fontWeight: 700,
                      color: "#c7d2fe",
                      mt: 3,
                      mb: 1,
                    },
                    "& p": {
                      mb: 2,
                      color: "rgba(255, 255, 255, 0.82)",
                    },
                    "& ul, & ol": {
                      mb: 2.5,
                      pl: 3,
                      "& li": {
                        mb: 1,
                        color: "rgba(255, 255, 255, 0.82)",
                      },
                    },
                    "& strong": {
                      color: "#fff",
                      fontWeight: 700,
                    },
                    "& em": {
                      color: "rgba(255, 255, 255, 0.6)",
                    },
                    "& a": {
                      color: "#818cf8",
                      textDecoration: "underline",
                      "&:hover": { color: "#a5b4fc" },
                    },
                    "& table": {
                      width: "100%",
                      borderCollapse: "collapse",
                      my: 3,
                      "& th, & td": {
                        border: "1px solid rgba(255, 255, 255, 0.12)",
                        p: 1.5,
                        textAlign: "left",
                        fontSize: "14px",
                      },
                      "& th": {
                        background: "rgba(255, 255, 255, 0.06)",
                        fontWeight: 700,
                      },
                    },
                    "& blockquote": {
                      borderLeft: "4px solid #6366f1",
                      pl: 2.5,
                      py: 1,
                      my: 2.5,
                      background: "rgba(99, 102, 241, 0.08)",
                      borderRadius: "0 12px 12px 0",
                      fontStyle: "italic",
                      color: "rgba(255, 255, 255, 0.9)",
                    },
                  }}
                  dangerouslySetInnerHTML={{ __html: pageData.content }}
                />

                {/* Bottom navigation pill */}
                <Box
                  sx={{
                    mt: 6,
                    pt: 4,
                    borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={() => navigate("/")}
                    sx={{
                      color: "rgba(255, 255, 255, 0.8)",
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      px: 2.5,
                      py: 1,
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: "13px",
                      "&:hover": { background: "rgba(255, 255, 255, 0.12)", color: "#fff" },
                    }}
                  >
                    Back to Home
                  </Button>

                  <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.5)" }}>
                    FunChat Connect © 2026. All rights reserved.
                  </Typography>
                </Box>
              </Paper>
            )}
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
