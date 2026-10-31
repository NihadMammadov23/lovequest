import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Client-only initialisation (matchMedia, canvas data-URLs, typewriter resets) intentionally
    // sets state on mount; the app is a client-rendered game, so this rule is too strict here.
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
