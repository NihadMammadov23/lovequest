"use client";

import { useEffect, useRef, useState } from "react";
import type { BoyfriendConfig, GirlfriendConfig } from "@/config/gameConfig";
import { CHAR_H, CHAR_W, BOSS_SIZE, drawBoss, drawBoy, drawGirl, type BossMood, type Pose } from "@/game/art/characters";
import { canvasOf } from "@/game/art/draw";
import { cloudLayerCanvas, CLOUD_PRESETS, skyCanvas } from "@/game/art/scenery";
import * as S from "@/game/art/sprites";
import type { Equipped } from "@/lib/types";

const cache = new Map<string, string>();

/** Pixel-art icons are drawn once with canvas and cached as data URLs. */
const ICONS: Record<string, () => HTMLCanvasElement> = {
  heart: () => S.heartCanvas("pink"),
  heartGold: () => S.heartCanvas("gold"),
  heartMint: () => S.heartCanvas("mint"),
  heartEmpty: () =>
    canvasOf(9, 8, (g) => {
      g.drawImage(S.heartCanvas("pink"), 0, 0);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = "#3a2a66";
      g.fillRect(0, 0, 9, 8);
    }),
  sparkle: S.sparkleCanvas,
  icecream: S.iceCreamCanvas,
  donut: S.donutCanvas,
  cookie: S.cookieCanvas,
  cupcake: S.cupcakeCanvas,
  pizza: () => S.pizzaCanvas(12),
  burger: S.burgerCanvas,
  key: S.keyCanvas,
  moon: S.moonIconCanvas,
  flower: S.flowerCanvas,
  gift: S.giftCanvas,
  cat: S.catCanvas,
  cardBack: S.cardBackCanvas,
  lock: S.lockCanvas,
  trophyGold: () => S.trophyCanvas("#ffd84d"),
  trophySilver: () => S.trophyCanvas("#d4dbe8"),
  trophyBronze: () => S.trophyCanvas("#d98a4a"),
  trophyNone: () => S.trophyCanvas("#4a3a78"),
  broccoli: S.broccoliCanvas,
  cloud: S.cloudEnemyCanvas,
};

export type IconName = keyof typeof ICONS;

export function iconUrl(name: IconName): string {
  const hit = cache.get(name);
  if (hit) return hit;
  const url = ICONS[name]().toDataURL();
  cache.set(name, url);
  return url;
}

/** Renders a cached pixel icon. Draws on the client only (no SSR canvas). */
export function PixelIcon({ name, size = 24, className = "", alt = "" }: { name: IconName; size?: number; className?: string; alt?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => setSrc(iconUrl(name)), [name]);
  const c = ICONS_SIZE[name] ?? [10, 10];
  const w = size;
  const h = Math.round((size * c[1]) / c[0]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} width={w} height={h} alt={alt} aria-hidden={alt ? undefined : true} className={`pixelated inline-block ${className}`} draggable={false} /> : <span style={{ width: w, height: h }} className="inline-block" />;
}

const ICONS_SIZE: Record<string, [number, number]> = {
  heart: [9, 8],
  heartGold: [9, 8],
  heartMint: [9, 8],
  heartEmpty: [9, 8],
  sparkle: [7, 7],
  icecream: [9, 11],
  donut: [10, 10],
  cookie: [10, 10],
  cupcake: [10, 11],
  pizza: [12, 12],
  burger: [14, 12],
  key: [12, 7],
  moon: [10, 10],
  flower: [10, 10],
  gift: [10, 10],
  cat: [10, 10],
  cardBack: [12, 12],
  lock: [10, 11],
  trophyGold: [14, 14],
  trophySilver: [14, 14],
  trophyBronze: [14, 14],
  trophyNone: [14, 14],
  broccoli: [10, 11],
  cloud: [20, 14],
};

type CharacterProps =
  | { who: "girl"; look: GirlfriendConfig["look"]; cosmetics: Equipped; pose?: Pose; frame?: number; scale?: number; label?: string }
  | { who: "boy"; look: BoyfriendConfig["look"]; beard: boolean; wristband: boolean; pose?: Pose; frame?: number; scale?: number; label?: string }
  | { who: "boss"; look: BoyfriendConfig["look"]; beard: boolean; wristband: boolean; mood: BossMood; scale?: number; label?: string };

/** A character portrait drawn with the same procedural art the game uses. */
export function CharacterCanvas(props: CharacterProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const scale = props.scale ?? 6;
  const isBoss = props.who === "boss";
  const w = isBoss ? BOSS_SIZE : CHAR_W;
  const h = isBoss ? BOSS_SIZE : CHAR_H;
  const key = JSON.stringify(props);

  useEffect(() => {
    const c = ref.current;
    const g = c?.getContext("2d");
    if (!c || !g) return;
    g.clearRect(0, 0, w, h);
    g.imageSmoothingEnabled = false;
    if (props.who === "girl") drawGirl(g, { look: props.look, cosmetics: props.cosmetics }, props.pose ?? "idle", props.frame ?? 0);
    else if (props.who === "boy") drawBoy(g, { look: props.look, beard: props.beard, wristband: props.wristband }, props.pose ?? "idle", props.frame ?? 0);
    else drawBoss(g, { look: props.look, beard: props.beard, wristband: props.wristband }, props.mood);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <canvas
      ref={ref}
      width={w}
      height={h}
      role="img"
      aria-label={props.label ?? "Character"}
      className="pixelated"
      style={{ width: w * scale, height: h * scale }}
    />
  );
}

/** Sky + three cloud banks as a drifting full-bleed background. */
export function ScenicBackground({ dim = false }: { dim?: boolean }) {
  const [urls, setUrls] = useState<{ sky: string; layers: string[] } | null>(null);
  useEffect(() => {
    setUrls({
      sky: skyCanvas(480, 270, { seed: 5, shootingStar: true, moonX: 0.86, moonY: 0.2 }).toDataURL(),
      layers: CLOUD_PRESETS.map((p) => cloudLayerCanvas(480, 270, p).toDataURL()),
    });
  }, []);
  const speeds = [140, 100, 70, 48];
  return (
    <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden bg-[#140a2e]">
      {urls && (
        <>
          <div
            className="absolute inset-0 pixelated"
            style={{ backgroundImage: `url(${urls.sky})`, backgroundSize: "100% 100%", imageRendering: "pixelated" }}
          />
          {urls.layers.map((src, i) => (
            <div key={i} className="absolute inset-0 overflow-hidden" style={{ opacity: 0.95 }}>
              <div className="lq-cloud-track" style={{ animationDuration: `${speeds[i]}s`, animationDirection: i % 2 ? "reverse" : "normal" }}>
                {[0, 1, 2].map((k) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={k} src={src} alt="" draggable={false} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
      {dim && <div className="absolute inset-0 bg-[#140a2e]/60" />}
    </div>
  );
}
