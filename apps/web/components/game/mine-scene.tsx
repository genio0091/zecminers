"use client";

import { useEffect, useRef, useState } from "react";
import type { DerivedSlotState } from "@zecminers/economy";

/**
 * Phaser scene — pure presentation (blueprint §7.8). It never decides anything: slot state
 * comes from the API and the collect burst only plays after the server confirmed the reward.
 * 16×16 pixel sprites are generated in code; WASD / arrow keys walk the miner around.
 */
export interface SceneState {
  state: DerivedSlotState;
  level: number;
  /** Increments when the server confirms a collect; `amount` floats above the miner. */
  collect: { nonce: number; amount: string } | null;
  /** Idle because today's session was already used. */
  doneToday?: boolean;
}

const W = 320;
const H = 180;
const HELMET = ["#8B5A2B", "#C9A36B", "#C8322B", "#2E8B57", "#3B82F6"]; // L1..L5, from the trait sheet

const ZANDY = [
  "................",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "...HHHHLHHHHH...",
  "...KKKKKKKKKK...",
  "...KWWWWWWWWK...",
  "...KWKWWWWKWK...",
  "...KWKWWWWKWK...",
  "...KWWWWWWWWK...",
  "....KWWWWWWK....",
  "...KWWWWWWWWK...",
  "..KWWKWWWWKWWK..",
  "...KWWWWWWWWK...",
  "....KWWKKWWK....",
  "....KWK..KWK....",
  "....KK....KK....",
];
const PICK = [
  "................",
  "..GGGGGGG.......",
  ".GSSSSSSSG......",
  "GSG.....GSG.....",
  "G.....B..G......",
  "......B.........",
  ".......B........",
  ".......B........",
  "........B.......",
  "........B.......",
  ".........B......",
  ".........B......",
  "..........B.....",
  "................",
  "................",
  "................",
];
const GEM = ["......K.....", ".....KYK....", "....KYYYK...", "...KYYWYYK..", "..KYYYYYYYK.", "...KYYYYYK..", "....KYYYK...", ".....KYK....", "......K....."];

type PhaserNS = typeof import("phaser");

function paint(scene: import("phaser").Scene, key: string, rows: string[], palette: Record<string, string>) {
  const g = scene.add.graphics();
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = palette[ch];
      if (!c) return;
      g.fillStyle(Number.parseInt(c.slice(1), 16), 1);
      g.fillRect(x, y, 1, 1);
    }),
  );
  g.generateTexture(key, rows[0]!.length, rows.length);
  g.destroy();
}

