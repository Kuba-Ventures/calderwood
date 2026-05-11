import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: [
          "var(--font-newsreader)",
          "ui-serif",
          "Georgia",
          "Cambria",
          "serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "monospace",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#0b1220",
          900: "#0b1220",
          800: "#111a2e",
          700: "#1f2a44",
          600: "#334155",
          500: "#475569",
          400: "#64748b",
          300: "#94a3b8",
          200: "#cbd5e1",
        },
        canvas: {
          DEFAULT: "#ffffff",
          tint: "#f8fafc",
          tint2: "#f1f5f9",
          border: "#e2e8f0",
        },
        accent: {
          DEFAULT: "#0c4a6e",
          ink: "#082f49",
        },
        gain: {
          DEFAULT: "#5f7f6b",
          ink: "#3f5f4b",
          soft: "#edf1ed",
        },
      },
      maxWidth: {
        container: "1120px",
        prose: "65ch",
        readable: "60ch",
      },
      letterSpacing: {
        tightish: "-0.015em",
        tighter2: "-0.025em",
      },
    },
  },
  plugins: [],
};
export default config;
