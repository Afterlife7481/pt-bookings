import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand, #064e3b)",
          hover: "var(--brand-hover, #053528)",
          mint: "var(--brand-mint, #6ee7b7)",
          ink: "var(--brand-ink, #020617)",
          foreground: "var(--brand-foreground, #ffffff)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
