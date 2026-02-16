"use client";

import React, { useEffect, useRef } from "react";
import p5 from "p5";

interface FaceKeypoint {
  x: number;
  y: number;
  z?: number;
}

interface FaceMeshResult {
  faceOval: { keypoints: FaceKeypoint[] };
  keypoints: FaceKeypoint[];
}

interface FitRect {
  offsetX: number;
  offsetY: number;
  drawW: number;
  drawH: number;
  scale: number;
}

interface FaceMeshModel {
  detectStart: (
    video: p5.Element,
    callback: (results: FaceMeshResult[]) => void
  ) => void;
}

type P5CaptureElement = p5.Element & {
  size: (w: number, h: number) => void;
  hide: () => void;
};

const VIDEO_W = 640;
const VIDEO_H = 480;
const TARGET_FPS = 30;
const FACE_UPDATE_INTERVAL_MS = 66;
const Z_NEAR = 50;
const Z_FAR = -10;
const SMOOTH = 0.15;

const BALL_GRAVITY = 0.25;
const BALL_MIN_RADIUS = 18;
const BALL_MAX_RADIUS = 28;
const BALL_SPAWN_INTERVAL_MS = 1200;
const HEAD_HITBOX_SCALE = 0.85;
const EXPLOSION_PARTICLES = 15;
const EXPLOSION_SPEED = 4;
const EXPLOSION_FADE = 5;
const EXPLOSION_MIN_SIZE = 3;
const EXPLOSION_MAX_SIZE = 10;

const BALL_COLORS: [number, number, number][] = [
  [247, 180, 55],
  [248, 114, 83],
  [212, 167, 136],
  [255, 177, 159],
];

interface Ball {
  x: number;
  y: number;
  vy: number;
  radius: number;
  colorIndex: number;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
}

const MotionCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let myP5: p5;

    const getSize = (): { w: number; h: number } => ({
      w: typeof window !== "undefined" ? window.innerWidth : 640,
      h: typeof window !== "undefined" ? window.innerHeight : 480,
    });

    const init = async () => {
      try {
        const ml5 = require("ml5");
        const { w, h } = getSize();

        const sketch = (p: p5) => {
          let faceMesh: FaceMeshModel | null = null;
          let video: P5CaptureElement | null = null;
          let faces: FaceMeshResult[] = [];
          let isModelReady = false;
          let smoothedPointsPerFace: FaceKeypoint[][] = [];
          let lastFaceUpdate = 0;
          let lastBallSpawn = 0;
          let balls: Ball[] = [];
          let explosions: ExplosionParticle[] = [];
          let cachedFitRect: FitRect | null = null;
          let cachedFitRectDims = { w: 0, h: 0 };
          let colorClose: p5.Color;
          let colorFar: p5.Color;

          const computeFitRect = (): FitRect => {
            if (
              cachedFitRect &&
              p.width === cachedFitRectDims.w &&
              p.height === cachedFitRectDims.h
            ) {
              return cachedFitRect;
            }
            const scale = Math.max(p.width / VIDEO_W, p.height / VIDEO_H);
            const drawW = VIDEO_W * scale;
            const drawH = VIDEO_H * scale;
            cachedFitRect = {
              offsetX: (p.width - drawW) / 2,
              offsetY: (p.height - drawH) / 2,
              drawW,
              drawH,
              scale,
            };
            cachedFitRectDims = { w: p.width, h: p.height };
            return cachedFitRect;
          };

          const getHeadHitbox = (points: FaceKeypoint[]): { cx: number; cy: number; r: number } | null => {
            if (!points.length) return null;
            let cx = 0;
            let cy = 0;
            for (let i = 0; i < points.length; i++) {
              cx += points[i].x;
              cy += points[i].y;
            }
            cx /= points.length;
            cy /= points.length;
            let maxDist = 0;
            for (let i = 0; i < points.length; i++) {
              const d = p.dist(cx, cy, points[i].x, points[i].y);
              if (d > maxDist) maxDist = d;
            }
            return { cx, cy, r: maxDist * HEAD_HITBOX_SCALE };
          };

          const spawnBall = () => {
            const radius = p.random(BALL_MIN_RADIUS, BALL_MAX_RADIUS);
            balls.push({
              x: p.random(radius, p.width - radius),
              y: -radius - 10,
              vy: 0,
              radius,
              colorIndex: p.floor(p.random(0, BALL_COLORS.length)),
            });
          };

          const createExplosion = (x: number, y: number) => {
            for (let i = 0; i < EXPLOSION_PARTICLES; i++) {
              const angle = (p.TWO_PI * i) / EXPLOSION_PARTICLES + p.random(-0.4, 0.4);
              const speed = p.random(EXPLOSION_SPEED * 0.6, EXPLOSION_SPEED);
              explosions.push({
                x,
                y,
                vx: p.cos(angle) * speed,
                vy: p.sin(angle) * speed,
                alpha: 255,
                size: p.random(EXPLOSION_MIN_SIZE, EXPLOSION_MAX_SIZE),
              });
            }
          };

          p.setup = () => {
            if (!canvasRef.current) return;
            p.createCanvas(w, h).parent(canvasRef.current);
            p.frameRate(TARGET_FPS);
            p.colorMode(p.HSB, 360, 100, 100, 255);

            colorClose = p.color(180, 64, 78);
            colorFar = p.color(180, 64, 78);

            video = p.createCapture("video", () => {}) as P5CaptureElement;
            video.size(VIDEO_W, VIDEO_H);
            video.hide();

            faceMesh = ml5.faceMesh(
              { maxFaces: 5, refineLandmarks: false, flipHorizontal: true },
              () => {
                isModelReady = true;
                if (faceMesh && video) {
                  faceMesh.detectStart(video, (results: FaceMeshResult[]) => {
                    const now = p.millis();
                    if (now - lastFaceUpdate >= FACE_UPDATE_INTERVAL_MS) {
                      faces = results;
                      lastFaceUpdate = now;
                    }
                  });
                }
              }
            );
          };

          p.windowResized = () => {
            const { w: newW, h: newH } = getSize();
            p.resizeCanvas(newW, newH);
            cachedFitRect = null;
          };

          p.draw = () => {
            p.background(205, 74, 53);
            const fit = computeFitRect();

            if (!isModelReady) {
              p.fill(255);
              p.textAlign(p.CENTER);
              p.text("Loading model", p.width / 2, p.height / 2);
              return;
            }

            const now = p.millis();

            if (now - lastBallSpawn >= BALL_SPAWN_INTERVAL_MS) {
              lastBallSpawn = now;
              spawnBall();
            }

            for (let i = balls.length - 1; i >= 0; i--) {
              const b = balls[i];
              b.vy += BALL_GRAVITY;
              b.y += b.vy;
              if (b.y - b.radius > p.height) {
                balls.splice(i, 1);
              }
            }

            const heads: { cx: number; cy: number; r: number }[] = [];

            if (faces.length > 0) {
              for (let fi = 0; fi < faces.length; fi++) {
                const face = faces[fi];
                const keypoints = face.faceOval.keypoints;
                const n = keypoints.length;
                if (!smoothedPointsPerFace[fi]) {
                  smoothedPointsPerFace[fi] = [];
                }
                const smoothedPoints = smoothedPointsPerFace[fi];

                for (let i = 0; i < n; i++) {
                  const kp = keypoints[i];
                  const targetX = fit.offsetX + kp.x * fit.scale;
                  const targetY = fit.offsetY + kp.y * fit.scale;
                  if (!smoothedPoints[i]) {
                    smoothedPoints[i] = { x: targetX, y: targetY };
                  } else {
                    smoothedPoints[i].x = p.lerp(smoothedPoints[i].x, targetX, SMOOTH);
                    smoothedPoints[i].y = p.lerp(smoothedPoints[i].y, targetY, SMOOTH);
                  }
                }
                const head = getHeadHitbox(smoothedPoints);
                if (head) heads.push(head);
              }
            }

            if (smoothedPointsPerFace.length > faces.length) {
              smoothedPointsPerFace.length = faces.length;
            }

            for (let i = balls.length - 1; i >= 0; i--) {
              const b = balls[i];
              for (const head of heads) {
                const d = p.dist(b.x, b.y, head.cx, head.cy);
                if (d < head.r + b.radius) {
                  createExplosion(b.x, b.y);
                  balls.splice(i, 1);
                  break;
                }
              }
            }

            for (let i = explosions.length - 1; i >= 0; i--) {
              const e = explosions[i];
              e.x += e.vx;
              e.y += e.vy;
              e.alpha -= EXPLOSION_FADE;
              if (e.alpha <= 0) {
                explosions.splice(i, 1);
              }
            }

            p.noStroke();
            for (const b of balls) {
              const [r, g, bl] = BALL_COLORS[b.colorIndex];
              p.push();
              p.colorMode(p.RGB);
              p.fill(r, g, bl);
              p.circle(b.x, b.y, b.radius * 2);
              p.pop();
            }

            for (const e of explosions) {
              p.fill(40, 100, 100, e.alpha);
              p.circle(e.x, e.y, e.size);
              p.fill(60, 100, 100, e.alpha * 0.5);
              p.circle(e.x, e.y, e.size * 0.6);
            }

            for (let fi = 0; fi < faces.length; fi++) {
              const face = faces[fi];
              const keypoints = face.faceOval.keypoints;
              const n = keypoints.length;
              const smoothedPoints = smoothedPointsPerFace[fi];
              if (!smoothedPoints) continue;
              const avgZ =
                keypoints.reduce((sum, kp) => sum + (kp.z ?? 0), 0) / n;
              const t = p.constrain(p.map(avgZ, Z_NEAR, Z_FAR, 0, 1), 0, 1);
              const strokeColor = p.lerpColor(colorClose, colorFar, t);
              p.noFill();
              p.stroke(strokeColor);
              p.strokeWeight(3);
              for (let i = 0; i < n; i++) {
                const from = smoothedPoints[i];
                const to = smoothedPoints[(i + 1) % n];
                if (from && to) {
                  p.line(from.x, from.y, to.x, to.y);
                }
              }
            }
          };
        };

        myP5 = new p5(sketch);
      } catch (err) {
        console.error("Failed to init p5/ml5:", err);
      }
    };

    init();
    return () => {
      if (myP5) myP5.remove();
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
};

export default MotionCanvas;
