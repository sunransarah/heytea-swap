import { isMatchAny } from "../utils/matching.js";
import { toArr, readableBadgeColor, timeAgo, isExpiredListing } from "../utils/format.js";
import { publicLocationLabel } from "../utils/geo.js";
import { mColor } from "../data/magnets.js";
import { MagnetPill } from "./MagnetPill.jsx";

// ── Listing Card ──
export function ListingCard({ listing: l, myListings = [], onMessage, expanded, onToggle, lang, t }) {
  const isMine = myListings.some(m => m.id === l.id);
  const isUnavailable = l.active === false || isExpiredListing(l);
  const matched = !isMine && isMatchAny(myListings, l);
  const haveArr = toArr(l.have);
  const firstColor = mColor(haveArr[0]);
  return (
    <div onClick={onToggle} style={{
      padding: "12px 14px",
      background: isMine ? "rgba(59,130,246,.04)" : matched ? "rgba(16,185,129,.04)" : "#fff",
      border: `1.5px solid ${isMine ? "#3b82f6" : matched ? "#10b981" : "#e5e5e0"}`,
      borderRadius: 14, cursor: "pointer", transition: "all .12s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: isMine ? "rgba(59,130,246,.15)" : firstColor + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 600, color: isMine ? "#3b82f6" : readableBadgeColor(firstColor), flexShrink: 0,
          boxShadow: matched ? "0 0 10px rgba(16,185,129,.4)" : "none",
        }}>{l.nickname?.[0]}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#222" }}>{l.nickname}</span>
            {isMine && <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, background: "rgba(59,130,246,.1)", padding: "2px 8px", borderRadius: 10 }}>{t.me}</span>}
            {matched && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600, background: "rgba(16,185,129,.1)", padding: "2px 8px", borderRadius: 10 }}>{t.matchLabel}</span>}
            {isUnavailable && <span style={{ fontSize: 10, color: "#b5651d", fontWeight: 600, background: "#fff3e0", padding: "2px 8px", borderRadius: 10 }}>Post expired</span>}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {publicLocationLabel(l, lang)} / {timeAgo(l.created_at, t)}
            {typeof l.__distanceKm === "number" && <span> / {l.__distanceKm.toFixed(1)} km away</span>}
          </div>
        </div>
      </div>
      {/* Have magnets */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#888" }}>{t.have}</span>
        {haveArr.map(h => <MagnetPill key={h} id={h} lang={lang} selected size="sm" />)}
        <span style={{ fontSize: 11, color: "#aaa", margin: "0 1px" }}>→</span>
        <span style={{ fontSize: 11, color: "#888" }}>{t.want}</span>
        {l.want?.map(w => <MagnetPill key={w} id={w} lang={lang} size="sm" />)}
      </div>
      {/* Swap areas */}
      {l.swap_areas?.length > 0 && (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: "#999" }}>📍</span>
          {l.swap_areas.map(a => (
            <span key={a} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 8, background: "#f0f7ff", color: "#5b8cb5", fontWeight: 500 }}>{a}</span>
          ))}
        </div>
      )}
      {/* Expanded actions */}
      {expanded && !isMine && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
          {isUnavailable && <div style={{ fontSize: 12, color: "#b5651d", marginBottom: 8 }}>This user's post is no longer active.</div>}
          {!isUnavailable && matched && (
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 500, marginBottom: 8 }}>
              {t.matchDesc}
            </div>
          )}
          {!isUnavailable && !matched && <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{myListings.length ? t.noMatchYet : t.postFirst}</div>}
          {!isUnavailable && myListings.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={e => { e.stopPropagation(); onMessage(l); }} style={{
                flex: 1, padding: "10px 0", border: "none", borderRadius: 10,
                background: matched ? "#10b981" : "#333", color: "#fff",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}>{t.msgBtn}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
