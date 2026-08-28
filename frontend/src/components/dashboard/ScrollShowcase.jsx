// frontend/src/components/dashboard/ScrollShowcase.jsx
import React, { useRef, useState } from 'react';

export default function ScrollShowcase({
  onOpenUpload,
  onOpenWatchdog,
  onOpenQuarantine,
  onOpenUsers,
  onOpenRedis,
  isAdmin = false,
  totalDatasets = 0,
  activeThreats = 0,
  quarantinedCount = 0,
}) {
  const containerRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  const cards = [
    {
      step: '01/03',
      title: 'Forensic Ingestion',
      subtitle: 'Multi-Tier Deduplication & CAS',
      description: 'Sharded content-addressable storage (SHA-256) combined with O(1) Locality-Sensitive Hashing candidate pruning and TF-IDF cosine similarity.',
      glowColor: 'rgba(16, 185, 129, 0.15)',
      accentColor: '#10b981',
      badge: 'Tier 1-4 Verification',
      badgeColor: 'text-emerald-300 bg-emerald-950/70 border-emerald-500/40',
      actionLabel: '⚡ Open Ingestion Dropzone',
      actionHandler: onOpenUpload,
      widgetType: 'dedup',
    },
    {
      step: '02/03',
      title: 'Real-Time Telemetry',
      subtitle: 'Distributed Redis & Velocity Defense',
      description: 'Ultra-low latency Valkey/Redis cache cluster with atomic sliding-window rate limiters to intercept high-velocity download exfiltration bursts.',
      glowColor: 'rgba(139, 92, 246, 0.18)',
      accentColor: '#8b5cf6',
      badge: 'Cluster Online • < 0.3ms',
      badgeColor: 'text-violet-300 bg-violet-950/70 border-violet-500/40',
      actionLabel: '⚡ Inspect Task Queue & Cache',
      actionHandler: onOpenRedis,
      widgetType: 'velocity',
    },
    {
      step: '03/03',
      title: 'Autonomous SOC',
      subtitle: 'Incident Containment & Role Matrix',
      description: 'Policy quarantine engine with instantaneous account isolation, dynamic role promotion/demotion, and HMAC-signed outbound SOC webhooks.',
      glowColor: 'rgba(244, 63, 94, 0.15)',
      accentColor: '#f43f5e',
      badge: `${activeThreats} Active Incidents`,
      badgeColor: 'text-rose-300 bg-rose-950/70 border-rose-500/40',
      actionLabel: isAdmin ? '👑 Open Member Directory' : '🛡️ Open Incident Watchdog',
      actionHandler: isAdmin ? onOpenUsers : onOpenWatchdog,
      widgetType: 'soc',
    },
  ];

  const scrollToIndex = (index) => {
    if (containerRef.current) {
      const cardWidth = containerRef.current.offsetWidth;
      containerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth',
      });
      setActiveCard(index);
    }
  };

  return (
    <div className="relative mb-6">
      {/* Scroll Controls Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
            Cyber Threat & Architecture Showcase
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeCard === i ? 'w-6 bg-violet-500 shadow-[0_0_8px_#8b5cf6]' : 'w-2 bg-slate-700 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => scrollToIndex(Math.max(0, activeCard - 1))}
            disabled={activeCard === 0}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ←
          </button>
          <button
            onClick={() => scrollToIndex(Math.min(cards.length - 1, activeCard + 1))}
            disabled={activeCard === cards.length - 1}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {/* Snap Scroll Carousel Container */}
      <div
        ref={containerRef}
        onScroll={(e) => {
          const idx = Math.round(e.currentTarget.scrollLeft / e.currentTarget.offsetWidth);
          if (idx !== activeCard) setActiveCard(idx);
        }}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="min-w-full lg:min-w-[calc(100%-2rem)] snap-center rounded-3xl bg-slate-900/70 border border-slate-800/90 p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6 group hover:border-slate-700 transition-all duration-500"
          >
            {/* Background Ambient Glow */}
            <div
              className="absolute -top-24 -left-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40 transition-all duration-700"
              style={{ background: card.glowColor }}
            />

            {/* Left Column: Text & CTA */}
            <div className="flex-1 space-y-3 z-10">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-950 border border-slate-800 text-slate-300">
                  {card.step}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <div>
                <h3 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {card.title}
                </h3>
                <h4 className="text-sm font-semibold text-slate-400 mt-0.5 font-mono">
                  {card.subtitle}
                </h4>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                {card.description}
              </p>

              <div className="pt-2">
                <button
                  onClick={card.actionHandler}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all flex items-center gap-2 shadow-lg hover:scale-102"
                >
                  <span>{card.actionLabel}</span>
                  <span className="text-slate-400">→</span>
                </button>
              </div>
            </div>

            {/* Right Column: Embedded Cybernetic Micro-Widget */}
            <div className="w-full lg:w-96 z-10">
              {card.widgetType === 'dedup' && (
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 space-y-3 shadow-inner relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      LSH Bucket Indexing
                    </span>
                    <span className="font-mono text-emerald-400 font-bold">{totalDatasets} Datasets</span>
                  </div>

                  {/* Circuit Node Visual */}
                  <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-950/80 border border-emerald-600/60 text-emerald-400">
                        ⚡
                      </span>
                      <div>
                        <div className="font-bold text-white">SHA-256 CAS</div>
                        <div className="text-[9px] text-slate-400">0x518c6e...</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      100% Collision-Proof
                    </span>
                  </div>

                  {/* Pipeline Stage Indicators */}
                  <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400">MinHash</div>
                      <div className="text-cyan-400 font-bold mt-0.5">128 Bands</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400">SimHash</div>
                      <div className="text-amber-400 font-bold mt-0.5">64-Bit</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                      <div className="text-slate-400">TF-IDF</div>
                      <div className="text-violet-400 font-bold mt-0.5">Cosine</div>
                    </div>
                  </div>
                </div>
              )}

              {card.widgetType === 'velocity' && (
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-500 animate-ping" />
                      Sliding-Window Velocity
                    </span>
                    <span className="font-mono text-violet-400 font-bold">6 req / 30s Limit</span>
                  </div>

                  {/* Telemetry Metric Bars */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                        <span>Cache Hit Ratio</span>
                        <span className="text-emerald-400 font-bold">99.7%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[99.7%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                        <span>Background Task Worker</span>
                        <span className="text-violet-400 font-bold">Active</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-violet-500 h-full w-4/5" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800 font-mono">
                    <span>Engine: Valkey / Redis</span>
                    <span className="text-cyan-400">Latency: 0.28ms</span>
                  </div>
                </div>
              )}

              {card.widgetType === 'soc' && (
                <div className="rounded-2xl bg-slate-950/80 border border-slate-800/80 p-4 space-y-2.5 shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      Identity & Containment Matrix
                    </span>
                    <span className="font-mono text-rose-400 font-bold">{quarantinedCount} Quarantined</span>
                  </div>

                  {/* Member Role Nodes */}
                  <div className="space-y-1.5 text-[11px] font-mono">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-violet-600/30 border border-violet-500/50 flex items-center justify-center text-[10px]">👑</span>
                        <span className="font-bold text-white">SOC Admin</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 text-[10px]">Full 10 Perms</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-cyan-600/30 border border-cyan-500/50 flex items-center justify-center text-[10px]">🎓</span>
                        <span className="font-bold text-slate-300">Student User</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">INTERNAL Clear</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
                    <span>Audit Trail: Immutable</span>
                    <span className="text-emerald-400">HMAC-SHA256</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
