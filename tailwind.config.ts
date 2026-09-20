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
        ink: "#171412",
        paper: "#FDF7EE",
        card: "#FFFFFF",
        coral: {
          DEFAULT: "#FB7A4C",
          dark: "#E1602F",
          light: "#FFAF8B",
        },
        // Kept as aliases so any old class names still resolve while the
        // rest of the UI is migrated over.
        pine: {
          DEFAULT: "#FB7A4C",
          dark: "#E1602F",
          light: "#FFAF8B",
        },
        clay: {
          DEFAULT: "#FB7A4C",
          dark: "#E1602F",
        },
        sage: "#8C8579",
        hairline: "#ECE3D5",
      },
      fontFamily: {
        display: ["var(--font-baloo)", "system-ui", "sans-serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        tile: "0 1px 2px rgba(23,20,18,0.05), 0 10px 28px -10px rgba(23,20,18,0.14)",
        "tile-pressed": "inset 0 2px 6px rgba(23,20,18,0.2)",
        floating: "0 8px 30px -8px rgba(23,20,18,0.18)",
      },
      borderRadius: {
        tile: "20px",
        pill: "999px",
      },
      backgroundImage: {
        "grid-paper":
          "linear-gradient(to right, rgba(23,20,18,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,20,18,0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "44px 44px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
