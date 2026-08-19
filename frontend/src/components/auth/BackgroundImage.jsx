import { motion, useReducedMotion } from "motion/react";

// Dark server-rack / data-center image — enough negative space at center
// for the auth panel to sit in. Swap the URL for a self-hosted asset if
// you'd rather not depend on Unsplash at runtime.
const IMAGE_URL =
  "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=2400&auto=format&fit=crop";

export default function BackgroundImage({ modalOpen, mouse }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute inset-[-4%] bg-cover bg-center"
        style={{ backgroundImage: `url(${IMAGE_URL})` }}
        animate={
          reduceMotion
            ? { opacity: modalOpen ? 0.35 : 0.45 }
            : {
                scale: modalOpen ? [1.02, 1.06, 1.02] : [1, 1.03, 1],
                x: mouse ? mouse.x * -8 : 0,
                y: mouse ? mouse.y * -8 : 0,
                filter: modalOpen
                  ? ["brightness(0.55) blur(1px)", "brightness(0.45) blur(2px)", "brightness(0.55) blur(1px)"]
                  : ["brightness(0.7) blur(0px)", "brightness(0.75) blur(0.5px)", "brightness(0.7) blur(0px)"],
              }
        }
        transition={{
          scale: { duration: 46, repeat: Infinity, ease: "easeInOut" },
          filter: { duration: 38, repeat: Infinity, ease: "easeInOut" },
          x: { type: "spring", stiffness: 20, damping: 20 },
          y: { type: "spring", stiffness: 20, damping: 20 },
        }}
      />
      {/* Dark gradient so the auth UI stays the focal point */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050810]/90 via-[#050810]/70 to-[#050810]/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#050810]/60 via-transparent to-[#050810]/60" />
    </div>
  );
}