import { canvasOf, dot, grid, rect, shade, type Ctx } from "./draw";

/** Filled disc (or ring when r0 > 0) in pixel coordinates. */
export function disc(g: Ctx, cx: number, cy: number, r1: number, color: string, r0 = 0): void {
  const R = Math.ceil(r1) + 1;
  for (let y = Math.floor(cy - R); y <= cy + R; y++) {
    for (let x = Math.floor(cx - R); x <= cx + R; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r1 && d >= r0) dot(g, x, y, color);
    }
  }
}

export const HEART_ROWS = [
  ".rrr.rrr.",
  "rwwrrrrrr",
  "rwrrrrrrd",
  "rrrrrrrdd",
  ".rrrrrdd.",
  "..rrrdd..",
  "...rdd...",
  "....d....",
];

export function heartCanvas(kind: "pink" | "gold" | "mint" = "pink"): HTMLCanvasElement {
  const pal =
    kind === "gold"
      ? { r: "#ffe94d", w: "#fffbd0", d: "#e0a000" }
      : kind === "mint"
        ? { r: "#7dffcf", w: "#e0fff4", d: "#2fb88d" }
        : { r: "#ff5c8a", w: "#ffc2d6", d: "#c4306a" };
  return canvasOf(9, 8, (g) => grid(g, 0, 0, HEART_ROWS, pal));
}

export function sparkleCanvas(): HTMLCanvasElement {
  return canvasOf(7, 7, (g) =>
    grid(
      g,
      0,
      0,
      ["...y...", "...y...", "..yyy..", "yyywyyy", "..yyy..", "...y...", "...y..."],
      { y: "#ffe94d", w: "#ffffff" },
    ),
  );
}

export function iceCreamCanvas(): HTMLCanvasElement {
  return canvasOf(9, 11, (g) =>
    grid(
      g,
      0,
      0,
      [
        "...ppp...",
        "..pwppp..",
        ".ppppppp.",
        ".mmmmmmm.",
        ".mwmmmmm.",
        "..mmmmm..",
        "..ccccc..",
        "...cdcc..",
        "...ccdc..",
        "....cc...",
        "....d....",
      ],
      { p: "#ff8fb8", w: "#ffffff", m: "#7dffcf", c: "#e0a35a", d: "#b9783a" },
    ),
  );
}

export function donutCanvas(): HTMLCanvasElement {
  return canvasOf(10, 10, (g) => {
    disc(g, 5, 5, 4.9, "#e0a35a");
    disc(g, 5, 4.6, 4.6, "#ff8fb8");
    disc(g, 5, 5, 1.6, "#000000");
    g.clearRect(4, 4, 2, 2);
    [
      [2, 3],
      [7, 3],
      [3, 7],
      [7, 6],
      [5, 1],
    ].forEach(([x, y], i) => dot(g, x, y, ["#7dffcf", "#fff6a8", "#ffffff"][i % 3]));
  });
}

export function cookieCanvas(): HTMLCanvasElement {
  return canvasOf(10, 10, (g) => {
    disc(g, 5, 5, 4.9, "#c98a4a");
    disc(g, 5, 5, 4.2, "#e0a35a");
    [
      [3, 3],
      [6, 3],
      [4, 6],
      [7, 6],
      [5, 4],
    ].forEach(([x, y]) => rect(g, x, y, 1, 1, "#5a2e17"));
  });
}

export function cupcakeCanvas(): HTMLCanvasElement {
  return canvasOf(10, 11, (g) => {
    rect(g, 4, 0, 2, 2, "#ff3d3d");
    rect(g, 3, 2, 4, 2, "#ffb3d1");
    rect(g, 2, 4, 6, 2, "#ff8fb8");
    rect(g, 1, 6, 8, 1, "#ffb3d1");
    rect(g, 1, 7, 8, 4, "#7dffcf");
    rect(g, 2, 10, 6, 1, "#2fb88d");
    [2, 4, 6, 8].forEach((x) => rect(g, x, 7, 1, 4, "#4fd9a8"));
    dot(g, 4, 3, "#ffffff");
  });
}

