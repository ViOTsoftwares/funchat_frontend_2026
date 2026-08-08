import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import LaunchRoundedIcon from "@mui/icons-material/LaunchRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import { ENV } from "../config/env.js";

export default function AdPopup({
  placement = "popup_interstitial",
  delayMs = 3000,
  autoCloseSec = 0,
}) {
  const [ad, setAd] = useState(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const scriptContainerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPopupAd = async () => {
      try {
        const res = await fetch(`${ENV.API_URL}/api/public/ads?placement=${placement}`);
        const json = await res.json();
        if (isMounted && json.ok && Array.isArray(json.data) && json.data.length > 0) {
          const selectedAd = json.data[0];
          if (selectedAd.popupEnabled === false) return;

          // Check frequency rules
          if (selectedAd.popupFrequency === "once_per_session" && sessionStorage.getItem("funchat_ad_popup_dismissed")) {
            return;
          }
          if (selectedAd.popupFrequency === "once_per_day") {
            const lastShown = localStorage.getItem("funchat_ad_popup_last_shown");
            if (lastShown && Date.now() - Number(lastShown) < 24 * 60 * 60 * 1000) {
              return;
            }
          }

          setAd(selectedAd);

          // Calculate delay: prefer ad's popupDelaySeconds (in seconds) or fallback to prop
          const effectiveDelay = selectedAd.popupDelaySeconds !== undefined
            ? selectedAd.popupDelaySeconds * 1000
            : delayMs;

          const timer = setTimeout(() => {
            if (isMounted) {
              setOpen(true);
              localStorage.setItem("funchat_ad_popup_last_shown", String(Date.now()));

              // Auto-close timer if configured
              const autoClose = selectedAd.popupAutoCloseSeconds || autoCloseSec;
              if (autoClose > 0) {
                setTimeout(() => {
                  if (isMounted) setOpen(false);
                }, autoClose * 1000);
              }

              // Track impression
              if (selectedAd._id) {
                fetch(`${ENV.API_URL}/api/public/ads/${selectedAd._id}/impression`, {
                  method: "POST",
                }).catch(() => {});
              }
            }
          }, effectiveDelay);

          return () => clearTimeout(timer);
        }
      } catch (err) {
        // Non-blocking
      }
    };

    fetchPopupAd();

    return () => {
      isMounted = false;
    };
  }, [placement, delayMs, autoCloseSec]);

  // Handle Google AdSense & Third-party script execution
  useEffect(() => {
    if (!open || !ad) return;

    if (ad.adType === "google_adsense" && ad.googleClientId && ad.googleSlotId) {
      try {
        const scriptId = "google-adsense-script";
        if (!document.getElementById(scriptId)) {
          const script = document.createElement("script");
          script.id = scriptId;
          script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ad.googleClientId}`;
          script.async = true;
          script.crossOrigin = "anonymous";
          document.head.appendChild(script);
        }

        setTimeout(() => {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
          } catch (e) {}
        }, 150);
      } catch (e) {}
    }

    if (ad.adType === "custom_script" && ad.scriptCode && scriptContainerRef.current) {
      try {
        scriptContainerRef.current.innerHTML = "";
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = ad.scriptCode;

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
        console.error("Popup script render error", e);
      }
    }
  }, [open, ad]);

  const handleClose = () => {
    setOpen(false);
    setDismissed(true);
    sessionStorage.setItem("funchat_ad_popup_dismissed", "true");
  };

  const handleAdClick = (e) => {
    e.stopPropagation();
    if (ad && ad._id) {
      fetch(`${ENV.API_URL}/api/public/ads/${ad._id}/click`, {
        method: "POST",
      }).catch(() => {});
    }
    if (ad && ad.targetUrl) {
      window.open(ad.targetUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!ad || !open || dismissed) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          background: "linear-gradient(145deg, #ffffff, #f8faff)",
          border: "1.5px solid rgba(99, 102, 241, 0.25)",
          boxShadow: "0 24px 60px -12px rgba(79, 70, 229, 0.28)",
          overflow: "hidden",
          p: 0,
          m: 2,
        },
      }}
    >
      {/* Top Banner Gradient Strip */}
      <Box
        sx={{
          height: 6,
          background: "linear-gradient(90deg, #4f46e5, #ec4899, #8b5cf6)",
        }}
      />

      <DialogContent sx={{ p: 2.75 }}>
        {/* Header: Badge & Close Button */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Chip
            label={ad.badgeText || "SPECIAL OFFER"}
            size="small"
            icon={<LocalFireDepartmentIcon sx={{ fontSize: "13px !important", color: "#ec4899" }} />}
            sx={{
              height: 22,
              fontSize: "10px",
              fontWeight: 800,
              letterSpacing: "0.6px",
              backgroundColor: "#fdf2f8",
              color: "#db2777",
              border: "1px solid #fbcfe8",
            }}
          />
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              p: 0.5,
              color: "#64748b",
              backgroundColor: "rgba(241, 245, 249, 0.8)",
              "&:hover": { backgroundColor: "#e2e8f0", color: "#1e293b" },
            }}
            title="Dismiss"
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        {/* Custom Graphic Banner */}
        {ad.image && (
          <Box
            component="img"
            src={`${ENV.IMAGE_URL}/logos/${ad.image}`}
            alt={ad.title}
            onClick={handleAdClick}
            sx={{
              width: "100%",
              maxHeight: 160,
              objectFit: "cover",
              borderRadius: "12px",
              mb: 2,
              cursor: "pointer",
              border: "1px solid rgba(226, 232, 240, 0.8)",
              boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
            }}
          />
        )}

        {/* Script / AdSense / HTML Container */}
        {ad.adType === "custom_script" && (
          <Box ref={scriptContainerRef} sx={{ mb: 2 }} />
        )}

        {ad.adType === "google_adsense" && (
          <Box sx={{ minHeight: 120, mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ins
              className="adsbygoogle"
              style={{ display: "block", textAlign: "center", width: "100%" }}
              data-ad-client={ad.googleClientId}
              data-ad-slot={ad.googleSlotId}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </Box>
        )}

        {/* Title */}
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "16px",
            color: "#0f172a",
            lineHeight: 1.35,
            mb: 1,
            cursor: "pointer",
          }}
          onClick={handleAdClick}
        >
          {ad.title}
        </Typography>

        {/* Description */}
        {ad.description && (
          <Typography
            variant="body2"
            sx={{
              color: "#475569",
              lineHeight: 1.5,
              mb: 2.5,
              fontSize: "13px",
            }}
          >
            {ad.description}
          </Typography>
        )}

        {/* CTA Buttons */}
        <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            size="medium"
            onClick={handleAdClick}
            endIcon={<LaunchRoundedIcon sx={{ fontSize: "16px !important" }} />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: "13.5px",
              py: 1.1,
              borderRadius: "10px",
              background: "linear-gradient(135deg, #4f46e5, #3730a3)",
              boxShadow: "0 6px 18px rgba(79, 70, 229, 0.35)",
              "&:hover": {
                background: "linear-gradient(135deg, #4338ca, #312e81)",
              },
            }}
          >
            {ad.ctaText || "Claim Deal Now"}
          </Button>
          <Button
            variant="outlined"
            onClick={handleClose}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "12.5px",
              px: 2,
              borderRadius: "10px",
              borderColor: "#e2e8f0",
              color: "#64748b",
              "&:hover": {
                borderColor: "#cbd5e1",
                backgroundColor: "#f8fafc",
                color: "#334155",
              },
            }}
          >
            Later
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
