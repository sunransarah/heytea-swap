import { mFind } from "../data/magnets.js";

export function FlagCircle({ id, size = 28 }) {
  const m = mFind(id);
  if (!m) return null;
  const r = size / 2;
  if (id === "hid") return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - .5} fill="#FFD700" stroke="#DAA520" strokeWidth=".5" />
      <text x={r} y={r + 1} textAnchor="middle" dominantBaseline="central" fontSize={size * .45} fill="#8B6914" fontWeight="700">?</text>
    </svg>
  );
  return (
    <img
      src={`/flags/${id}.svg`}
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover", display: "block", flexShrink: 0, boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.15)" }}
    />
  );
}