function makeScene(Phaser: PhaserNS, getState: () => SceneState) {
  return class MineScene extends Phaser.Scene {
    miner!: import("phaser").GameObjects.Image;
    pick!: import("phaser").GameObjects.Image;
    gem!: import("phaser").GameObjects.Image;
    label!: import("phaser").GameObjects.Text;
    keys!: Record<"W" | "A" | "S" | "D" | "UP" | "DOWN" | "LEFT" | "RIGHT", import("phaser").Input.Keyboard.Key>;
    ores: { x: number; y: number }[] = [];
    lastNonce = 0;
    lastLevel = 0;
    swingT = 0;

    constructor() {
      super("mine");
    }

    create() {
      // ---- terrain -------------------------------------------------------------
      const g = this.add.graphics();
      const rnd = new Phaser.Math.RandomDataGenerator(["zecminers"]);
      for (let y = 0; y < H; y += 4)
        for (let x = 0; x < W; x += 4) {
          g.fillStyle(rnd.frac() < 0.5 ? 0x3f8f3a : 0x4a9b41, 1);
          g.fillRect(x, y, 4, 4);
        }
      // cliffs
      g.fillStyle(0x8a4b25, 1);
      g.fillRect(0, 0, W, 18);
      g.fillStyle(0x6b3719, 1);
      for (let x = 0; x < W; x += 8) g.fillRect(x, 14 + (x % 16 === 0 ? 0 : 2), 8, 4);
      // dirt path
      g.fillStyle(0xb9854a, 1);
      g.fillRect(40, 96, 250, 20);
      g.fillRect(40, 30, 20, 86);
      // rail track
      g.fillStyle(0x6d4a2a, 1);
      for (let x = 44; x < 290; x += 8) g.fillRect(x, 101, 4, 10);
      g.fillStyle(0xb7b7b7, 1);
      g.fillRect(40, 102, 250, 2);
      g.fillRect(40, 108, 250, 2);
      // mine entrance
      g.fillStyle(0x3a2412, 1);
      g.fillRect(34, 18, 32, 20);
      g.fillStyle(0x0b0806, 1);
      g.fillRect(40, 22, 20, 16);
      // cart
      g.fillStyle(0x555555, 1);
      g.fillRect(250, 94, 18, 10);
      g.fillStyle(0x222222, 1);
      g.fillRect(252, 104, 4, 3);
      g.fillRect(262, 104, 4, 3);
      // trees
      for (const [tx, ty] of [
        [290, 40],
        [18, 150],
        [300, 150],
        [150, 30],
      ] as const) {
        g.fillStyle(0x5a3a1a, 1);
        g.fillRect(tx + 5, ty + 10, 4, 8);
        g.fillStyle(0x2e6b2c, 1);
        g.fillRect(tx, ty, 14, 12);
        g.fillStyle(0x3d8a38, 1);
        g.fillRect(tx + 2, ty + 1, 10, 6);
      }
      // ore rocks with gems: gold = $ZGEMS, purple = Grapestone, green = Mint Stone, amber = Goldstone
      const gemColors = [0xffc93c, 0x8e5bd9, 0x5bd9a8, 0xe0a030];
      this.ores = [
        { x: 120, y: 60 },
        { x: 200, y: 58 },
        { x: 110, y: 140 },
        { x: 210, y: 140 },
      ];
      this.ores.forEach((o, i) => {
        g.fillStyle(0x000000, 1);
        g.fillRect(o.x - 1, o.y - 1, 22, 16);
        g.fillStyle(0x9a9a9a, 1);
        g.fillRect(o.x, o.y, 20, 14);
        g.fillStyle(0xc8c8c8, 1);
        g.fillRect(o.x + 2, o.y + 2, 8, 4);
        g.fillStyle(gemColors[i % gemColors.length]!, 1);
        g.fillRect(o.x + 12, o.y + 6, 3, 3);
        g.fillRect(o.x + 6, o.y + 9, 2, 2);
      });

      // ---- sprites -------------------------------------------------------------
      paint(this, "pick", PICK, { G: "#9aa0a6", S: "#d7dde2", B: "#6b4226" });
      paint(this, "gem", GEM, { K: "#000000", Y: "#ffc93c", W: "#fff3d6" });
      this.drawMiner(getState().level);

      this.miner = this.add.image(150, 90, "miner").setOrigin(0.5, 1);
      this.pick = this.add.image(0, 0, "pick").setOrigin(0.2, 0.8);
      this.gem = this.add.image(0, 0, "gem").setVisible(false);
      this.label = this.add
        .text(W / 2, 4, "", { fontFamily: "monospace", fontSize: "8px", color: "#fff3d6", backgroundColor: "#000000", padding: { x: 3, y: 1 } })
        .setOrigin(0.5, 0)
        .setDepth(10);

      const kb = this.input.keyboard!;
      this.keys = kb.addKeys("W,A,S,D,UP,DOWN,LEFT,RIGHT") as typeof this.keys;
    }

    drawMiner(level: number) {
      if (this.textures.exists("miner")) this.textures.remove("miner");
      paint(this, "miner", ZANDY, { H: HELMET[Math.max(0, Math.min(4, level - 1))]!, L: "#FFF3D6", K: "#000000", W: "#FFFFFF" });
      this.lastLevel = level;
      if (this.miner) this.miner.setTexture("miner");
    }

    nearestOre() {
      let best = this.ores[0]!;
      let d = Infinity;
      for (const o of this.ores) {
        const dd = Phaser.Math.Distance.Between(this.miner.x, this.miner.y, o.x + 10, o.y + 14);
        if (dd < d) {
          d = dd;
          best = o;
        }
      }
      return { ore: best, dist: d };
    }

    burst(amount: string) {
      for (let i = 0; i < 14; i++) {
        const p = this.add.rectangle(this.miner.x, this.miner.y - 10, 2, 2, i % 2 ? 0xffc93c : 0xf0a81e).setDepth(9);
        this.tweens.add({
          targets: p,
          x: this.miner.x + Phaser.Math.Between(-24, 24),
          y: this.miner.y - Phaser.Math.Between(14, 40),
          alpha: 0,
          duration: 700 + i * 20,
          onComplete: () => p.destroy(),
        });
      }
      const t = this.add
        .text(this.miner.x, this.miner.y - 22, `+${amount}`, { fontFamily: "monospace", fontSize: "9px", color: "#ffc93c", stroke: "#000000", strokeThickness: 2 })
        .setOrigin(0.5)
        .setDepth(11);
      this.tweens.add({ targets: t, y: t.y - 18, alpha: 0, duration: 1400, onComplete: () => t.destroy() });
    }

    update(_time: number, delta: number) {
      const s = getState();
      if (s.level !== this.lastLevel) this.drawMiner(s.level);
      const canWalk = s.state !== "stopped";
      const speed = 0.06 * delta;
      if (canWalk) {
        const k = this.keys;
        let dx = 0;
        let dy = 0;
        if (k.A.isDown || k.LEFT.isDown) dx -= speed;
        if (k.D.isDown || k.RIGHT.isDown) dx += speed;
        if (k.W.isDown || k.UP.isDown) dy -= speed;
        if (k.S.isDown || k.DOWN.isDown) dy += speed;
        if (dx || dy) {
          this.miner.x = Phaser.Math.Clamp(this.miner.x + dx, 10, W - 10);
          this.miner.y = Phaser.Math.Clamp(this.miner.y + dy, 34, H - 4);
          if (dx) this.miner.setFlipX(dx < 0);
        } else if (s.state === "mining") {
          // auto-walk to the nearest ore node while a session runs
          const { ore, dist } = this.nearestOre();
          if (dist > 14) {
            const a = Phaser.Math.Angle.Between(this.miner.x, this.miner.y, ore.x + 10, ore.y + 16);
            this.miner.x += Math.cos(a) * speed * 0.8;
            this.miner.y += Math.sin(a) * speed * 0.8;
            this.miner.setFlipX(Math.cos(a) < 0);
          }
        }
      }

      const flip = this.miner.flipX ? -1 : 1;
      this.pick.setPosition(this.miner.x + 6 * flip, this.miner.y - 7).setFlipX(this.miner.flipX);
      if (s.state === "mining") {
        this.swingT += delta;
        this.pick.setRotation(Math.sin(this.swingT / 110) * 0.9 * flip).setVisible(true).setTint(0xffffff);
        if (Math.floor(this.swingT / 440) !== Math.floor((this.swingT - delta) / 440)) {
          const spark = this.add.rectangle(this.miner.x + 12 * flip, this.miner.y - 4, 2, 2, 0xffc93c).setDepth(8);
          this.tweens.add({ targets: spark, y: spark.y - 8, alpha: 0, duration: 400, onComplete: () => spark.destroy() });
        }
      } else {
        this.pick.setRotation(0.4 * flip).setVisible(s.state !== "stopped");
        if (s.state === "broken" || s.state === "repairing") this.pick.setTint(0x777777);
        else this.pick.setTint(0xffffff);
      }

      this.gem.setVisible(s.state === "ready").setPosition(this.miner.x, this.miner.y - 24 + Math.sin(this.time.now / 250) * 2);
      this.miner.setAlpha(s.state === "stopped" ? 0.35 : 1);

      const labels: Record<DerivedSlotState, string> = {
        idle: "READY TO MINE · WASD TO WALK",
        mining: "MINING…",
        ready: "SESSION COMPLETE · COLLECT",
        broken: "PICKAXE BROKEN · REPAIR",
        repairing: "REPAIRING…",
        stopped: "PASS MOVED · SLOT STOPPED",
      };
      this.label.setText(s.doneToday && s.state === "idle" ? "DONE FOR TODAY · RESET 00:00 UTC" : labels[s.state]);

      if (s.collect && s.collect.nonce !== this.lastNonce) {
        this.lastNonce = s.collect.nonce;
        this.burst(s.collect.amount);
      }
    }
  };
}

export function MineScene({ scene, className }: { scene: SceneState; className?: string }) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(scene);
  useEffect(() => {
    latest.current = scene;
  }, [scene]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let game: import("phaser").Game | null = null;
    let cancelled = false;
    import("phaser")
      .then((Phaser) => {
        if (cancelled || !host.current) return;
        const Scene = makeScene(Phaser, () => latest.current);
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: host.current,
          width: W,
          height: H,
          backgroundColor: "#0e0b08",
          pixelArt: true,
          roundPixels: true,
          scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
          scene: Scene,
          banner: false,
          audio: { noAudio: true },
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      game?.destroy(true);
    };
  }, []);

  if (failed) return <div className="grid h-full place-items-center text-sm text-stone">Scene unavailable in this browser.</div>;
  return <div ref={host} className={className} role="img" aria-label={`Mining scene: slot is ${scene.state}`} />;
}
