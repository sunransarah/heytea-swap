import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { getConversationId } from "../utils/chat.js";
import { timeAgo, isExpiredListing } from "../utils/format.js";

// ── Chat Thread (single conversation) ──
export function ChatThread({ ownerToken, otherToken, otherName, otherListing, onBack, onViewListing, t }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const convId = getConversationId(ownerToken, otherToken);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("messages").select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);

      // Mark incoming as read
      await supabase.from("messages")
        .update({ read: true })
        .eq("conversation_id", convId)
        .eq("receiver_token", ownerToken)
        .eq("read", false);
    }
    load();

    const ch = supabase.channel(`chat-${convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        if (payload.new.receiver_token === ownerToken) {
          supabase.from("messages").update({ read: true }).eq("id", payload.new.id).then(() => {});
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [convId, ownerToken, otherToken]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText("");
    try {
      const { data } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_token: ownerToken,
        receiver_token: otherToken,
        text: msgText,
      }).select().single();
      if (data) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }
    } catch (e) { console.error(e); }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0 12px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "4px 8px", color: "#333" }}>←</button>
        <button
          onClick={() => otherListing && onViewListing(otherListing)}
          disabled={!otherListing}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0,
            background: "none", border: "none", padding: 0,
            color: otherListing ? "#333" : "#999", cursor: otherListing ? "pointer" : "default",
            fontWeight: 600, fontSize: 15,
          }}
        >
          <span>{otherName}</span>
          <span style={{
            fontSize: 9, fontWeight: 600, borderRadius: 8, padding: "2px 6px",
            color: otherListing && otherListing.active !== false && !isExpiredListing(otherListing) ? "#10b981" : "#b5651d",
            background: otherListing && otherListing.active !== false && !isExpiredListing(otherListing) ? "rgba(16,185,129,.1)" : "#fff3e0",
          }}>{otherListing && otherListing.active !== false && !isExpiredListing(otherListing) ? "Active post" : otherListing ? "Post expired" : "No post"}</span>
        </button>
      </div>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.map(msg => {
          const isMe = msg.sender_token === ownerToken;
          return (
            <div key={msg.id} style={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", padding: "0 4px" }}>
              <div style={{
                maxWidth: "75%", padding: "9px 14px", borderRadius: 16,
                background: isMe ? "#3b82f6" : "#f0f0ea",
                color: isMe ? "#fff" : "#333",
                fontSize: 14, lineHeight: 1.4,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
              }}>
                {msg.text}
                <div style={{ fontSize: 9, marginTop: 3, opacity: 0.6, textAlign: isMe ? "right" : "left" }}>{timeAgo(msg.created_at, t)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, padding: "10px 0", borderTop: "1px solid #eee", flexShrink: 0 }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={t.chatPh}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 20, fontSize: 14, border: "1.5px solid #ddd", background: "#fff", outline: "none", boxSizing: "border-box" }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending} style={{
          padding: "10px 18px", borderRadius: 20, border: "none",
          background: text.trim() ? "#3b82f6" : "#ccc",
          color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
          opacity: text.trim() ? 1 : 0.5,
        }}>{t.send}</button>
      </div>
    </div>
  );
}
