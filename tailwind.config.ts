import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const appComponents = plugin(({ addComponents }) => {
  addComponents({
    ".app-shell": {
      width: "100%",
      minHeight: "100%",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "var(--background)",
    },
    ".app-hero": {
      position: "relative",
      overflow: "hidden",
      borderBottom: "1px solid color-mix(in srgb, var(--border) 100%, transparent)",
      minHeight: "5.4rem",
      padding: "1rem clamp(1.25rem, 2.2vw, 2rem)",
      boxShadow: "var(--shadow-xs)",
      backgroundColor: "var(--card)",
    },
    ".app-content": {
      flex: "1 1 auto",
      padding: "clamp(1.25rem, 2vw, 2rem)",
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
    },
    ".app-panel": {
      borderRadius: "var(--radius-lg)",
      border: "1px solid color-mix(in srgb, var(--border) 100%, transparent)",
      backgroundColor: "var(--card)",
      boxShadow: "var(--shadow-sm)",
    },
    ".app-panel-pad": {
      padding: "clamp(1rem, 1.4vw, 1.5rem)",
    },
    ".app-panel-header": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
      borderBottom: "1px solid color-mix(in srgb, var(--border) 92%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--secondary) 94%, transparent)",
      padding: "1rem 1.25rem",
    },
    ".app-band": {
      backgroundColor: "color-mix(in srgb, var(--secondary) 86%, transparent)",
    },
    ".app-title": {
      fontSize: "2rem",
      fontWeight: "700",
      lineHeight: "1.1",
      letterSpacing: "-0.02em",
    },
    ".app-subtitle": {
      marginTop: "0.2rem",
      fontSize: "0.875rem",
      lineHeight: "1.25",
      color: "var(--muted-foreground)",
    },
    ".app-icon-pill": {
      width: "2.75rem",
      height: "2.75rem",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "0.75rem",
      border: "1px solid color-mix(in srgb, var(--border) 88%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--card) 84%, var(--secondary) 16%)",
      boxShadow: "var(--shadow-xs)",
    },
    ".app-control": {
      width: "100%",
      height: "2.625rem",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--input-border)",
      backgroundColor: "var(--input-background)",
      color: "var(--foreground)",
      padding: "0 0.875rem",
      fontSize: "0.875rem",
      outline: "none",
      transition: "border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
      boxShadow: "var(--shadow-xs)",
    },
    ".app-control:focus-visible": {
      borderColor: "var(--ring)",
      boxShadow: "0 0 0 3px color-mix(in srgb, var(--ring) 28%, transparent)",
    },
    ".app-control:disabled": {
      opacity: "0.65",
      cursor: "not-allowed",
    },
    ".app-btn-primary": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      borderRadius: "var(--radius-md)",
      border: "1px solid transparent",
      backgroundColor: "var(--primary)",
      color: "var(--primary-foreground)",
      fontSize: "0.875rem",
      fontWeight: "600",
      padding: "0.625rem 1rem",
      transition: "background-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
      boxShadow: "0 8px 20px color-mix(in srgb, var(--primary) 22%, transparent)",
    },
    ".app-btn-primary:hover": {
      backgroundColor: "var(--primary-hover)",
    },
    ".app-btn-primary:disabled": {
      opacity: "0.65",
      cursor: "not-allowed",
    },
    ".app-btn-secondary": {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      borderRadius: "var(--radius-md)",
      border: "1px solid color-mix(in srgb, var(--border) 95%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--card) 72%, var(--secondary) 28%)",
      color: "var(--foreground)",
      fontSize: "0.875rem",
      fontWeight: "500",
      padding: "0.625rem 1rem",
      transition: "background-color 160ms ease, border-color 160ms ease, opacity 160ms ease",
      boxShadow: "var(--shadow-xs)",
    },
    ".app-btn-secondary:hover": {
      backgroundColor: "color-mix(in srgb, var(--secondary) 92%, var(--card))",
      borderColor: "color-mix(in srgb, var(--accent) 42%, var(--border))",
    },
    ".app-btn-secondary:disabled": {
      opacity: "0.65",
      cursor: "not-allowed",
    },
    ".app-table": {
      width: "100%",
      fontSize: "0.875rem",
    },
    ".app-table-head": {
      backgroundColor: "color-mix(in srgb, var(--secondary) 92%, transparent)",
    },
    ".app-th": {
      padding: "0.75rem 1rem",
      textAlign: "left",
      verticalAlign: "middle",
      fontSize: "0.8125rem",
      fontWeight: "650",
      color: "var(--muted-foreground)",
    },
    ".app-td": {
      padding: "0.75rem 1rem",
      verticalAlign: "top",
    },
    ".app-row": {
      borderTop: "1px solid color-mix(in srgb, var(--border) 90%, transparent)",
    },
    ".app-action-link": {
      color: "var(--primary)",
      textDecoration: "none",
      fontWeight: "500",
      transition: "color 160ms ease",
    },
    ".app-action-link:hover": {
      color: "var(--primary-hover)",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
    },
    ".app-action-link-danger": {
      color: "var(--destructive)",
      textDecoration: "none",
      fontWeight: "500",
      transition: "filter 160ms ease, opacity 160ms ease",
    },
    ".app-action-link-danger:hover": {
      filter: "brightness(0.95)",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
    },
    ".app-auth-link": {
      color: "var(--primary)",
      textDecoration: "none",
      fontWeight: "600",
      transition: "color 160ms ease",
    },
    ".app-auth-link:hover": {
      color: "var(--primary-hover)",
      textDecoration: "underline",
      textUnderlineOffset: "3px",
    },
  });
});

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Aptos", "Segoe UI", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
      boxShadow: {
        panel: "0 10px 24px rgba(18, 38, 59, 0.07)",
        "panel-sm": "0 6px 16px rgba(18, 38, 59, 0.05)",
      },
    },
  },
  plugins: [appComponents],
};

export default config;
