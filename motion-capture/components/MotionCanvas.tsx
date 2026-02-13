"use client";

import React, { useEffect, useRef } from "react";
import p5 from "p5";

// Definera typer
// Face mesh keypoint (pixel coordinates from ml5/MediaPipe)
interface FaceKeypoint {
  x: number;
  y: number;
  z?: number;
  name?: string;
}

// Single face result from ml5 faceMesh detection
interface FaceMeshResult {
  faceOval: { keypoints: FaceKeypoint[] };
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

          p.draw = () => {
            p.fill(0, 0, 0, 25); // Svart färg med 25 i alfa (0-255)
            p.rect(0, 0, p.width, p.height); // Ritar en rektangel över hela ytan

            const { offsetX, offsetY, scale } = fitRect();

            if (isModelReady && faces.length > 0) {
              p.noStroke();
              faces.forEach((face: FaceMeshResult) => {
                p.fill(255, 255, 255);
                face.faceOval.keypoints.forEach((kp: FaceKeypoint) => {
                  p.circle(offsetX + kp.x * scale, offsetY + kp.y * scale, 5);
                });
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