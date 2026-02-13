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
    <main className="fixed inset-0 w-screen h-screen overflow-hidden bg-black">
      <div className="absolute top-10 left-0 w-full z-10 pointer-events-none">
        <h1 className="text-4xl md:text-6xl font-bold text-white text-center">
            UMAIN <span className="text-violet-500">JIN</span>
        </h1>
        <p className="text-gray-400 text-center mt-2">We recognize you</p>
      </div>

      <div className="absolute inset-0 w-full h-full">
        <MotionCanvas />
      </div>
    </main>
  );
}