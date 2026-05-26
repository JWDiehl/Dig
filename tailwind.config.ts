import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/graph/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/store/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Layout
        canvas: "#1a1814",
        chrome: "rgba(28,24,20,0.92)",
        "surface-elevated": "rgba(38,34,28,0.96)",

        // Typography
        "text-primary": "#F3EDDD",
        "text-secondary": "#8a8470",
        "text-dim": "#52503f",

        // Signals
        "data-thin": "#EDC458",
        "focus-ring": "#F3EDDD",

        // Genre-family palette (UX-DR4)
        "honey-bee": "#EDC458", // Jazz / blues / soul / folk / world
        "killer-queen": "#E05E37", // Rock / punk / funk
        "purple-haze": "#9F76B6", // Electronic / ambient / experimental
        "mr-blue-sky": "#ABCDBB", // Hip-hop / R&B
        tusk: "#D3CEB8", // Classical / uncategorized + edge default
      },
    },
  },
  plugins: [],
};

export default config;