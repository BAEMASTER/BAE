"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";

interface Props {
  words: string[];
  interval?: number; // ms
}

export default function RotatingGlowWord({
  words,
  interval = 3200, // default 3.2 seconds
}: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [interval, words.length]);

  return (
    <span
      className={clsx(
        "relative inline-block font-extrabold",
        "text-transparent bg-clip-text",
        "bg-gradient-to-r from-fuchsia-500 to-pink-500",
        "rotating-glow"
      )}
      key={index} // rerender for animation
    >
      <span className="inline-block animate-rotateFadeSlide">
        {words[index]}
      </span>
    </span>
  );
}
