import { useEffect, useRef } from "react";
import { animate, svg } from "animejs";

// Five hand-authored blob states so the morph never reads as "loop between
// two shapes." anime.js interpolates the path `d` between each state.
const BLOB_STATES = [
  "M300,60 C420,60 520,150 520,280 C520,410 420,500 300,500 C180,500 80,410 80,280 C80,150 180,60 300,60 Z",
  "M300,40 C440,70 540,160 500,290 C470,410 380,480 280,470 C150,460 70,380 90,260 C110,140 190,20 300,40 Z",
  "M280,50 C400,40 520,120 510,260 C500,400 400,490 270,480 C150,470 60,370 70,250 C80,130 170,60 280,50 Z",
  "M310,70 C430,90 500,190 490,300 C480,420 370,490 260,460 C160,430 80,340 90,230 C100,120 200,50 310,70 Z",
  "M300,60 C420,60 520,150 520,280 C520,410 420,500 300,500 C180,500 80,410 80,280 C80,150 180,60 300,60 Z",
];

export default function FluidBackground({ modalOpen }) {
  const pathRef = useRef(null);

  useEffect(() => {
    if (!pathRef.current) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const anim = animate(pathRef.current, {
      d: BLOB_STATES.map((d) => ({ value: d })),
      duration: 32000,
      easing: "easeInOutSine",
      loop: true,
    });

    return () => anim.pause();
  }, []);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-[1200ms]"
      style={{ opacity: modalOpen ? 0.35 : 0.5, filter: "blur(60px)" }}
    >
      <svg
        viewBox="0 0 600 560"
        className="w-[140%] h-[140%] max-w-none"
        style={{ transform: modalOpen ? "translateX(6%)" : "translateX(0%)", transition: "transform 1.4s ease" }}
      >
        <defs>
          <radialGradient id="fluidGradient" cx="50%" cy="45%" r="65%">
            <stop offset="0%" stopColor="#1c3faa" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#0ea5c4" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#050810" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path ref={pathRef} d={BLOB_STATES[0]} fill="url(#fluidGradient)" />
      </svg>
    </div>
  );
}