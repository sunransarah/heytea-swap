import { FlagCircle } from "./FlagCircle.jsx";
import { mName } from "../data/magnets.js";
import { publicLocationLabel } from "../utils/geo.js";
import { timeAgo } from "../utils/format.js";

// ── Summary card for one candidate 3-person swap ring (Browse/Map tab, "多人交换") ──
export function GroupRingCard({ chain, ownerToken, lang, t, creating, exists, onAction }) {
  const n = chain.members.length;
  return (
    <div style={{
      borderRadius: 14, background: "#fff", border: "1.5px solid #eee",
      borderLeft: `5px solid ${chain.color}`, padding: "12px 14px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: chain.color }}>{t.ringLabel(n)}</div>
        <button onClick={onAction} disabled={creating} style={{
          padding: "7px 14px", border: "none", borderRadius: 10,
          background: chain.color, color: "#fff", fontWeight: 600, fontSize: 12,
          cursor: creating ? "default" : "pointer", opacity: creating ? .6 : 1, flexShrink: 0,
        }}>{exists ? t.openGroupChat : t.createGroupChat}</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {chain.members.map((member, i) => {
          // This member gives chain.items[i] away, and receives chain.items[i-1] from whoever precedes them in the ring.
          const haveItem = chain.items[i];
          const wantItem = chain.items[(i - 1 + n) % n];
          const isMe = member.owner_token === ownerToken;
          return (
            <div key={i} style={{
              padding: "7px 10px",
              borderRadius: 10, background: isMe ? chain.color + "12" : "#f9f9f5",
              border: `1px solid ${isMe ? chain.color + "50" : "#eee"}`, fontSize: 13,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 600, color: "#333" }}>{member.nickname}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#333", fontWeight: 500 }}>
                  <FlagCircle id={haveItem} size={18} /> {mName(haveItem, lang)}
                </span>
                <span style={{ color: "#aaa" }}>→</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#333", fontWeight: 500 }}>
                  <FlagCircle id={wantItem} size={18} /> {mName(wantItem, lang)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "#888", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {publicLocationLabel(member, lang)} / {timeAgo(member.created_at, t)}
                {typeof member.__distanceKm === "number" && <span> / {member.__distanceKm.toFixed(1)} km away</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
