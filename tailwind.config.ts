import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: { colors: { base: "#0d1117", panel: "#161b22", gold: "#d9b86c" } },
  },
  plugins: [],
} satisfies Config;
