import type Phaser from "phaser";
import { BossScene } from "./BossScene";
import { EndingScene } from "./EndingScene";
import { HeartsScene } from "./HeartsScene";
import { MazeScene } from "./MazeScene";
import { SnackScene } from "./SnackScene";

/** Every playable scene after Boot and Level 1. */
export const extraScenes: (new () => Phaser.Scene)[] = [MazeScene, SnackScene, HeartsScene, BossScene, EndingScene];
