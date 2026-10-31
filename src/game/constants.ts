/** Internal game resolution. The canvas is scaled (FIT) with nearest-neighbour filtering. */
export const GAME_W = 480;
export const GAME_H = 270;

export const FONT = "'Press Start 2P', 'VT323', monospace";
export const FONT_BODY = "'VT323', monospace";

export const COLORS = {
  night: 0x140a2e,
  deepPurple: 0x2a0f5c,
  purple: 0x4b1d96,
  violet: 0x6a3cc9,
  lavender: 0xa98bff,
  mist: 0xd9ccff,
  heart: 0xff5c8a,
  coral: 0xff8a7a,
  peach: 0xffd2a8,
  mint: 0x7dffcf,
  star: 0xffe94d,
  white: 0xffffff,
  ink: 0x24120a,
} as const;

export const HEX = {
  night: "#140a2e",
  heart: "#ff5c8a",
  peach: "#ffd2a8",
  mint: "#7dffcf",
  star: "#ffe94d",
  white: "#ffffff",
  lavender: "#a98bff",
} as const;
