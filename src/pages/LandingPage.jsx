import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";

export default function LandingPage({ status, isSearching, onStartChat, onStartVideo }) {
  return (
    <Paper className="landing-card" elevation={0}>
      <Box className="landing-glow" />
      <Stack direction={{ xs: "column", md: "row" }} spacing={4} alignItems={{ md: "center" }}>
        <Box sx={{ flex: 1 }}>
          <Typography className="landing-badge" variant="caption">
            Premium 1:1 Experiences
          </Typography>
          <Typography variant="h3" className="landing-title">
            Meet someone new with a vibe-first, safety-forward lounge.
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            FunChat pairs you instantly for curated conversations. Choose chat or video, then relax with built-in controls, smart pacing, and a polished experience.
          </Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              className="cta-button cta-chat"
              variant="contained"
              startIcon={<ChatBubbleOutlineIcon />}
              onClick={onStartChat}
              disabled={isSearching}
            >
              Start Chat
            </Button>
            <Button
              className="cta-button cta-video"
              variant="contained"
              startIcon={<VideocamOutlinedIcon />}
              onClick={onStartVideo}
              disabled={isSearching}
            >
              Start Video
            </Button>
          </Stack>
          <Stack direction="row" spacing={2} className="trust-row">
            <Box className="trust-pill">Verified vibe</Box>
            <Box className="trust-pill">Safety tools built-in</Box>
            <Box className="trust-pill">Instant match</Box>
          </Stack>
        </Box>
        <Box className="landing-panel">
          <Stack spacing={2}>
            <Box className="panel-tile">
              <Typography variant="subtitle2">Live lounge status</Typography>
              <Typography variant="h5">{status}</Typography>
            </Box>
            <Box className="panel-tile">
              <Typography variant="subtitle2">Ready modes</Typography>
              <Stack direction="row" spacing={1}>
                <Chip label="Chat" color="primary" size="small" />
                <Chip label="Video" color="secondary" size="small" />
              </Stack>
            </Box>
            <Box className="panel-tile">
              <Typography variant="subtitle2">Session spotlight</Typography>
              <Typography variant="body2" color="text.secondary">
                1:1, anonymous, and softly moderated to keep the flow friendly.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
