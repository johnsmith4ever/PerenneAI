"use client";
import React, { useEffect, useState } from "react";

export function MouseTrackingBackground({ active = true }: { active?: boolean }) {
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (!active) {
    return (
      <div 
        className="absolute inset-0 z-0 opacity-30 mix-blend-screen pointer-events-none transition-all duration-1000"
        style={{
          background: "radial-gradient(circle 800px at 50% 100%, rgba(255,255,255,0.05), transparent)"
        }}
      />
    );
  }

  return (
    <div 
      className="absolute inset-0 z-0 opacity-80 mix-blend-screen transition-all duration-75 ease-out pointer-events-none"
      style={{
        background: `radial-gradient(circle 500px at ${mousePos.x}% ${mousePos.y}%, rgba(245,158,11,0.4), transparent),
                     radial-gradient(circle 400px at ${100 - mousePos.x}% ${100 - mousePos.y}%, rgba(234,88,12,0.3), transparent)`
      }}
    >
      <div className="absolute w-[400px] h-[400px] bg-amber-500/20 rounded-full blur-[100px] animate-[spin_10s_linear_infinite] origin-bottom-right top-1/4 left-1/4 pointer-events-none"></div>
      <div className="absolute w-[350px] h-[350px] bg-orange-600/20 rounded-full blur-[90px] animate-[spin_15s_linear_infinite_reverse] origin-top-left bottom-1/4 right-1/4 pointer-events-none"></div>
    </div>
  );
}
