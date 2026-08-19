import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Torus, Box, Icosahedron, Sphere } from "@react-three/drei";

// Same contract as the old CSS/SVG version: a `modalOpen` prop that pushes
// everything outward when the auth panel is open. Each shape still owns
// its own speed/orbit/phase so nothing reads as a single master loop.
const SHAPES = [
  { id: "ring-1", type: "ring", size: 1.6, pos: [-4.2, 1.4, -2], speed: 0.06, orbitR: 0.7, orbitSpeed: 0.05, phase: 0 },
  { id: "ring-2", type: "ring", size: 1.0, pos: [4.6, -1.6, -3], speed: 0.09, orbitR: 0.5, orbitSpeed: 0.07, phase: 2 },
  { id: "hex-1", type: "hex", size: 0.7, pos: [4.0, 2.0, -1.5], speed: 0.12, orbitR: 0.4, orbitSpeed: 0.09, phase: 1 },
  { id: "hex-2", type: "hex", size: 0.5, pos: [-3.6, -2.2, -2.5], speed: 0.08, orbitR: 0.6, orbitSpeed: 0.06, phase: 4 },
  { id: "cube-1", type: "cube", size: 0.55, pos: [-4.8, -0.2, -1.8], speed: 0.15, orbitR: 0.3, orbitSpeed: 0.1, phase: 0.5 },
  { id: "cube-2", type: "cube", size: 0.4, pos: [1.2, 2.6, -2.2], speed: 0.11, orbitR: 0.35, orbitSpeed: 0.08, phase: 3 },
  { id: "sphere-1", type: "sphere", size: 1.3, pos: [0.4, -2.6, -3.2], speed: 0.05, orbitR: 0.5, orbitSpeed: 0.04, phase: 1.5 },
];

const WIRE_COLOR = "#7cc7ff";

function GeometryObject({ cfg, modalOpen }) {
  const ref = useRef(null);
  const orbitMultiplier = useRef(1);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime + cfg.phase;

    // ease the orbit multiplier toward its target so modal open/close feels
    // like a continuation, not a snap
    const target = modalOpen ? 1.9 : 1;
    orbitMultiplier.current += (target - orbitMultiplier.current) * delta * 0.6;
    const m = orbitMultiplier.current;

    ref.current.position.x = cfg.pos[0] + Math.sin(t * cfg.orbitSpeed) * cfg.orbitR * m;
    ref.current.position.y = cfg.pos[1] + Math.cos(t * cfg.orbitSpeed * 0.8) * cfg.orbitR * m;
    ref.current.rotation.x += delta * cfg.speed;
    ref.current.rotation.y += delta * cfg.speed * 0.7;

    const mat = ref.current.material;
    if (mat) mat.opacity = 0.18 + (Math.sin(t * 0.6) * 0.5 + 0.5) * 0.22;
  });

  const material = useMemo(
    () => (
      <meshBasicMaterial
        color={WIRE_COLOR}
        wireframe
        transparent
        opacity={0.3}
        toneMapped={false}
      />
    ),
    []
  );

  if (cfg.type === "ring") {
    return (
      <Torus ref={ref} args={[cfg.size, cfg.size * 0.06, 8, 40]} position={cfg.pos}>
        {material}
      </Torus>
    );
  }
  if (cfg.type === "hex") {
    return (
      <Icosahedron ref={ref} args={[cfg.size, 0]} position={cfg.pos}>
        {material}
      </Icosahedron>
    );
  }
  if (cfg.type === "cube") {
    return (
      <Box ref={ref} args={[cfg.size, cfg.size, cfg.size]} position={cfg.pos}>
        {material}
      </Box>
    );
  }
  // sphere
  return (
    <Sphere ref={ref} args={[cfg.size, 16, 12]} position={cfg.pos}>
      {material}
    </Sphere>
  );
}

function Scene({ modalOpen, mouse }) {
  const group = useRef(null);

  useFrame(() => {
    if (!group.current) return;
    // extremely subtle parallax tilt toward cursor
    const targetX = mouse ? mouse.y * 0.06 : 0;
    const targetY = mouse ? mouse.x * 0.08 : 0;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.02;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.02;
  });

  return (
    <group ref={group}>
      {SHAPES.map((cfg) => (
        <GeometryObject key={cfg.id} cfg={cfg} modalOpen={modalOpen} />
      ))}
    </group>
  );
}

export default function FloatingGeometry({ modalOpen, mouse }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <Scene modalOpen={modalOpen} mouse={mouse} />
      </Canvas>
    </div>
  );
}