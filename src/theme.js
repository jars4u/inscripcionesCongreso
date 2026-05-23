import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#046552",
      dark: "#00492F",
      light: "#2F8A73",
      contrastText: "#F7F3E8",
    },
    secondary: {
      main: "#FF7140",
      dark: "#C65221",
      contrastText: "#1E1E1E",
    },
    warning: {
      main: "#FFBC00",
      dark: "#C68A00",
      contrastText: "#1E1E1E",
    },
    background: {
      default: "#F3EFE4",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#16302A",
      secondary: "#52605A",
    },
    divider: "#D8D1C2",
  },
  shape: {
    borderRadius: 0,
  },
  typography: {
    fontFamily: '"Lexend", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h5: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F3EFE4",
          color: "#16302A",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          minHeight: 42,
        },
        containedPrimary: {
          boxShadow: "none",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          backgroundColor: "#FFFFFF",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontWeight: 600,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          color: "#16302A",
          backgroundColor: "#EEE8D8",
        },
      },
    },
  },
});

export default theme;