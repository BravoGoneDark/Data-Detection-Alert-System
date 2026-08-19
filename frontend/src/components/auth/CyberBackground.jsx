import { useEffect, useRef, useState } from "react";
import BackgroundImage from "./BackgroundImage";
import FluidBackground from "./FluidBackground";
import FloatingGeometry from "./FloatingGeometry";
import NetworkParticles from "./NetworkParticles";

export default function CyberBackground({ modalOpen, children }) {
  const containerRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (window.innerWidth < 768) return; // disabled on mobile per spec
    const handleMove = (e) => {
      const nx = (e.clientX / window.innerWidth - 0.5) * 2; // -1..1
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x: nx, y: ny });
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen w-full overflow-hidden bg-[#050810]">
      <BackgroundImage modalOpen={modalOpen} mouse={mouse} />
      <FluidBackground modalOpen={modalOpen} />
      <FloatingGeometry modalOpen={modalOpen} mouse={mouse} />
      <NetworkParticles modalOpen={modalOpen} mouse={mouse} />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
}