export function pizzaCanvas(size = 12): HTMLCanvasElement {
  return canvasOf(size, size, (g) => {
    for (let y = 0; y < size; y++) {
      const w = Math.max(1, size - Math.floor(y * (size / (size - 1))));
      const x0 = Math.floor((size - w) / 2);
      rect(g, x0, y, w, 1, y < 2 ? "#e0a35a" : "#ffd84d");
    }
    const spots: [number, number][] = [
      [Math.floor(size * 0.38), 3],
      [Math.floor(size * 0.58), 4],
      [Math.floor(size * 0.46), 7],
    ];
    spots.forEach(([x, y]) => rect(g, x, y, 2, 2, "#d9302f"));
  });
}

export function burgerCanvas(): HTMLCanvasElement {
  return canvasOf(14, 12, (g) => {
    rect(g, 3, 0, 8, 1, "#e0a35a");
    rect(g, 1, 1, 12, 1, "#e0a35a");
    rect(g, 0, 2, 14, 3, "#e0a35a");
    rect(g, 0, 4, 14, 1, "#c98a4a");
    [
      [3, 1],
      [7, 2],
      [10, 1],
      [5, 3],
      [11, 3],
    ].forEach(([x, y]) => dot(g, x, y, "#fff6c8"));
    rect(g, 0, 5, 14, 1, "#7bd85a");
    [1, 4, 7, 10].forEach((x) => rect(g, x, 6, 2, 1, "#7bd85a"));
    rect(g, 0, 7, 14, 2, "#7a4220");
    rect(g, 1, 9, 12, 1, "#ffd84d");
    rect(g, 0, 10, 14, 2, "#e0a35a");
  });
}

export function drumstickCanvas(): HTMLCanvasElement {
  return canvasOf(12, 12, (g) => {
    disc(g, 4.5, 4.5, 4.4, "#b8622a");
    disc(g, 4, 4, 3, "#d9843c");
    rect(g, 7, 7, 3, 2, "#fff6e0");
    rect(g, 9, 9, 3, 3, "#fff6e0");
    dot(g, 3, 3, "#f2b06a");
  });
}

export function broccoliCanvas(): HTMLCanvasElement {
  return canvasOf(10, 11, (g) => {
    disc(g, 2.8, 4, 2.9, "#3f9a3a");
    disc(g, 7.2, 4, 2.9, "#3f9a3a");
    disc(g, 5, 2.8, 3.2, "#4fbf48");
    rect(g, 4, 6, 3, 5, "#9bd36a");
    dot(g, 3, 2, "#7ddc6e");
    dot(g, 7, 3, "#2e7a2c");
    dot(g, 2, 5, "#2e7a2c");
  });
}

export function sockCanvas(): HTMLCanvasElement {
  return canvasOf(10, 11, (g) => {
    rect(g, 2, 0, 5, 7, "#c9d6ff");
    rect(g, 2, 6, 8, 4, "#c9d6ff");
    rect(g, 2, 1, 5, 1, "#ff8fb8");
    rect(g, 2, 3, 5, 1, "#ff8fb8");
    rect(g, 7, 7, 3, 3, "#8aa0e0");
    rect(g, 2, 9, 8, 1, "#8aa0e0");
  });
}

export function pillowCanvas(): HTMLCanvasElement {
  return canvasOf(22, 13, (g) => {
    rect(g, 3, 0, 16, 13, "#f3ecff");
    rect(g, 1, 2, 20, 9, "#f3ecff");
    rect(g, 0, 4, 22, 5, "#f3ecff");
    rect(g, 3, 11, 16, 2, "#c9b8f5");
    rect(g, 1, 10, 20, 1, "#c9b8f5");
    rect(g, 0, 8, 1, 1, "#c9b8f5");
    rect(g, 21, 8, 1, 1, "#c9b8f5");
    rect(g, 4, 3, 14, 1, "#ffc2d6");
    rect(g, 4, 9, 14, 1, "#ffc2d6");
    [
      [3, 2],
      [18, 2],
    ].forEach(([x, y]) => dot(g, x, y, "#ffffff"));
  });
}

