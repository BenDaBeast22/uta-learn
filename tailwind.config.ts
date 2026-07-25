import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#171B26",
          soft: "#20263A",
          line: "#2C3348",
        },
        paper: {
          DEFAULT: "#E9E2D0",
          dim: "#DED5BE",
        },
        seal: {
          DEFAULT: "#B23A32",
          soft: "#C9564C",
        },
        gold: {
          DEFAULT: "#C6A15B",
          soft: "#D9C08C",
        },
      },
      fontFamily: {
        display: [
          "'Hiragino Mincho ProN'",
          "'Yu Mincho'",
          "'Noto Serif JP'",
          "Georgia",
          "serif",
        ],
        body: [
          "'Hiragino Sans'",
          "'Yu Gothic'",
          "'Noto Sans JP'",
          "-apple-system",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      backgroundImage: {
        washi:
          "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.05), transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.04), transparent 45%)",
      },
      boxShadow: {
        card: "0 1px 0 rgba(255,255,255,0.06) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
        tag: "0 12px 30px -12px rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
