import { createTheme } from "@mui/material";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#4f46e5" },
    secondary: { main: "#0f172a" },
    background: { default: "#f6f7fb" }
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Space Grotesk", "Segoe UI", system-ui, sans-serif',
    h4: { fontWeight: 700, letterSpacing: -0.4 },
    h6: { fontWeight: 700 }
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 18
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600
        }
      }
    }
  }
});
