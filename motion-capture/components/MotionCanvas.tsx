"use client";

import React, { useEffect, useRef } from "react";
import p5 from "p5";

// Definera typer
// Face mesh keypoint (pixel coordinates from ml5/MediaPipe)
interface FaceKeypoint {
  x: number;
  y: number;
  z?: number;
}

// Single face result from ml5 faceMesh detection
interface FaceMeshResult {
  faceOval: { keypoints: FaceKeypoint[] };
  keypoints: FaceKeypoint[];
}

// Scaling from video space to display (cover mode)
interface FitRect {
  offsetX: number;
  offsetY: number;
  drawW: number;
  drawH: number;
  scale: number;
}

// ml5 faceMesh model instance
interface FaceMeshModel {
  detectStart: (
    video: p5.Element,
    callback: (results: FaceMeshResult[]) => void
  ) => void;
}

// p5 createCapture return type (has size/hide; not fully typed in @types/p5)
type P5CaptureElement = p5.Element & {
  size: (w: number, h: number) => void;
  hide: () => void;
};

// The actual component
const MotionCanvas = () => {
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let myP5: p5;

      // Get the size of the window
    const getSize = (): { w: number; h: number } => ({
      w: typeof window !== "undefined" ? window.innerWidth : 640,
      h: typeof window !== "undefined" ? window.innerHeight : 480,
    });

    // Initialize
    const init = async () => {
      try {
        const ml5 = require("ml5");
        const { w, h } = getSize();

        // Fixed video size – no resizing = no warping; we fit this in the window
        const VIDEO_W = 640;
        const VIDEO_H = 480;

        const sketch = (p: p5) => {
          let faceMesh: FaceMeshModel | null = null;
          let video: P5CaptureElement | null = null;
          let faces: FaceMeshResult[] = [];
          const options = {
            maxFaces: 5,
            refineLandmarks: false,
            flipHorizontal: true,
          };
          let isModelReady = false;

          p.setup = () => {
            if (!canvasRef.current) return;

            p.createCanvas(w, h).parent(canvasRef.current);

            video = p.createCapture("video", () => {
              console.log("Camera ready");
            }) as P5CaptureElement;
            video.size(VIDEO_W, VIDEO_H);
            video.hide();

            faceMesh = ml5.faceMesh(options, () => {
              console.log("Modell loaded");
              isModelReady = true;
              if (faceMesh && video) {
                faceMesh.detectStart(video, (results: FaceMeshResult[]) => {
                  faces = results;
                });
              }
            });
          };

          p.windowResized = () => {
            const { w: newW, h: newH } = getSize();
            p.resizeCanvas(newW, newH);
          };

          // Fit the video to the window
          const fitRect = (): FitRect => {
            const scale = Math.max(p.width / VIDEO_W, p.height / VIDEO_H);
            const drawW = VIDEO_W * scale;
            const drawH = VIDEO_H * scale;
            const offsetX = (p.width - drawW) / 2;
            const offsetY = (p.height - drawH) / 2;
            return { offsetX, offsetY, drawW, drawH, scale };
          };

          let smoothedPoints: FaceKeypoint[] = [];

          p.draw = () => {
            p.background(0, 0, 0, 25); // Svart färg med 25 i alfa för att punkterna ska fadea

            const { offsetX, offsetY, scale } = fitRect();

            if (isModelReady && faces.length > 0) {
              faces.forEach((face: FaceMeshResult) => {
                const keypoints = face.faceOval.keypoints;

                // Beräkna genomsnittligt z (djup) för ansiktet – används för färg beroende på avstånd till kameran
                const avgZ =
                  keypoints.reduce((sum, kp) => sum + (kp.z ?? 0), 0) /
                  keypoints.length;
                // Map z till 0 (nära) … 1 (långt). Justera Z_NEAR/Z_FAR om din kamera ger annat intervall.
                const Z_NEAR = 50;
                const Z_FAR = -10;
                const t = p.constrain(p.map(avgZ, Z_NEAR, Z_FAR, 0, 1), 0, 1);
                const colorClose = p.color(100, 255, 255); // cyan – nära
                const colorFar = p.color(255, 50, 255); // magenta – långt
                const strokeColor = p.lerpColor(colorClose, colorFar, t);

                // Uppdatera utjämnade punkter
                keypoints.forEach((kp: FaceKeypoint, index: number) => {
                  const targetX = offsetX + kp.x * scale;
                  const targetY = offsetY + kp.y * scale;

                  // Om det är första gången, sätt startvärdet direkt
                  if (!smoothedPoints[index]) {
                    smoothedPoints[index] = { x: targetX, y: targetY };
                  }

                  // Vi rör oss bara 15% (0.15) mot målet varje frame
                  smoothedPoints[index].x = p.lerp(smoothedPoints[index].x, targetX, 0.15);
                  smoothedPoints[index].y = p.lerp(smoothedPoints[index].y, targetY, 0.15);
                });

                // Rita linjer från en keypoint till nästa så att det bildar en oval (stängd kurva)
                p.noFill();
                p.stroke(strokeColor);
                p.strokeWeight(3);
                const n = keypoints.length;
                for (let i = 0; i < n; i++) {
                  const from = smoothedPoints[i];
                  const to = smoothedPoints[(i + 1) % n];
                  if (from && to) {
                    p.line(from.x, from.y, to.x, to.y);
                  }
                }

                // 3. Rita ut den utjämnade punkten istället för rådatan
                //p.noStroke();
                //p.fill(255);
                //p.circle(smoothedPoints[index].x, smoothedPoints[index].y, 5);
              });

            } else if (!isModelReady) {
              p.fill(255);
              p.textAlign(p.CENTER);
              p.text("Loading model", p.width / 2, p.height / 2);
            }
          };
        };

        myP5 = new p5(sketch);
      } catch (err) {
        console.error("Fel vid initiering av p5/ml5:", err);
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
      className="absolute inset-0 w-full h-full bg-black"
      style={{ width: "100vw", height: "100vh" }}
    />
  );
};

export default MotionCanvas;