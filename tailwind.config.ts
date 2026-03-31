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
      borderBottom: "1px solid color-mix(in srgb, var(--border) 82%, transparent)",
      minHeight: "5.4rem",
      padding: "1rem clamp(1.25rem, 2.2vw, 2rem)",
      boxShadow: "0 4px 12px rgba(15, 36, 56, 0.07)",
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
      borderRadius: "1rem",
      border: "1px solid color-mix(in srgb, var(--border) 92%, transparent)",
      backgroundColor: "var(--card)",
      boxShadow: "0 8px 18px rgba(15, 36, 56, 0.09), inset 0 1px 0 rgba(255, 255, 255, 0.55)",
    },
    ".app-panel-pad": {
      padding: "clamp(1rem, 1.4vw, 1.5rem)",
    },
    ".app-panel-header": {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "0.75rem",
      borderBottom: "1px solid color-mix(in srgb, var(--border) 85%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--secondary) 84%, transparent)",
      padding: "1rem 1.25rem",
    },
    ".app-band": {
      backgroundColor: "color-mix(in srgb, var(--secondary) 72%, transparent)",
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
      border: "1px solid rgba(236, 249, 255, 0.42)",
      backgroundColor: "rgba(255, 255, 255, 0.18)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.32), 0 10px 24px rgba(2, 18, 36, 0.2)",
      backdropFilter: "blur(6px)",
    },
    ".app-control": {
      width: "100%",
      height: "2.5rem",
      borderRadius: "0.75rem",
      border: "1px solid color-mix(in srgb, var(--border) 96%, transparent)",
      backgroundColor: "var(--input-background)",
      color: "var(--foreground)",
      padding: "0 0.75rem",
      fontSize: "0.875rem",
      outline: "none",
      transition: "border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease",
      boxShadow: "0 1px 2px rgba(15, 36, 56, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.56)",
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
      borderRadius: "0.75rem",
      border: "1px solid transparent",
      backgroundColor: "var(--primary)",
      color: "var(--primary-foreground)",
      fontSize: "0.875rem",
      fontWeight: "600",
      padding: "0.625rem 1rem",
      transition: "background-color 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
      boxShadow: "0 10px 22px rgba(15, 118, 110, 0.24)",
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
      borderRadius: "0.75rem",
      border: "1px solid color-mix(in srgb, var(--border) 95%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--card) 92%, var(--secondary) 8%)",
      color: "var(--foreground)",
      fontSize: "0.875rem",
      fontWeight: "500",
      padding: "0.625rem 1rem",
      transition: "background-color 160ms ease, border-color 160ms ease, opacity 160ms ease",
    },
    ".app-btn-secondary:hover": {
      backgroundColor: "var(--secondary)",
      borderColor: "color-mix(in srgb, var(--accent) 32%, var(--border))",
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
      borderTop: "1px solid color-mix(in srgb, var(--border) 94%, transparent)",
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
