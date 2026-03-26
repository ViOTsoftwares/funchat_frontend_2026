import { AppBar, Box, Button, Chip, Container, Stack, Toolbar, Typography } from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";

export default function Header({ status }) {
  return (
    <AppBar position="static" elevation={0} color="transparent">
      <Toolbar className="app-header">
        <Container maxWidth="lg" sx={{ display: "flex", alignItems: "center" }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexGrow: 1 }}>
            <Box className="brand-dot">
              <BoltIcon fontSize="small" />
            </Box>
            <Stack spacing={0}>
              <Typography variant="h6">FunChat Pro</Typography>
              <Typography variant="caption" color="text.secondary">Secure 1:1 conversations</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={`Live: ${status}`} color="primary" size="small" />
            <Button variant="outlined" size="small" className="header-cta">Upgrade</Button>
          </Stack>
        </Container>
      </Toolbar>
    </AppBar>
  );
}
