import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Class-based dark mode. Currently only the Live Guide screen opts in (it wraps
  // itself in `.dark`), so the rest of the app is unaffected.
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Lumo brand blue (#2f6bff is the primary action colour in the design).
        primary: {
          50: "#eef3ff",
          100: "#dbe6ff",
          500: "#4d83ff",
          600: "#2f6bff",
          700: "#1f56e0",
          900: "#14213d",
        },
        accent: {
          500: "#f59e0b",
          600: "#d97706",
        },
        // Lumo warm "sand" surfaces — the calm cream background from the design.
        sand: {
          DEFAULT: "#F3EEE6",
          50: "#FBF9F5",
          100: "#F3EEE6",
          200: "#E8E0D3",
          300: "#D8CDBA",
        },
        // Primary text and muted meta text (from the design).
        ink: {
          DEFAULT: "#1b2640",
          muted: "#8a8275",
        },
        // Safety colour system: green = safe, amber = armed, red = critical only.
        safety: {
          safe: "#1F9D6B",
          armed: "#D9831F",
          critical: "#e53935",
        },
      },
      fontFamily: {
        // Both provided by next/font in the root layout (see layout.tsx).
        // sans = body/UI, serif = display headings (the Lumo signature look).
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        serif: ["var(--font-instrument)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
