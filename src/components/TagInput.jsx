import { useState } from "react";

// ── Tag Input for swap areas ──
export function TagInput({ tags, onChange, placeholder, hint }) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim();
    if (v && !tags.includes(v)) { onChange([...tags, v]); }
    setInput("");
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: tags.length ? 8 : 0 }}>
        {tags.map(tag => (
          <span key={tag} style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 16, fontSize: 12, fontWeight: 500,
            background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9",
          }}>
            {tag}
            <span onClick={() => onChange(tags.filter(t => t !== tag))} style={{ cursor: "pointer", fontSize: 14, lineHeight: 1, color: "#999" }}>×</span>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 10, fontSize: 14, border: "1.5px solid #ddd", background: "#fff", color: "#333", outline: "none", boxSizing: "border-box" }}
        />
        <button onClick={add} disabled={!input.trim()} style={{
          padding: "10px 16px", borderRadius: 10, border: "none",
          background: input.trim() ? "#10b981" : "#e0e0d8", color: "#fff",
          fontWeight: 600, fontSize: 13, cursor: "pointer",
        }}>+</button>
      </div>
      {hint && <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
