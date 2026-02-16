"use client";
import dynamic from "next/dynamic";

const MotionCanvas = dynamic(() => import("../components/MotionCanvas"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
      Laddar ML-modell & Kamera...
    </div>
  ),
});

export default function Home() {
  return (
    <main className="fixed inset-0 w-screen h-screen overflow-hidden">
      <div className="absolute top-20 left-0 w-full z-10 pointer-events-none">
      <img src="/prototyp_logo.svg" alt="Prototyp Logo" className="w-70 h-70 mx-auto" />
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center">
            
        </h1>
      </div>
      <div className="absolute inset-0 w-full h-full">
        <MotionCanvas />
      </div>
    </main>
  );
}