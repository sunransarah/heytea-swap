import { isMatchAny } from "../utils/matching.js";
import { toArr } from "../utils/format.js";
import { FlagCircle } from "./FlagCircle.jsx";

// ── Fallback map (no API key) ──
export function FallbackMapView({ listings, onSelect, myListings = [], isWide = false }) {
  const B = { minLat: 43.55, maxLat: 43.92, minLng: -79.75, maxLng: -79.15 };
  const toX = lng => Math.min(100, Math.max(0, ((lng - B.minLng) / (B.maxLng - B.minLng)) * 100));
  const toY = lat => Math.min(100, Math.max(0, (1 - (lat - B.minLat) / (B.maxLat - B.minLat)) * 100));
  const areas = [
    { n: "Downtown", x: 55, y: 68 }, { n: "Markham", x: 72, y: 28 },
    { n: "Scarborough", x: 82, y: 48 }, { n: "North York", x: 48, y: 40 },
    { n: "Mississauga", x: 18, y: 58 }, { n: "Richmond Hill", x: 58, y: 22 },
  ];

  const myIds = new Set(myListings.map(l => l.id));
  const allListings = myListings.length
    ? [...myListings, ...listings.filter(l => !myIds.has(l.id))]
    : listings;

  return (
    <div style={{
      position: "relative", width: "100%", height: isWide ? "clamp(360px, 48vh, 560px)" : "auto", paddingBottom: isWide ? 0 : "72%",
      background: "linear-gradient(145deg,#e9f2e9,#d6e6d6 50%,#ccdccc)",
      borderRadius: 16, overflow: "hidden", border: "1px solid #e0e0d8",
    }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "16%", background: "linear-gradient(to bottom,rgba(100,160,210,.1),rgba(100,160,210,.25))" }} />
      <span style={{ position: "absolute", bottom: "4%", right: "6%", fontSize: 10, color: "rgba(60,100,140,.35)", fontWeight: 500 }}>Lake Ontario</span>
      {areas.map(a => <span key={a.n} style={{ position: "absolute", left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%,-50%)", fontSize: 9, color: "rgba(0,0,0,.18)", fontWeight: 500, pointerEvents: "none" }}>{a.n}</span>)}
      {allListings.map(l => {
        const isMine = myIds.has(l.id);
        const matched = !isMine && isMatchAny(myListings, l);
        const haveArr = toArr(l.have);
        const x = toX(l.lng), y = toY(l.lat);
        return (
          <div key={l.id}>
            {matched && (
              <div className="match-glow" style={{
                position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
                width: 50, height: 50, borderRadius: "50%",
                background: "rgba(16,185,129,.15)", border: "2px solid rgba(16,185,129,.3)",
                pointerEvents: "none", zIndex: 0,
              }} />
            )}
            {isMine && (
              <div style={{
                position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
                width: 60, height: 60, borderRadius: "50%",
                background: "rgba(59,130,246,.08)", border: "1.5px solid rgba(59,130,246,.2)",
                pointerEvents: "none", zIndex: 0,
              }} />
            )}
            <button onClick={() => onSelect(l)} aria-label={l.nickname} style={{
              position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
              width: isMine ? 36 : matched ? 34 : 26, height: isMine ? 36 : matched ? 34 : 26,
              borderRadius: "50%",
              background: isMine ? "#3b82f6" : "#fff",
              border: isMine ? "3px solid #1d4ed8" : matched ? "3px solid #10b981" : "2px solid #fff",
              boxShadow: matched ? "0 0 12px rgba(16,185,129,.5), 0 0 24px rgba(16,185,129,.2)" : "0 1px 4px rgba(0,0,0,.25)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              animation: matched ? "matchPulse 2s infinite" : "none",
              zIndex: isMine ? 20 : matched ? 10 : 1, padding: 0, overflow: "hidden",
            }}>
              {isMine ? <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>Me</span>
                : <FlagCircle id={haveArr[0]} size={matched ? 26 : 22} />}
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes matchPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(16,185,129,.5), 0 0 24px rgba(16,185,129,.2); }
          50% { box-shadow: 0 0 20px rgba(16,185,129,.7), 0 0 40px rgba(16,185,129,.3); }
        }
        @keyframes glowPulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%,-50%) scale(1.3); opacity: 0.5; }
        }
        .match-glow { animation: glowPulse 2s infinite ease-in-out; }
      `}</style>
    </div>
  );
}
