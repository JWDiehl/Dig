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
        // Layout — deep space / OLED black
        canvas: "#0A0A0A",
        chrome: "rgba(10,10,10,0.94)",
        "surface-elevated": "rgba(16,16,16,0.98)",

        // Typography
        "text-primary": "#F1F1F1",
        "text-secondary": "#666666",
        "text-dim": "#333333",

        // Signals
        "data-thin": "#F0B429",
        "focus-ring": "#F1F1F1",

        // Genre-family palette — vivid on OLED black
        "honey-bee": "#F0B429",    // Jazz / blues / soul / folk / world
        "killer-queen": "#FF4F1F", // Rock / punk / funk / metal
        "purple-haze": "#A855F7",  // Electronic / ambient / experimental
        "mr-blue-sky": "#22D3EE",  // Hip-hop / R&B
        tusk: "#94A3B8",           // Classical / uncategorized + edge default
      },
    },
  },
  plugins: [],
};

export default config;