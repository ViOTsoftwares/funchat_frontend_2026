import { Box, Container, Stack, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import SecurityIcon from "@mui/icons-material/Security";
import VerifiedIcon from "@mui/icons-material/Verified";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";

export default function Footer() {
  return (
    <Box className="app-footer">
      <Container maxWidth="lg">
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box className="brand-dot">
                <BoltIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle1" fontWeight={700}>FunChat Connect</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              A professional social platform for meaningful real-time conversations, built with privacy, safety, and reliability at its core.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} className="footer-links">
            <Stack direction="row" spacing={1} alignItems="center">
              <SecurityIcon fontSize="small" />
              <Typography variant="body2">Privacy & Security</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <VerifiedIcon fontSize="small" />
              <Typography variant="body2">Community Standards</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <SupportAgentIcon fontSize="small" />
              <Typography variant="body2">Help & Support</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
