import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";

function MatrixSky() {
  const [grid, setGrid] = useState("");

  useEffect(() => {
    const generateGrid = () => {
      let text = "";
      for (let r = 0; r < 300; r++) {
        for (let c = 0; c < 800; c++) {
          text += Math.floor(Math.random() * 10) + "  "; 
        }
        text += "\n";
      }
      return text;
    };

    setGrid(generateGrid());
    const interval = setInterval(() => {
      setGrid(generateGrid());
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute -top-[100vh] -left-[100vw] w-[300vw] h-[300vh] overflow-hidden pointer-events-none z-0">
      <div 
        className="text-[#00c2de] text-[7px] font-mono opacity-50 whitespace-pre leading-relaxed tracking-widest blur-[0.5px] text-left"
        style={{ textShadow: "0 0 8px #00c2de" }}
      >
        {grid}
      </div>
    </div>
  );
}

function TurbulentFlowingGrid({ modalOpen }) {
  const planeRef = useRef(null);

  useFrame((state) => {
    if (!planeRef.current) return;
    const time = state.clock.getElapsedTime();
    const positions = planeRef.current.geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = Math.sin(x * 0.15 + time * 0.5) * 0.7 + Math.cos(y * 0.15 + time * 0.6) * 0.7;
      positions.setZ(i, z);
    }
    positions.needsUpdate = true;
    
    const targetRotX = modalOpen ? -Math.PI / 2.3 : -Math.PI / 1.95;
    planeRef.current.rotation.x += (targetRotX - planeRef.current.rotation.x) * 0.05;
  });

  return (
    <mesh ref={planeRef} rotation={[-Math.PI / 1.95, 0, 0]} position={[0, -4.8, -5]}>
      <planeGeometry args={[120, 120, 70, 70]} />
      <meshBasicMaterial color="#00c2de" wireframe transparent opacity={0.15} />
    </mesh>
  );
}

export default function CyberBackground({ modalOpen, children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#000000]">
      
      {/* 
        Centered Split-Pane Branding Overlay 
        - Positioned 10% from the top
        - left-1/2 and -translate-x-1/2 perfectly centers the absolute div
      */}
      <div className="absolute top-[10%] left-1/2 -translate-x-1/2 z-30 w-[40vw] h-32 pointer-events-none select-none bg-[#000000] rounded-2xl border border-[#00c2de]/20 shadow-[0_0_40px_-10px_rgba(0,194,222,0.3)] grid grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center px-8 border-r border-[#00c2de]/20">
          <h1 className="text-4xl md:text-5xl font-black tracking-[0.15em] text-[#00c2de] drop-shadow-[0_0_15px_rgba(0,194,222,0.9)]">
            DDAS
          </h1>
        </div>
        <div className="flex flex-col justify-center px-8 py-4">
          <p className="text-sm md:text-base font-mono tracking-[0.15em] text-[#00c2de]/80 uppercase leading-relaxed">
            Data Download
            <br />
            Duplication &
            <br />
            Anomaly Detection System
          </p>
        </div>
      </div>

      <MatrixSky />
      
      <div className="absolute inset-0 pointer-events-none z-0">
        <Canvas camera={{ position: [0, 1, 5], fov: 60 }} gl={{ antialias: true, alpha: true }}>
          <TurbulentFlowingGrid modalOpen={modalOpen} />
        </Canvas>
      </div>

      <div className="relative z-50 flex min-h-screen items-center justify-center px-4">
        {children}
      </div>
    </div>
  );
}