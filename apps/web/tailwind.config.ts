import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0b0f19", soft: "#111827", line: "#1f2937" },
        paper: { DEFAULT: "#f3f4f6", muted: "#9ca3af" },
        accent: { DEFAULT: "#3b82f6", hover: "#2563eb" },
        verdict: { match: "#10b981", uncertain: "#f59e0b", reject: "#ef4444" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Inter", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
