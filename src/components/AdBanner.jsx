import { useState, useEffect, useRef } from "react";
import { Box, Typography, Button, Chip, IconButton } from "@mui/material";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import CloseIcon from "@mui/icons-material/Close";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { ENV } from "../config/env.js";

export default function AdBanner({ placement = "community_sidebar", sx = {} }) {
  const [ad, setAd] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);
  const scriptContainerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchAd = async () => {
      try {
        const res = await fetch(`${ENV.API_URL}/api/public/ads?placement=${placement}`);
        const json = await res.json();
        if (isMounted && json.ok && Array.isArray(json.data) && json.data.length > 0) {
          const selectedAd = json.data[0];
          setAd(selectedAd);

          // Log impression
          if (selectedAd._id) {
            fetch(`${ENV.API_URL}/api/public/ads/${selectedAd._id}/impression`, {
              method: "POST",
            }).catch(() => {});
          }
        }
      } catch (err) {
        // Non-blocking
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchAd();
    return () => {
      isMounted = false;
    };
  }, [placement]);

  // Handle Google AdSense initialization
  useEffect(() => {
    if (!ad || dismissed) return;

    if (ad.adType === "google_adsense" && ad.googleClientId && ad.googleSlotId) {
      try {
        // Check if AdSense script is in document
        const scriptId = "google-adsense-script";
        if (!document.getElementById(scriptId)) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ad.googleClientId}`;
          script.async = true;
          script.crossOrigin = "anonymous";
          document.head.appendChild(script);
        }

        // Push ad slot
        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {
            // Already pushed or AdBlock active
          }
        }, 100);
      } catch (e) {
        // Safe catch
      }
    }

    // Handle third-party script execution in React
    if (ad.adType === "custom_script" && ad.scriptCode && scriptContainerRef.current) {
      try {
        scriptContainerRef.current.innerHTML = "";
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = ad.scriptCode;

        // Recreate script tags so the browser executes them
        const scripts = tempDiv.querySelectorAll("script");
        scripts.forEach((oldScript) => {
          const newScript = document.createElement("script");
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.textContent = oldScript.textContent;
          oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        while (tempDiv.firstChild) {
          scriptContainerRef.current.appendChild(tempDiv.firstChild);
        }
      } catch (e) {
        console.error("Ad script render error", e);
      }
    }
  }, [ad, dismissed]);

  if (loading || !ad || dismissed) {
    return null;
  }

  const handleAdClick = (e) => {
    e.stopPropagation();
    if (ad._id) {
      fetch(`${ENV.API_URL}/api/public/ads/${ad._id}/click`, {
        method: "POST",
      }).catch(() => {});
    }
    if (ad.targetUrl) {
      window.open(ad.targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Google AdSense Layout
  if (ad.adType === "google_adsense") {
    return (
      <Box
        sx={{
          borderRadius: "14px",
          p: 1.5,
          background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.92))",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(226,232,240,0.9)",
          boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
          position: "relative",
          overflow: "hidden",
          ...sx,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Chip
            label={ad.badgeText || "ADVERTISEMENT"}
            size="small"
            icon={<AutoAwesomeIcon sx={{ fontSize: "11px !important", color: "#6366f1" }} />}
            sx={{
              height: 18,
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              backgroundColor: "#f5f3ff",
              color: "#6366f1",
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            sx={{ p: 0.2, color: "#94a3b8", "&:hover": { color: "#475569" } }}
            title="Close Ad"
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>

        {/* AdSense Unit */}
        <Box sx={{ minHeight: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ins
            className="adsbygoogle"
            style={{ display: "block", textAlign: "center", width: "100%" }}
            data-ad-client={ad.googleClientId}
            data-ad-slot={ad.googleSlotId}
            data-ad-format={ad.googleAdFormat || "auto"}
            data-full-width-responsive="true"
          />
        </Box>
      </Box>
    );
  }

  // Third-Party Custom Script / HTML embed Layout
  if (ad.adType === "custom_script") {
    return (
      <Box
        sx={{
          borderRadius: "14px",
          p: 1.5,
          background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(248,250,252,0.92))",
          border: "1px solid rgba(226,232,240,0.9)",
          boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
          position: "relative",
          overflow: "hidden",
          ...sx,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Chip
            label={ad.badgeText || "SPONSORED"}
            size="small"
            icon={<AutoAwesomeIcon sx={{ fontSize: "11px !important", color: "#4f46e5" }} />}
            sx={{
              height: 18,
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              backgroundColor: "#eef2ff",
              color: "#4f46e5",
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            sx={{ p: 0.2, color: "#94a3b8", "&:hover": { color: "#475569" } }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <div ref={scriptContainerRef} />
      </Box>
    );
  }

  // External Iframe Embed Layout
  if (ad.adType === "iframe_embed" && ad.iframeUrl) {
    return (
      <Box
        sx={{
          borderRadius: "14px",
          p: 1.5,
          background: "#fff",
          border: "1px solid rgba(226,232,240,0.9)",
          boxShadow: "0 6px 20px rgba(15,23,42,0.04)",
          position: "relative",
          overflow: "hidden",
          ...sx,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Chip
            label={ad.badgeText || "PARTNER"}
            size="small"
            sx={{
              height: 18,
              fontSize: "9px",
              fontWeight: 800,
              backgroundColor: "#f0fdf4",
              color: "#16a34a",
            }}
          />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
            }}
            sx={{ p: 0.2, color: "#94a3b8" }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
        <Box
          component="iframe"
          src={ad.iframeUrl}
          sx={{
            width: "100%",
            height: 120,
            border: "none",
            borderRadius: "8px",
          }}
          title={ad.title}
        />
      </Box>
    );
  }

  // Premium Custom Graphic Banner & Direct Advertiser Layout
  return (
    <Box
      onClick={handleAdClick}
      sx={{
        position: "relative",
        borderRadius: "14px",
        p: 1.75,
        cursor: "pointer",
        background: "linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(245, 247, 255, 0.92))",
        backdropFilter: "blur(12px)",
        border: "1.5px solid rgba(99, 102, 241, 0.16)",
        boxShadow: "0 6px 20px rgba(79, 70, 229, 0.06)",
        transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          borderColor: "#4f46e5",
          transform: "translateY(-3px)",
          boxShadow: "0 12px 28px rgba(79, 70, 229, 0.12)",
        },
        ...sx,
      }}
    >
      {/* Header Badge & Dismiss */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.25 }}>
        <Chip
          label={ad.badgeText || "SPONSORED"}
          size="small"
          icon={<AutoAwesomeIcon sx={{ fontSize: "11px !important", color: "#4f46e5" }} />}
          sx={{
            height: 18,
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.5px",
            backgroundColor: "#eef2ff",
            color: "#4f46e5",
          }}
        />
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setDismissed(true);
          }}
          sx={{ p: 0.2, color: "#94a3b8", "&:hover": { color: "#475569" } }}
          title="Dismiss ad"
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {/* Banner Graphic Image */}
      {ad.image && (
        <Box
          component="img"
          src={`${ENV.IMAGE_URL}/logos/${ad.image}`}
          alt={ad.title}
          sx={{
            width: "100%",
            height: 110,
            objectFit: "cover",
            borderRadius: "10px",
            mb: 1.25,
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
          onError={(e) => {
            e.target.style.display = "none";
          }}
        />
      )}

      {/* Ad Title */}
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: "13px",
          color: "#0f172a",
          lineHeight: 1.35,
          mb: 0.5,
        }}
      >
        {ad.title}
      </Typography>

      {/* Ad Description */}
      {ad.description && (
        <Typography
          variant="caption"
          sx={{
            color: "#64748b",
            display: "block",
            lineHeight: 1.4,
            mb: 1.5,
            fontSize: "11.5px",
          }}
        >
          {ad.description}
        </Typography>
      )}

      {/* Call to action button */}
      <Button
        variant="contained"
        fullWidth
        size="small"
        endIcon={<LaunchRoundedIcon sx={{ fontSize: "13px !important" }} />}
        sx={{
          textTransform: "none",
          fontWeight: 700,
          fontSize: "11.5px",
          py: 0.7,
          borderRadius: "8px",
          background: "linear-gradient(135deg, #4f46e5, #3730a3)",
          boxShadow: "0 4px 12px rgba(79,70,229,0.22)",
          "&:hover": {
            background: "linear-gradient(135deg, #4338ca, #312e81)",
          },
        }}
      >
        {ad.ctaText || "Learn More"}
      </Button>
    </Box>
  );
}
