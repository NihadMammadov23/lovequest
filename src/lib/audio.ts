/**
 * Original chiptune audio, synthesised with the Web Audio API (no audio files needed).
 * The AudioContext is only created after a user gesture (see `audio.unlock()`).
 */

export type SfxName =
  | "collect"
  | "jump"
  | "land"
  | "correct"
  | "wrong"
  | "hurt"
  | "achievement"
  | "win"
  | "bossDefeat"
  | "click"
  | "shoot"
  | "hit"
  | "combo"
  | "secret"
  | "key"
  | "door"
  | "warn"
  | "lose";

export type MusicName = "menu" | "maze" | "level" | "arcade" | "boss" | "ending";

interface Tone {
  f: number; // start frequency (Hz)
  d: number; // duration (s)
  t?: OscillatorType;
  v?: number; // 0..1
  to?: number; // end frequency (slide)
  at?: number; // delay (s)
}

const SFX: Record<SfxName, Tone[]> = {
  collect: [
    { f: 988, d: 0.06, t: "square", v: 0.5 },
    { f: 1319, d: 0.12, t: "square", v: 0.5, at: 0.06 },
  ],
  jump: [{ f: 260, to: 560, d: 0.14, t: "square", v: 0.4 }],
  land: [{ f: 140, to: 60, d: 0.08, t: "triangle", v: 0.6 }],
  correct: [
    { f: 523, d: 0.09, t: "square", v: 0.45 },
    { f: 659, d: 0.09, t: "square", v: 0.45, at: 0.09 },
    { f: 784, d: 0.09, t: "square", v: 0.45, at: 0.18 },
    { f: 1047, d: 0.2, t: "square", v: 0.45, at: 0.27 },
  ],
  wrong: [
    { f: 200, to: 120, d: 0.18, t: "sawtooth", v: 0.4 },
    { f: 150, to: 80, d: 0.25, t: "sawtooth", v: 0.4, at: 0.16 },
  ],
  hurt: [{ f: 420, to: 90, d: 0.28, t: "sawtooth", v: 0.5 }],
  achievement: [
    { f: 784, d: 0.1, t: "square", v: 0.4 },
    { f: 988, d: 0.1, t: "square", v: 0.4, at: 0.1 },
    { f: 1175, d: 0.1, t: "square", v: 0.4, at: 0.2 },
    { f: 1568, d: 0.35, t: "triangle", v: 0.6, at: 0.3 },
  ],
  win: [
    { f: 523, d: 0.12, t: "square", v: 0.45 },
    { f: 659, d: 0.12, t: "square", v: 0.45, at: 0.12 },
    { f: 784, d: 0.12, t: "square", v: 0.45, at: 0.24 },
    { f: 1047, d: 0.12, t: "square", v: 0.45, at: 0.36 },
    { f: 784, d: 0.12, t: "square", v: 0.45, at: 0.48 },
    { f: 1047, d: 0.4, t: "triangle", v: 0.7, at: 0.6 },
  ],
  bossDefeat: [
    { f: 880, to: 110, d: 0.6, t: "sawtooth", v: 0.5 },
    { f: 523, d: 0.15, t: "square", v: 0.45, at: 0.65 },
    { f: 659, d: 0.15, t: "square", v: 0.45, at: 0.8 },
    { f: 784, d: 0.15, t: "square", v: 0.45, at: 0.95 },
    { f: 1047, d: 0.5, t: "triangle", v: 0.7, at: 1.1 },
  ],
  click: [{ f: 660, d: 0.04, t: "square", v: 0.3 }],
  shoot: [{ f: 900, to: 1500, d: 0.08, t: "triangle", v: 0.4 }],
  hit: [{ f: 300, to: 150, d: 0.1, t: "square", v: 0.5 }],
  combo: [{ f: 1200, to: 1800, d: 0.1, t: "triangle", v: 0.45 }],
  secret: [
    { f: 1047, d: 0.1, t: "triangle", v: 0.6 },
    { f: 1319, d: 0.1, t: "triangle", v: 0.6, at: 0.1 },
    { f: 1568, d: 0.1, t: "triangle", v: 0.6, at: 0.2 },
    { f: 2093, d: 0.4, t: "triangle", v: 0.6, at: 0.3 },
  ],
  key: [
    { f: 784, d: 0.07, t: "square", v: 0.4 },
    { f: 1568, d: 0.18, t: "square", v: 0.4, at: 0.07 },
  ],
  door: [{ f: 180, to: 360, d: 0.25, t: "triangle", v: 0.6 }],
  warn: [{ f: 440, d: 0.07, t: "square", v: 0.25 }],
  lose: [
    { f: 392, d: 0.18, t: "triangle", v: 0.6 },
    { f: 330, d: 0.18, t: "triangle", v: 0.6, at: 0.18 },
    { f: 262, d: 0.4, t: "triangle", v: 0.6, at: 0.36 },
  ],
};

