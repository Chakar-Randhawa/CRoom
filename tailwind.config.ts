import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./context/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F1B1A",
        paper: "#F6F4EF",
        pine: {
          DEFAULT: "#2E5F52",
          dark: "#1E4238",
          light: "#3F7A69",
        },
        clay: {
          DEFAULT: "#C97A4A",
          dark: "#A85F35",
        },
        sage: "#8A9A94",
        hairline: "#E4E0D6",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        tile: "0 1px 2px rgba(15,27,26,0.06), 0 8px 24px -8px rgba(15,27,26,0.12)",
        "tile-pressed": "inset 0 2px 6px rgba(15,27,26,0.25)",
      },
      borderRadius: {
        tile: "18px",
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;
