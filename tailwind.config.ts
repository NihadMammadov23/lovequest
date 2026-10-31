import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: "#140a2e",
        dusk: "#2a0f5c",
        plum: "#4b1d96",
        lavender: "#a98bff",
        mist: "#d9ccff",
        heart: "#ff5c8a",
        coral: "#ff8a7a",
        peach: "#ffd2a8",
        mint: "#7dffcf",
        star: "#ffe94d",
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', '"VT323"', "monospace"],
        body: ['"VT323"', "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
