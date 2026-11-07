import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        plum: { 50: "#f7f3f8", 100: "#eee5f0", 200: "#decbe2", 300: "#cdb4d2", 500: "#8c638f", 700: "#67456c", 900: "#39263e" },
        sage: { 50: "#f1f5f0", 100: "#e1e9df", 600: "#627b62", 700: "#4b634d" },
        blush: { 50: "#fbf3f2", 100: "#f6e5e3", 600: "#bc7c79" },
      },
      boxShadow: { card: "0 2px 14px rgba(44, 34, 45, .045)" },
      fontFamily: { sans: ["var(--font-inter)", "Arial", "sans-serif"], display: ["var(--font-playfair)", "Georgia", "serif"] },
    },
  },
  plugins: [],
};
export default config;
