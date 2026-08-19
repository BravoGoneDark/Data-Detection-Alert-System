import { useEffect, useRef } from "react";

const CONNECT_DISTANCE = 150;
const PACKET_INTERVAL = [4000, 9000]; // ms range between packet spawns

export default function NetworkParticles({ modalOpen, mouse }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({ nodes: [], packets: [] });
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width, height;
    const resize = () => {
      width = canvas.width = canvas.offsetWidth * devicePixelRatio;
      height = canvas.height = canvas.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);

    const nodeCount = window.innerWidth < 768 ? 20 : window.innerWidth < 1200 ? 36 : 52;
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.004 + Math.random() * 0.006,
    }));
    stateRef.current.nodes = nodes;

    let lastPacketAt = performance.now();
    let nextPacketDelay =
      PACKET_INTERVAL[0] + Math.random() * (PACKET_INTERVAL[1] - PACKET_INTERVAL[0]);

    const spawnPacket = (edges) => {
      if (!edges.length) return;
      const edge = edges[Math.floor(Math.random() * edges.length)];
      stateRef.current.packets.push({ from: edge.a, to: edge.b, t: 0 });
    };

    const draw = (now) => {
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.scale(devicePixelRatio, devicePixelRatio);

      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      const cx = w / 2;
      const cy = h / 2;
      const quietRadius = modalOpen ? Math.min(w, h) * 0.32 : 0;

      const edges = [];

      for (const n of nodes) {
        if (!reduce) {
          n.x += n.vx;
          n.y += n.vy;
          if (mouse) {
            n.x += mouse.x * 0.04;
            n.y += mouse.y * 0.04;
          }
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
          n.pulse += n.pulseSpeed;
        }
      }

      // connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DISTANCE) {
            const distFromCenter = Math.hypot((a.x + b.x) / 2 - cx, (a.y + b.y) / 2 - cy);
            const quiet = modalOpen && distFromCenter < quietRadius ? 0.15 : 1;
            const alpha = (1 - dist / CONNECT_DISTANCE) * 0.35 * quiet;
            ctx.strokeStyle = `rgba(110,190,255,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            edges.push({ a, b });
          }
        }
      }

      // nodes
      for (const n of nodes) {
        const distFromCenter = Math.hypot(n.x - cx, n.y - cy);
        const quiet = modalOpen && distFromCenter < quietRadius ? 0.2 : 1;
        const glow = (0.5 + Math.sin(n.pulse) * 0.5) * quiet;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 1.6 + glow * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(140,210,255,${0.25 + glow * 0.5})`;
        ctx.fill();
      }

      // data packets — rare, meaningful
      if (!reduce && now - lastPacketAt > nextPacketDelay) {
        spawnPacket(edges);
        lastPacketAt = now;
        nextPacketDelay =
          PACKET_INTERVAL[0] + Math.random() * (PACKET_INTERVAL[1] - PACKET_INTERVAL[0]);
      }

      stateRef.current.packets = stateRef.current.packets.filter((p) => p.t <= 1);
      for (const p of stateRef.current.packets) {
        p.t += 0.012;
        const x = p.from.x + (p.to.x - p.from.x) * p.t;
        const y = p.from.y + (p.to.y - p.from.y) * p.t;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(160,255,230,0.9)";
        ctx.shadowColor = "rgba(160,255,230,0.9)";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}