export function keyCanvas(): HTMLCanvasElement {
  return canvasOf(12, 7, (g) => {
    disc(g, 3, 3.5, 3, "#ffd84d");
    disc(g, 3, 3.5, 1.2, "#000000");
    g.clearRect(2, 3, 2, 1);
    rect(g, 6, 3, 6, 1, "#ffd84d");
    rect(g, 6, 4, 6, 1, "#e0a000");
    rect(g, 9, 5, 1, 2, "#ffd84d");
    rect(g, 11, 5, 1, 2, "#ffd84d");
    dot(g, 2, 1, "#fffbd0");
  });
}

export function spikeCanvas(): HTMLCanvasElement {
  return canvasOf(16, 9, (g) => {
    [0, 8].forEach((x0) => {
      for (let y = 0; y < 9; y++) {
        const w = Math.min(8, 1 + Math.floor((y * 8) / 8.5) + (y > 6 ? 1 : 0));
        const wc = Math.max(2, w - (w % 2));
        const sx = x0 + Math.floor((8 - wc) / 2);
        rect(g, sx, y, wc, 1, y < 3 ? "#ffb4a8" : y < 6 ? "#ff6b6b" : "#c93a4a");
      }
    });
    rect(g, 0, 8, 16, 1, "#8a1f36");
  });
}

export function cloudEnemyCanvas(): HTMLCanvasElement {
  return canvasOf(20, 14, (g) => {
    disc(g, 5.5, 8.5, 4.6, "#5b3a96");
    disc(g, 14.5, 8.5, 4.6, "#5b3a96");
    disc(g, 10, 6, 5.6, "#6e4aad");
    rect(g, 3, 9, 14, 4, "#5b3a96");
    rect(g, 4, 12, 12, 1, "#3d2370");
    // angry face
    rect(g, 6, 6, 3, 3, "#ffffff");
    rect(g, 11, 6, 3, 3, "#ffffff");
    rect(g, 7, 7, 2, 2, "#1a0f1f");
    rect(g, 11, 7, 2, 2, "#1a0f1f");
    rect(g, 5, 5, 4, 1, "#1a0f1f");
    rect(g, 11, 5, 4, 1, "#1a0f1f");
    dot(g, 9, 6, "#1a0f1f");
    dot(g, 10, 6, "#1a0f1f");
    rect(g, 8, 11, 4, 1, "#1a0f1f");
    dot(g, 7, 12, "#1a0f1f");
    dot(g, 12, 12, "#1a0f1f");
    // little lightning
    rect(g, 9, 13, 1, 1, "#ffe94d");
  });
}

export function flagCanvas(active: boolean): HTMLCanvasElement {
  return canvasOf(12, 20, (g) => {
    rect(g, 1, 0, 1, 20, "#d9ccff");
    rect(g, 0, 19, 4, 1, "#a98bff");
    if (active) {
      rect(g, 2, 1, 9, 6, "#ff5c8a");
      rect(g, 2, 6, 7, 1, "#c4306a");
      dot(g, 4, 2, "#ffc2d6");
      rect(g, 4, 3, 3, 1, "#ffffff");
    } else {
      rect(g, 2, 1, 9, 6, "#7a6aa8");
      rect(g, 2, 6, 7, 1, "#5a4a88");
    }
  });
}

