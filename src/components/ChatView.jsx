import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase.js";
import { toArr, readableBadgeColor, timeAgo, isExpiredListing } from "../utils/format.js";
import { mColor } from "../data/magnets.js";
import { latestListingForOwner } from "../utils/chat.js";
import { DeletableRow } from "./DeletableRow.jsx";

export function ChatView({ ownerToken, allListings, t, onOpenChat, onViewListing, groupConversations = [], onOpenGroupChat }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hiddenMap, setHiddenMap] = useState({}); // conversation_id -> hidden_at

  const loadHidden = useCallback(async () => {
    if (!ownerToken) return;
    const { data } = await supabase.from("hidden_conversations").select("conversation_id, hidden_at").eq("user_token", ownerToken);
    const map = {};
    (data || []).forEach(h => { map[h.conversation_id] = h.hidden_at; });
    setHiddenMap(map);
  }, [ownerToken]);

  useEffect(() => { loadHidden(); }, [loadHidden]);

  const handleDelete = useCallback(async (convId) => {
    const hiddenAt = new Date().toISOString();
    setHiddenMap(prev => ({ ...prev, [convId]: hiddenAt }));
    await supabase.from("hidden_conversations").upsert(
      { user_token: ownerToken, conversation_id: convId, hidden_at: hiddenAt },
      { onConflict: "user_token,conversation_id" }
    );
  }, [ownerToken]);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_token.eq.${ownerToken},receiver_token.eq.${ownerToken}`)
        .order("created_at", { ascending: false });
      if (data) {
        const convMap = {};
        data.forEach(msg => {
          if (!convMap[msg.conversation_id]) {
            convMap[msg.conversation_id] = {
              id: msg.conversation_id,
              lastMessage: msg,
              otherToken: msg.sender_token === ownerToken ? msg.receiver_token : msg.sender_token,
              unread: 0,
            };
          }
          if (!msg.read && msg.receiver_token === ownerToken) convMap[msg.conversation_id].unread++;
        });
        setConversations(Object.values(convMap));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [ownerToken]);

  useEffect(() => {
    loadConversations();
    const ch = supabase.channel("chat-list")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new.sender_token === ownerToken || payload.new.receiver_token === ownerToken) loadConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerToken, loadConversations]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>{t.loading}</div>;

  // Hidden (swiped-deleted) conversations stay hidden until a newer message arrives — same as WeChat.
  const isHidden = (id, lastMessageAt) => {
    const hiddenAt = hiddenMap[id];
    if (!hiddenAt) return false;
    return !lastMessageAt || new Date(lastMessageAt) <= new Date(hiddenAt);
  };

  const items = [
    ...conversations.map(c => ({ type: "direct", key: `d-${c.id}`, sortAt: c.lastMessage.created_at, data: c })),
    ...groupConversations.map(c => ({ type: "group", key: `g-${c.id}`, sortAt: c.lastMessage?.created_at || c.joinedAt, data: c })),
  ]
    .filter(item => !isHidden(item.data.id, item.data.lastMessage?.created_at))
    .sort((a, b) => new Date(b.sortAt) - new Date(a.sortAt));

  if (items.length === 0) return (
    <div style={{ textAlign: "center", padding: 50, color: "#aaa" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#888" }}>{t.noChats}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{t.noChatsDesc}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(item => (
        <DeletableRow key={item.key} onDelete={() => handleDelete(item.data.id)} deleteLabel={t.deleteChat}>
          {item.type === "group" ? (
            <GroupConversationRow conv={item.data} t={t} onOpenGroupChat={onOpenGroupChat} />
          ) : (
            <DirectConversationRow conv={item.data} ownerToken={ownerToken} allListings={allListings} t={t} onOpenChat={onOpenChat} onViewListing={onViewListing} />
          )}
        </DeletableRow>
      ))}
    </div>
  );
}

function DirectConversationRow({ conv, ownerToken, allListings, t, onOpenChat, onViewListing }) {
  const other = latestListingForOwner(allListings, conv.otherToken);
  const hasActivePost = !!other && other.active !== false && !isExpiredListing(other);
  const postStatus = hasActivePost ? "Active post" : other ? "Post expired" : "No post";
  const name = other?.nickname || "User";
  const haveArr = other ? toArr(other.have) : [];
  const c = haveArr.length ? mColor(haveArr[0]) : "#888";
  return (
    <div onClick={() => onOpenChat(conv.otherToken, name)}
      style={{
        padding: "12px 14px", background: conv.unread > 0 ? "rgba(59,130,246,.04)" : "#fff",
        border: `1.5px solid ${conv.unread > 0 ? "#3b82f6" : "#e5e5e0"}`,
        borderRadius: 14, cursor: "pointer",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: c + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, fontWeight: 600, color: readableBadgeColor(c), flexShrink: 0,
        }}>{name[0]}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={e => { e.stopPropagation(); if (other) onViewListing(other); }}
              disabled={!other}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0,
                background: "none", border: "none", padding: 0,
                color: other ? "#333" : "#999", cursor: other ? "pointer" : "default",
                fontWeight: 600, fontSize: 14,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
              <span style={{
                flexShrink: 0, fontSize: 9, fontWeight: 600, borderRadius: 8, padding: "2px 6px",
                color: hasActivePost ? "#10b981" : "#b5651d",
                background: hasActivePost ? "rgba(16,185,129,.1)" : "#fff3e0",
              }}>{postStatus}</span>
            </button>
            <span style={{ fontSize: 10, color: "#aaa" }}>{timeAgo(conv.lastMessage.created_at, t)}</span>
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conv.lastMessage.sender_token === ownerToken ? `${t.me}: ` : ""}{conv.lastMessage.text}
          </div>
        </div>
        {conv.unread > 0 && (
          <div style={{
            minWidth: 20, height: 20, borderRadius: 10, background: "#3b82f6",
            color: "#fff", fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px", flexShrink: 0,
          }}>{conv.unread}</div>
        )}
      </div>
    </div>
  );
}

function GroupConversationRow({ conv, t, onOpenGroupChat }) {
  const names = conv.members.map(m => m.nickname).join(", ");
  return (
    <div onClick={() => onOpenGroupChat(conv.id)}
      style={{
        padding: "12px 14px", background: conv.unread > 0 ? "rgba(16,185,129,.05)" : "#fff",
        border: `1.5px solid ${conv.unread > 0 ? "#10b981" : "#e5e5e0"}`,
        borderRadius: 14, cursor: "pointer",
      }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", background: "#10b98115",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, color: "#10b981", flexShrink: 0,
        }}>{conv.members.length}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0, fontWeight: 600, fontSize: 14, color: "#333" }}>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names}</span>
              <span style={{
                flexShrink: 0, fontSize: 9, fontWeight: 600, borderRadius: 8, padding: "2px 6px",
                color: "#10b981", background: "rgba(16,185,129,.1)",
              }}>{t.groupChatTag}</span>
            </span>
            {conv.lastMessage && <span style={{ fontSize: 10, color: "#aaa" }}>{timeAgo(conv.lastMessage.created_at, t)}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {conv.lastMessage ? conv.lastMessage.text : t.groupTitle(conv.members.length)}
          </div>
        </div>
        {conv.unread > 0 && (
          <div style={{
            minWidth: 20, height: 20, borderRadius: 10, background: "#10b981",
            color: "#fff", fontSize: 11, fontWeight: 600,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 5px", flexShrink: 0,
          }}>{conv.unread}</div>
        )}
      </div>
    </div>
  );
}
