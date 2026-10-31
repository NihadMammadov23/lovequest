export type Action = "left" | "right" | "up" | "down" | "jump" | "action";

const KEYS: Record<Action, string[]> = {
  left: ["ArrowLeft", "KeyA"],
  right: ["ArrowRight", "KeyD"],
  up: ["ArrowUp", "KeyW"],
  down: ["ArrowDown", "KeyS"],
  jump: ["Space", "ArrowUp", "KeyW"],
  action: ["KeyE", "KeyJ", "KeyK", "ShiftLeft", "ShiftRight"],
};

const GAME_KEYS = new Set(Object.values(KEYS).flat());
const ACTIONS = Object.keys(KEYS) as Action[];

/** True when the keyboard focus is somewhere the player is typing text. */
export function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  // Every <input> counts: text fields obviously, but also range sliders, where the
  // arrow keys must adjust the slider and never move the character.
  return tag === "INPUT";
}

/**
 * Keyboard + touch input shared by every scene.
 * - Attach once per game session, detach on unmount (no leaked listeners).
 * - Ignores keys while the player types in a form field.
 * - Clears everything on blur/visibility change so movement can never get "stuck".
 */
export class InputManager {
  private pressed = new Set<string>();
  private touch: Record<Action, boolean> = { left: false, right: false, up: false, down: false, jump: false, action: false };
  private pressedAt: Record<Action, number> = { left: 0, right: 0, up: 0, down: 0, jump: 0, action: 0 };
  private enabled = true;
  private attached = false;
  onFocusLost: (() => void) | null = null;

  attach(): void {
    if (this.attached || typeof window === "undefined") return;
    this.attached = true;
    window.addEventListener("keydown", this.handleDown, { capture: true });
    window.addEventListener("keyup", this.handleUp, { capture: true });
    window.addEventListener("blur", this.handleBlur);
    document.addEventListener("visibilitychange", this.handleVisibility);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.handleDown, { capture: true });
    window.removeEventListener("keyup", this.handleUp, { capture: true });
    window.removeEventListener("blur", this.handleBlur);
    document.removeEventListener("visibilitychange", this.handleVisibility);
    this.reset();
    this.onFocusLost = null;
  }

  /** Disable while an HTML overlay (dialogue, quiz, pause menu) owns the keyboard. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  reset(): void {
    this.pressed.clear();
    for (const a of ACTIONS) {
      this.touch[a] = false;
      this.pressedAt[a] = 0;
    }
  }

  setTouch(action: Action, down: boolean): void {
    if (!this.enabled) return;
    if (down && !this.touch[action]) this.pressedAt[action] = performance.now();
    this.touch[action] = down;
  }

  isDown(action: Action): boolean {
    if (!this.enabled) return false;
    if (this.touch[action]) return true;
    return KEYS[action].some((k) => this.pressed.has(k));
  }

  /** Horizontal axis: -1, 0 or 1. */
  get axisX(): number {
    return (this.isDown("right") ? 1 : 0) - (this.isDown("left") ? 1 : 0);
  }

  get axisY(): number {
    return (this.isDown("down") ? 1 : 0) - (this.isDown("up") ? 1 : 0);
  }

  /**
   * Returns true once for a fresh press that happened within `maxAgeMs`
   * (this is what gives jump buffering). The press is consumed.
   */
  consumePress(action: Action, maxAgeMs = 120): boolean {
    const t = this.pressedAt[action];
    if (!t || !this.enabled) return false;
    this.pressedAt[action] = 0;
    return performance.now() - t <= maxAgeMs;
  }

  private markPressed(code: string): void {
    for (const a of ACTIONS) if (KEYS[a].includes(code)) this.pressedAt[a] = performance.now();
  }

  private handleDown = (e: KeyboardEvent): void => {
    if (!GAME_KEYS.has(e.code)) return;
    if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    if (!this.enabled) return;
    if (e.target instanceof HTMLButtonElement) e.target.blur();
    e.preventDefault();
    if (!this.pressed.has(e.code)) {
      this.pressed.add(e.code);
      this.markPressed(e.code);
    }
  };

  private handleUp = (e: KeyboardEvent): void => {
    if (!GAME_KEYS.has(e.code)) return;
    this.pressed.delete(e.code);
  };

  private handleBlur = (): void => {
    this.reset();
    this.onFocusLost?.();
  };

  private handleVisibility = (): void => {
    if (document.hidden) {
      this.reset();
      this.onFocusLost?.();
    }
  };
}