interface Track {
  bpm: number;
  /** Chord roots (MIDI), one chord per bar of 8 steps. */
  roots: number[];
  minor: boolean;
  /** Arpeggio pattern of 8 steps; values index the chord tones [root, third, fifth, octave], -1 = rest. */
  arp: number[];
  lead: OscillatorType;
  leadVol: number;
  bassVol: number;
  /** Octave shift of the arpeggio relative to the chord root. */
  shift: number;
}

const TRACKS: Record<MusicName, Track> = {
  menu: { bpm: 92, roots: [57, 53, 48, 55], minor: true, arp: [0, 1, 2, 1, 3, 2, 1, 2], lead: "triangle", leadVol: 0.9, bassVol: 0.7, shift: 12 },
  maze: { bpm: 84, roots: [50, 46, 53, 48], minor: true, arp: [0, -1, 2, 1, 3, -1, 2, 1], lead: "triangle", leadVol: 0.8, bassVol: 0.6, shift: 12 },
  level: { bpm: 126, roots: [48, 55, 57, 53], minor: false, arp: [0, 2, 1, 2, 3, 2, 1, -1], lead: "square", leadVol: 0.45, bassVol: 0.7, shift: 12 },
  arcade: { bpm: 144, roots: [53, 48, 55, 57], minor: false, arp: [0, 1, 3, 1, 0, 2, 3, 2], lead: "square", leadVol: 0.4, bassVol: 0.7, shift: 12 },
  boss: { bpm: 150, roots: [45, 45, 41, 43], minor: true, arp: [0, 0, 2, 0, 1, 0, 3, 2], lead: "sawtooth", leadVol: 0.28, bassVol: 0.8, shift: 12 },
  ending: { bpm: 72, roots: [48, 53, 55, 52], minor: false, arp: [0, 1, 2, 3, 2, 1, 2, 1], lead: "triangle", leadVol: 0.9, bassVol: 0.5, shift: 12 },
};

const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private muted = false;
  private musicVol = 0.5;
  private sfxVol = 0.7;
  private track: MusicName | null = null;
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Must be called from a user gesture (click, key, touch). Safe to call many times. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      try {
        this.ctx = new Ctor();
      } catch {
        return;
      }
      this.master = this.ctx.createGain();
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.track && !this.timer) this.startScheduler();
  }

  configure(settings: { muted: boolean; music: number; sfx: number }): void {
    this.muted = settings.muted;
    this.musicVol = settings.music;
    this.sfxVol = settings.sfx;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.master || !this.sfxBus || !this.musicBus) return;
    this.master.gain.value = this.muted ? 0 : 1;
    this.sfxBus.gain.value = this.sfxVol * 0.5;
    this.musicBus.gain.value = this.musicVol * 0.22;
  }

  sfx(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxBus || this.muted || this.sfxVol <= 0) return;
    const t0 = ctx.currentTime;
    for (const tone of SFX[name]) this.playTone(this.sfxBus, tone.f, t0 + (tone.at ?? 0), tone.d, tone.t ?? "square", tone.v ?? 0.5, tone.to);
  }

  private playTone(dest: AudioNode, f: number, when: number, dur: number, type: OscillatorType, vol: number, to?: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f, when);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), when + dur);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.03);
  }

  playMusic(name: MusicName | null): void {
    if (this.track === name) return;
    this.track = name;
    this.step = 0;
    if (!name) {
      this.stopScheduler();
      return;
    }
    if (this.ctx) {
      this.nextTime = this.ctx.currentTime + 0.08;
      this.startScheduler();
    }
  }

  stopMusic(): void {
    this.playMusic(null);
  }

  private startScheduler(): void {
    if (this.timer || !this.ctx) return;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 70);
  }

  private stopScheduler(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const ctx = this.ctx;
    if (!ctx || !this.track || !this.musicBus) return;
    const track = TRACKS[this.track];
    const stepDur = 60 / track.bpm / 2;
    if (this.nextTime < ctx.currentTime - 0.1) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.3) {
      this.scheduleStep(track, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step += 1;
    }
  }

  private scheduleStep(track: Track, step: number, when: number, stepDur: number): void {
    const bus = this.musicBus;
    if (!bus) return;
    const bar = Math.floor(step / 8) % track.roots.length;
    const inBar = step % 8;
    const root = track.roots[bar];
    const tones = [root, root + (track.minor ? 3 : 4), root + 7, root + 12];
    const a = track.arp[inBar];
    if (a >= 0) this.playTone(bus, midiToHz(tones[a] + track.shift), when, stepDur * 0.9, track.lead, track.leadVol * 0.5);
    if (inBar === 0 || inBar === 4) this.playTone(bus, midiToHz(root - 12), when, stepDur * 1.8, "triangle", track.bassVol * 0.9);
    else if (inBar === 2 || inBar === 6) this.playTone(bus, midiToHz(root - 5), when, stepDur * 0.9, "triangle", track.bassVol * 0.5);
  }
}

export const audio = new AudioEngine();
