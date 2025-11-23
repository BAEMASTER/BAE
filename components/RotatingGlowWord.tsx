"use client";

import { useEffect, useState } from "react";

const WORDS = ["energize", "spark", "brighten", "uplift", "elevate"];

export default function RotatingGlowWord() {
  const [index, setIndex] = useState(0);

  // Rotate every 2.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      key={index}
      className="
        rotating-glow
        animate-rotateFadeSlide
        bg-gradient-to-r from-fuchsia-500 to-pink-500
        bg-clip-text text-transparent
        font-extrabold inline-block
      "
    >
      {WORDS[index]}
    </span>
  );
}
