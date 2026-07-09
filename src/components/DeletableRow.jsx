// ── Chat list row with a persistent, light delete button on the right ──
export function DeletableRow({ children, onDelete, deleteLabel }) {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 6 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      <button
        onClick={e => { e.stopPropagation(); onDelete(); }}
        title={deleteLabel}
        aria-label={deleteLabel}
        style={{
          flexShrink: 0, width: 36, borderRadius: 12, border: "1px solid #eee",
          background: "#f9f9f5", color: "#bbb", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600,
        }}
      >×</button>
    </div>
  );
}
