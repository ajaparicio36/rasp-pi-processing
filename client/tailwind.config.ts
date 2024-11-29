import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        text: "#dcf0f3",
        primary: {
          DEFAULT: "#FFC0CB",
          foreground: "#0d1618",
        },
        secondary: {
          DEFAULT: "#0d8b9c",
          foreground: "#e6f7f9",
        },
        accent: {
          DEFAULT: "#2de3fc",
          foreground: "#0d1618",
        },
        background: "#0d1618",
        foreground: "#dcf0f3",
        card: {
          DEFAULT: "#132629",
          foreground: "#dcf0f3",
        },
        popover: {
          DEFAULT: "#132629",
          foreground: "#dcf0f3",
        },
        muted: {
          DEFAULT: "#1a3337",
          foreground: "#a7d8df",
        },
        destructive: {
          DEFAULT: "#ff6b6b",
          foreground: "#0d1618",
        },
        border: "#1a3337",
        input: "#1a3337",
        ring: "#84dfeb",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
