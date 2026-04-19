import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FAF6EE",
        surface: "#FFFFFF",
        "warm-dark": "#2B2735",
        "warm-muted": "#6B6578",
        terracotta: "#E87A5D",
        "terracotta-dark": "#D46849",
        sage: "#7BA881",
        "sage-soft": "#DCE7DD",
        mustard: "#F5C26B",
        "mustard-soft": "#FCEBCB",
        "warm-indigo": "#6B8ACE",
        "warm-indigo-soft": "#E2E8F5",
        "warm-line": "#E8E2D4",
      },
      fontFamily: {
        display: ["var(--font-heebo)", "system-ui", "sans-serif"],
        body: ["var(--font-rubik)", "var(--font-heebo)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      boxShadow: {
        soft: "0 4px 16px -4px rgba(43, 39, 53, 0.08)",
        warm: "0 6px 24px -6px rgba(232, 122, 93, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
