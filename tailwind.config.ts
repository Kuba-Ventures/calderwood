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
        display: [
          "var(--font-display)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        data: ["var(--font-mono-data)", "ui-monospace", "monospace"],
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
        // ---- Mintlify-style landing palette (CSS vars in globals.css) ----
        brand: { DEFAULT: "var(--brand)", deep: "var(--brand-deep)" },
        sky: "var(--sky)",
        violet: "var(--violet)",
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
          deep: "var(--gold-deep)",
        },
        coral: "var(--coral)",
        paper: "var(--paper)",
        tint: { DEFAULT: "var(--tint)", 2: "var(--tint2)" },
        line: "var(--line)",
        body: "var(--body)",
        muted: "var(--muted)",
        heading: "var(--ink)",
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
        wrap: "1140px",
        prose: "65ch",
        readable: "60ch",
      },
      boxShadow: {
        soft: "0 24px 60px -28px rgba(17, 24, 72, 0.32)",
        lift: "0 44px 100px -40px rgba(17, 24, 72, 0.42)",
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