/** The glowing heart arch at the end of Level 1 and the maze exit. */
export function archCanvas(): HTMLCanvasElement {
  return canvasOf(26, 34, (g) => {
    rect(g, 0, 8, 4, 26, "#a98bff");
    rect(g, 22, 8, 4, 26, "#a98bff");
    rect(g, 4, 4, 18, 4, "#a98bff");
    rect(g, 2, 6, 2, 2, "#a98bff");
    rect(g, 22, 6, 2, 2, "#a98bff");
    rect(g, 4, 8, 18, 26, "#2a0f5c");
    rect(g, 0, 8, 1, 26, "#d9ccff");
    rect(g, 25, 8, 1, 26, "#7f55d8");
    // glowing heart inside
    g.save();
    g.translate(8, 14);
    grid(g, 0, 0, [".rrr.rrr.", "rwwrrrrrr", "rwrrrrrrd", "rrrrrrrdd", ".rrrrrdd.", "..rrrdd..", "...rdd...", "....d...."], {
      r: "#ff5c8a",
      w: "#ffc2d6",
      d: "#c4306a",
    });
    g.restore();
    rect(g, 10, 2, 6, 2, "#ffe94d");
  });
}

export function lockedDoorCanvas(): HTMLCanvasElement {
  return canvasOf(16, 16, (g) => {
    rect(g, 0, 0, 16, 16, "#2a0f5c");
    rect(g, 1, 0, 14, 16, "#6a3cc9");
    rect(g, 1, 0, 14, 2, "#a98bff");
    rect(g, 2, 3, 5, 12, "#5a2db8");
    rect(g, 9, 3, 5, 12, "#5a2db8");
    rect(g, 7, 7, 2, 5, "#2a0f5c");
    // padlock
    rect(g, 6, 7, 4, 4, "#ffd84d");
    rect(g, 7, 5, 2, 2, "#e0a000");
    dot(g, 8, 8, "#2a0f5c");
    dot(g, 8, 9, "#2a0f5c");
  });
}

export function stationCanvas(kind: "quiz" | "cards"): HTMLCanvasElement {
  return canvasOf(16, 22, (g) => {
    // pedestal
    rect(g, 2, 14, 12, 8, "#a98bff");
    rect(g, 2, 14, 12, 2, "#d9ccff");
    rect(g, 2, 20, 12, 2, "#6a3cc9");
    // glow sign
    rect(g, 3, 0, 10, 13, "#2a0f5c");
    rect(g, 4, 1, 8, 11, kind === "quiz" ? "#ff5c8a" : "#7dffcf");
    if (kind === "quiz") {
      grid(g, 6, 2, ["yyyy", "...y", "..yy", ".y..", ".y..", "....", ".y.."], { y: "#ffffff" });
    } else {
      rect(g, 5, 3, 3, 5, "#ffffff");
      rect(g, 8, 5, 3, 5, "#ffe94d");
      dot(g, 6, 5, "#ff5c8a");
      dot(g, 9, 7, "#ff5c8a");
    }
  });
}

export function exitPortalCanvas(): HTMLCanvasElement {
  return archCanvas();
}

export function heartMiniCanvas(): HTMLCanvasElement {
  return canvasOf(5, 5, (g) => grid(g, 0, 0, [".r.r.", "rrrrr", "rrrrr", ".rrr.", "..r.."], { r: "#ff5c8a" }));
}

export function pixelCanvas(color = "#ffffff", size = 2): HTMLCanvasElement {
  return canvasOf(size, size, (g) => rect(g, 0, 0, size, size, color));
}

export function moonIconCanvas(): HTMLCanvasElement {
  return canvasOf(10, 10, (g) => {
    disc(g, 5, 5, 4.6, "#ffe94d");
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (Math.hypot(x + 0.5 - 7, y + 0.5 - 3.5) <= 4.4) g.clearRect(x, y, 1, 1);
      }
    }
  });
}

export function flowerCanvas(): HTMLCanvasElement {
  return canvasOf(10, 10, (g) => {
    [
      [5, 2],
      [8, 5],
      [5, 8],
      [2, 5],
    ].forEach(([x, y]) => disc(g, x, y, 2.1, "#ff8fb8"));
    disc(g, 5, 5, 1.8, "#ffe94d");
  });
}

