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
              <Typography variant="subtitle1" fontWeight={700}>FunChat Pro</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Professional-grade matching with privacy-first controls and premium experience design.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} className="footer-links">
            <Stack direction="row" spacing={1} alignItems="center">
              <SecurityIcon fontSize="small" />
              <Typography variant="body2">Security</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <VerifiedIcon fontSize="small" />
              <Typography variant="body2">Compliance</Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <SupportAgentIcon fontSize="small" />
              <Typography variant="body2">Support</Typography>
            </Stack>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
