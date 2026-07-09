import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase.js";
import { timeAgo } from "../utils/format.js";

// ── Group Chat Thread (3-person swap ring) ──
export function GroupChatThread({ ownerToken, conversationId, members, onBack, t }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const nameFor = (token) => members.find(m => m.user_token === token)?.nickname || "?";

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("group_messages").select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);
      await supabase.from("group_conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversationId)
        .eq("user_token", ownerToken);
    }
    load();

    const ch = supabase.channel(`group-chat-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
        if (payload.new.sender_token !== ownerToken) {
          supabase.from("group_conversation_participants")
            .update({ last_read_at: new Date().toISOString() })
            .eq("conversation_id", conversationId)
            .eq("user_token", ownerToken)
            .then(() => {});
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [conversationId, ownerToken]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText("");
    try {
      const { data } = await supabase.from("group_messages").insert({
        conversation_id: conversationId,
        sender_token: ownerToken,
        text: msgText,
      }).select().single();
      if (data) setMessages(prev => prev.find(m => m.id === data.id) ? prev : [...prev, data]);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0 12px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", padding: "4px 8px", color: "#333" }}>←</button>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#333" }}>{t.groupTitle(members.length)}</div>
          <div style={{ fontSize: 11, color: "#888", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {members.map(m => m.nickname).join(", ")}
          </div>
        </div>
      </div>
      <div ref={scrollRef} style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.map(msg => {
          const isMe = msg.sender_token === ownerToken;
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", padding: "0 4px" }}>
              {!isMe && <div style={{ fontSize: 10, color: "#aaa", margin: "0 2px 2px" }}>{nameFor(msg.sender_token)}</div>}
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