export function giftCanvas(): HTMLCanvasElement {
  return canvasOf(10, 10, (g) => {
    rect(g, 1, 3, 8, 6, "#7dffcf");
    rect(g, 0, 2, 10, 2, "#4fd9a8");
    rect(g, 4, 2, 2, 8, "#ff5c8a");
    rect(g, 2, 0, 3, 2, "#ff5c8a");
    rect(g, 5, 0, 3, 2, "#ff5c8a");
  });
}

export function catCanvas(): HTMLCanvasElement {
  return canvasOf(10, 10, (g) => {
    rect(g, 1, 1, 2, 3, "#a98bff");
    rect(g, 7, 1, 2, 3, "#a98bff");
    rect(g, 1, 3, 8, 6, "#a98bff");
    rect(g, 2, 9, 6, 1, "#a98bff");
    rect(g, 3, 5, 1, 2, "#1a0f1f");
    rect(g, 6, 5, 1, 2, "#1a0f1f");
    dot(g, 4, 7, "#ff8fb8");
    dot(g, 5, 7, "#ff8fb8");
  });
}

export function cardBackCanvas(): HTMLCanvasElement {
  return canvasOf(12, 12, (g) => {
    rect(g, 0, 0, 12, 12, "#ffd2a8");
    rect(g, 1, 1, 10, 10, "#ff5c8a");
    rect(g, 2, 2, 8, 8, "#c4306a");
    for (let i = 0; i < 4; i++) dot(g, 3 + i * 2, 3 + ((i % 2) * 2), "#ffc2d6");
    grid(g, 3, 4, [".r.r.", "rrrrr", ".rrr.", "..r.."], { r: "#ffc2d6" });
  });
}

export function trophyCanvas(color = "#ffd84d"): HTMLCanvasElement {
  const dark = shade(color, -0.3);
  const light = shade(color, 0.5);
  return canvasOf(14, 14, (g) => {
    rect(g, 3, 0, 8, 6, color);
    rect(g, 4, 6, 6, 2, color);
    rect(g, 0, 1, 3, 4, dark);
    rect(g, 11, 1, 3, 4, dark);
    rect(g, 1, 2, 1, 2, "#000000");
    g.clearRect(1, 2, 1, 2);
    g.clearRect(12, 2, 1, 2);
    rect(g, 6, 8, 2, 3, dark);
    rect(g, 3, 11, 8, 3, color);
    rect(g, 3, 13, 8, 1, dark);
    dot(g, 4, 1, light);
    dot(g, 4, 2, light);
  });
}

export function lockCanvas(): HTMLCanvasElement {
  return canvasOf(10, 11, (g) => {
    rect(g, 2, 0, 6, 2, "#8a8aa8");
    rect(g, 2, 2, 2, 3, "#8a8aa8");
    rect(g, 6, 2, 2, 3, "#8a8aa8");
    rect(g, 0, 4, 10, 7, "#5a5a78");
    rect(g, 4, 6, 2, 3, "#2a2a40");
  });
}

export function waveCanvas(): HTMLCanvasElement {
  return canvasOf(12, 10, (g) =>
    grid(
      g,
      0,
      0,
      [
        ".....rr.....",
        "....rrrr....",
        "....rwwr....",
        "...rrwwrr...",
        "...rwwwwr...",
        "..rrwwwwrr..",
        "..rrrwwrrr..",
        ".rrrrrrrrrr.",
        "rrrrrrrrrrrr",
        "dddddddddddd",
      ],
      { r: "#ff5c8a", w: "#ffe0ec", d: "#c4306a" },
    ),
  );
}

export function warnCanvas(): HTMLCanvasElement {
  return canvasOf(7, 11, (g) =>
    grid(g, 0, 0, ["..rrr..", ".rrrrr.", ".rrwrr.", ".rrwrr.", ".rrwrr.", "..rwr..", "..rwr..", ".......", "..rrr..", ".rrwrr.", "..rrr.."], {
      r: "#ff4f6d",
      w: "#ffffff",
    }),
  );
}
