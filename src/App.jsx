import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase.js";
import { reverseGeocodeLabel } from "./lib/googleMaps.js";
import { MAGNETS, mColor } from "./data/magnets.js";
import { T } from "./data/translations.js";
import { toArr, EXPIRY_OPTIONS, generateNickname, expiresAtFromDays, expiryDaysFromListing, isExpiredListing } from "./utils/format.js";
import { distanceKm, MAP_NEARBY_RADIUS_KM, publicLocationLabel } from "./utils/geo.js";
import { isMatchAny, findSwapChains, canonicalMatchKey, chainTotalDistance, RING_COLORS } from "./utils/matching.js";
import { getConversationId, latestListingForOwner } from "./utils/chat.js";
import { useViewportWidth } from "./hooks/useViewportWidth.js";
import { FlagCircle } from "./components/FlagCircle.jsx";
import { MagnetPill } from "./components/MagnetPill.jsx";
import { TagInput } from "./components/TagInput.jsx";
import { GoogleMapView } from "./components/GoogleMapView.jsx";
import { AddressInput } from "./components/AddressInput.jsx";
import { ListingCard } from "./components/ListingCard.jsx";
import { ChatView } from "./components/ChatView.jsx";
import { ChatThread } from "./components/ChatThread.jsx";
import { GroupRingCard } from "./components/GroupRingCard.jsx";
import { GroupChatThread } from "./components/GroupChatThread.jsx";

// ════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("heytea-lang") || "cn");
  const t = T[lang];
  const [tab, setTab] = useState("map");
  const [listings, setListings] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [filterMagnet, setFilterMagnet] = useState("");
  const [loading, setLoading] = useState(true);
  const [chatPreviewListing, setChatPreviewListing] = useState(null);
  const [pendingOfflineListing, setPendingOfflineListing] = useState(null);
  const [offlineDeleting, setOfflineDeleting] = useState(false);

  // Chat state
  const [chatTarget, setChatTarget] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Group swap chain state
  const [groupChatTarget, setGroupChatTarget] = useState(null); // { conversationId, members }
  const [groupConversations, setGroupConversations] = useState([]); // conversations I'm part of, for the chat list
  const [groupUnreadCount, setGroupUnreadCount] = useState(0);

  // Editing state — which of my listings (if any) is currently being edited. "new" = creating a fresh one.
  const [editingId, setEditingId] = useState(null);

  // Distance filter state (Discover tab)
  const [distanceKmFilter, setDistanceKmFilter] = useState("20"); // "" = no filter
  const [browseSort, setBrowseSort] = useState("newest");
  // { lat, lng, label, source: "gps" | "manual" | "listing" } — persisted so it survives reloads and is shared by Map/Browse.
  const [myLocation, setMyLocation] = useState(() => {
    try { return JSON.parse(localStorage.getItem("heytea-my-location")); } catch { return null; }
  });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [locationErrorDetail, setLocationErrorDetail] = useState("");
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locationSearchInput, setLocationSearchInput] = useState("");
  const autoLocationPromptRef = useRef(false);

  // Form state
  const [fCountry, setFCountry] = useState("");
  const [fCity, setFCity] = useState("");
  const [fAddr, setFAddr] = useState("");
  const [fLat, setFLat] = useState(null);
  const [fLng, setFLng] = useState(null);
  const [fHave, setFHave] = useState([]);
  const [fWant, setFWant] = useState([]);
  const [fAreas, setFAreas] = useState([]);
  const [fExpireDays, setFExpireDays] = useState("3");
  const [posting, setPosting] = useState(false);

  // undefined = still checking; null = signed out; object = signed in
  const [session, setSession] = useState(undefined);
  const ownerToken = session?.user?.id;

  // Durable per-account nickname (survives device/browser switches), auto-generated on first sign-in.
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ownerToken) { setProfile(null); return; }
    let cancelled = false;
    async function loadOrCreateProfile() {
      const { data: existing } = await supabase.from("profiles").select("id, nickname").eq("id", ownerToken).maybeSingle();
      if (existing) { if (!cancelled) setProfile(existing); return; }
      await supabase.from("profiles").upsert({ id: ownerToken, nickname: generateNickname() }, { onConflict: "id", ignoreDuplicates: true });
      const { data: created } = await supabase.from("profiles").select("id, nickname").eq("id", ownerToken).single();
      if (!cancelled) setProfile(created);
    }
    loadOrCreateProfile().catch(console.error);
    return () => { cancelled = true; };
  }, [ownerToken]);

  // Username + password auth (alternative to Google sign-in, e.g. for users where Google is unavailable).
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup"
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [showAuthPassword, setShowAuthPassword] = useState(false);

  const submitUsernameAuth = useCallback(async () => {
    const username = authUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) { setAuthError(t.authUsernameInvalid); return; }
    if (authPassword.length < 6) { setAuthError(t.authPasswordInvalid); return; }
    setAuthError("");
    setAuthBusy(true);
    const email = `${username}@users.heytea-swap.app`;
    const { data, error } = authMode === "signup"
      ? await supabase.auth.signUp({ email, password: authPassword })
      : await supabase.auth.signInWithPassword({ email, password: authPassword });
    if (error) {
      if (authMode === "signup") {
        setAuthError(/already registered/i.test(error.message) ? t.authUsernameTaken : error.message);
      } else {
        setAuthError(t.authFailed);
      }
      setAuthBusy(false);
      return;
    }
    if (authMode === "signup" && data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, nickname: username }, { onConflict: "id" });
    }
    setAuthBusy(false);
  }, [authUsername, authPassword, authMode, t]);

  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);

  const saveNickname = useCallback(async () => {
    const nickname = nicknameInput.trim();
    if (!nickname || nickname === profile?.nickname) { setEditingNickname(false); return; }
    setSavingNickname(true);
    try {
      const { error } = await supabase.from("profiles").update({ nickname }).eq("id", ownerToken);
      if (error) throw error;
      await supabase.from("listings").update({ nickname }).eq("owner_token", ownerToken);
      setProfile(prev => ({ ...prev, nickname }));
      setListings(prev => prev.map(l => l.owner_token === ownerToken ? { ...l, nickname } : l));
      setEditingNickname(false);
    } catch (e) {
      console.error(e);
      alert(`Failed to save: ${e?.message || "Please try again."}`);
    }
    setSavingNickname(false);
  }, [nicknameInput, profile, ownerToken]);

  const resetForm = () => {
    setFCountry(""); setFCity(""); setFAddr(""); setFLat(null); setFLng(null);
    setFHave([]); setFWant([]); setFAreas([]); setFExpireDays("3");
  };

  // ── Load listings ──
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("listings")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false });
        if (data) setListings(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();

    const ch = supabase.channel("listings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, (payload) => {
        if (payload.eventType === "INSERT") {
          if (payload.new.active !== false) {
            setListings(prev => [payload.new, ...prev.filter(l => l.id !== payload.new.id)]);
          }
        } else if (payload.eventType === "UPDATE") {
          if (!payload.new.active) {
            setListings(prev => prev.filter(l => l.id !== payload.new.id));
          } else {
            setListings(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
          }
        } else if (payload.eventType === "DELETE") {
          setListings(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ── Unread count ──
  useEffect(() => {
    if (!ownerToken) return;
    async function countUnread() {
      try {
        const { count } = await supabase.from("messages").select("*", { count: "exact", head: true }).eq("receiver_token", ownerToken).eq("read", false);
        setUnreadCount(count || 0);
      } catch (e) { /* messages table might not exist yet */ }
    }
    countUnread();
    const ch = supabase.channel("unread-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => countUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerToken]);

  // ── Group swap chats: load conversations I'm in (for the chat list + unread badge) ──
  const loadGroupConversations = useCallback(async () => {
    if (!ownerToken) { setGroupConversations([]); return; }
    try {
      const { data: mine } = await supabase.from("group_conversation_participants").select("*").eq("user_token", ownerToken);
      if (!mine || !mine.length) { setGroupConversations([]); return; }
      const convIds = mine.map(p => p.conversation_id);
      const [{ data: allParts }, { data: allMsgs }] = await Promise.all([
        supabase.from("group_conversation_participants").select("*").in("conversation_id", convIds),
        supabase.from("group_messages").select("*").in("conversation_id", convIds).order("created_at", { ascending: false }),
      ]);
      const convs = mine.map(p => {
        const members = (allParts || []).filter(x => x.conversation_id === p.conversation_id);
        const msgsForConv = (allMsgs || []).filter(m => m.conversation_id === p.conversation_id);
        const lastMessage = msgsForConv[0] || null;
        const unread = msgsForConv.filter(m => m.sender_token !== ownerToken && new Date(m.created_at) > new Date(p.last_read_at)).length;
        return { id: p.conversation_id, members, lastMessage, unread, joinedAt: p.joined_at };
      });
      setGroupConversations(convs);
    } catch (e) { console.error(e); }
  }, [ownerToken]);

  useEffect(() => {
    loadGroupConversations();
    if (!ownerToken) return;
    const ch = supabase.channel("group-chat-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_messages" }, () => loadGroupConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_conversation_participants" }, (payload) => {
        if (payload.new?.user_token === ownerToken || payload.old?.user_token === ownerToken) loadGroupConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [ownerToken, loadGroupConversations]);

  useEffect(() => {
    setGroupUnreadCount(groupConversations.reduce((sum, c) => sum + c.unread, 0));
  }, [groupConversations]);

  // Re-opening a conversation (direct or group) always un-hides it from the chat list again,
  // even before any new message is sent — a swiped-delete shouldn't stick once you've gone back in.
  const unhideConversation = useCallback((convId) => {
    if (!ownerToken || !convId) return;
    supabase.from("hidden_conversations").delete().eq("user_token", ownerToken).eq("conversation_id", convId).then(() => {});
  }, [ownerToken]);

  const openGroupChat = useCallback((conversationId) => {
    const conv = groupConversations.find(c => c.id === conversationId);
    if (!conv) return;
    unhideConversation(conversationId);
    setGroupChatTarget({ conversationId, members: conv.members });
    setChatTarget(null);
  }, [groupConversations, unhideConversation]);

  useEffect(() => { localStorage.setItem("heytea-lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("heytea-my-location", JSON.stringify(myLocation)); }, [myLocation]);

  useEffect(() => {
    if (tab !== "map" || myLocation || autoLocationPromptRef.current) return;
    autoLocationPromptRef.current = true;
    setShowLocationModal(true);
    setLocationSearchInput("");
  }, [tab, myLocation]);

  // ── Geolocation for distance filter ──
  const fetchGpsLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError(true); setLocationErrorDetail("no navigator.geolocation"); return; }
    setLocating(true);
    setLocationError(false);
    setLocationErrorDetail("");
    // Some mobile Chrome builds leave a bare getCurrentPosition() call hanging
    // indefinitely (a documented Chromium quirk: it's more reliable once a
    // watchPosition is active), so we watch and stop after the first fix.
    // The safety-net timeout below stays longer than the browser's own `timeout`
    // option so it never preempts a response that's still legitimately in flight.
    let settled = false;
    let watchId = null;
    const stopWatching = () => { if (watchId != null) navigator.geolocation.clearWatch(watchId); };
    const giveUp = setTimeout(() => {
      if (settled) return;
      settled = true;
      stopWatching();
      setLocating(false);
      setLocationError(true);
      setLocationErrorDetail("timed out — browser never responded");
    }, 18000);
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (settled) return;
        settled = true;
        clearTimeout(giveUp);
        stopWatching();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMyLocation({ lat, lng, label: "", source: "gps" });
        setLocating(false);
        setShowLocationModal(false);
        reverseGeocodeLabel(lat, lng).then(label => {
          if (!label) return;
          setMyLocation(prev => (prev && prev.source === "gps" && prev.lat === lat && prev.lng === lng) ? { ...prev, label } : prev);
        });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(giveUp);
        stopWatching();
        setLocating(false);
        setLocationError(true);
        setLocationErrorDetail(err ? `code ${err.code}: ${err.message}` : "unknown error");
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const activeListings = useMemo(() => listings.filter(l => l.active !== false && !isExpiredListing(l)), [listings]);

  // All of my own active listings
  const myListings = useMemo(() => activeListings.filter(l => l.owner_token === ownerToken), [activeListings, ownerToken]);

  const locationReferenceCoords = useMemo(() => {
    if (myLocation) return myLocation;
    const ref = myListings.find(l => l.lat && l.lng);
    return ref ? { lat: ref.lat, lng: ref.lng, source: "listing" } : null;
  }, [myLocation, myListings]);

  const applySearchedLocation = useCallback(({ address, lat, lng, city }) => {
    if (lat == null || lng == null) return;
    setMyLocation({ lat, lng, label: address || city || "", source: "manual" });
    setLocationError(false);
    setShowLocationModal(false);
  }, []);

  // Active listings narrowed by location/distance only (not by magnet filter) — shared
  // by `filtered` and `availableMagnets` so the country chips reflect the same distance cutoff.
  const distanceFilteredListings = useMemo(() => {
    const includePreview = chatPreviewListing && !activeListings.some(l => l.id === chatPreviewListing.id);
    let res = includePreview ? [chatPreviewListing, ...activeListings] : activeListings;
    const ref = locationReferenceCoords;
    if (ref) {
      res = res.map(l => {
        if (l.owner_token === ownerToken) return l;
        const d = distanceKm(ref.lat, ref.lng, l.lat, l.lng);
        return d == null ? l : { ...l, __distanceKm: d };
      });
    }
    if (distanceKmFilter && ref) {
      const maxKm = Number(distanceKmFilter);
      res = res.filter(l => l.owner_token === ownerToken || (l.__distanceKm != null && l.__distanceKm <= maxKm));
    }
    return res;
  }, [activeListings, chatPreviewListing, ownerToken, distanceKmFilter, locationReferenceCoords]);

  const mapReferenceCoords = useMemo(() => {
    return locationReferenceCoords;
  }, [locationReferenceCoords]);

  // Nearby listings for the Map tab, capped at MAP_NEARBY_RADIUS_KM — deliberately independent of
  // filterMagnet/browseSort so ring search always sees the full local candidate pool, not whatever
  // magnet chip happens to be selected.
  const mapNearbyListings = useMemo(() => {
    if (!mapReferenceCoords) return distanceFilteredListings;
    return distanceFilteredListings
      .map(l => {
        if (l.owner_token === ownerToken) return l;
        const d = distanceKm(mapReferenceCoords.lat, mapReferenceCoords.lng, l.lat, l.lng);
        return d == null ? null : { ...l, __distanceKm: d };
      })
      .filter(l => l && (l.owner_token === ownerToken || l.__distanceKm <= MAP_NEARBY_RADIUS_KM));
  }, [distanceFilteredListings, mapReferenceCoords, ownerToken]);

  // ── Group swap chains (3-person rings), computed live within the Browse tab's chosen distance ──
  const groupChains = useMemo(() => {
    if (!ownerToken || !myListings.length) return [];
    const seen = new Set();
    const results = [];
    for (const seed of myListings) {
      for (const chain of findSwapChains(seed, distanceFilteredListings)) {
        const key = canonicalMatchKey(chain.members.map(m => m.id));
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ key, ...chain });
      }
    }
    results.sort((a, b) => chainTotalDistance(a, ownerToken) - chainTotalDistance(b, ownerToken));
    return results.map((c, i) => ({ ...c, color: RING_COLORS[i % RING_COLORS.length] }));
  }, [myListings, distanceFilteredListings, ownerToken]);

  // Same idea, but scoped to the Map tab's fixed nearby radius (mirrors matchCount/mapMatchCount).
  const mapGroupChains = useMemo(() => {
    if (!ownerToken || !myListings.length) return [];
    const seen = new Set();
    const results = [];
    for (const seed of myListings) {
      for (const chain of findSwapChains(seed, mapNearbyListings)) {
        const key = canonicalMatchKey(chain.members.map(m => m.id));
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({ key, ...chain });
      }
    }
    results.sort((a, b) => chainTotalDistance(a, ownerToken) - chainTotalDistance(b, ownerToken));
    return results.map((c, i) => ({ ...c, color: RING_COLORS[i % RING_COLORS.length] }));
  }, [myListings, mapNearbyListings, ownerToken]);

  const filtered = useMemo(() => {
    let res = distanceFilteredListings;
    if (filterMagnet === "__group__") {
      const memberIds = new Set(mapGroupChains.flatMap(c => c.members.map(m => m.id)));
      res = res.filter(l => memberIds.has(l.id));
    } else if (filterMagnet && filterMagnet !== "__match__") {
      res = res.filter(l => toArr(l.have).includes(filterMagnet));
    } else if (filterMagnet === "__match__") {
      res = res.filter(l => l.owner_token !== ownerToken && isMatchAny(myListings, l));
    }
    if (browseSort === "nearest" && locationReferenceCoords) {
      res = [...res].sort((a, b) => (a.__distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.__distanceKm ?? Number.MAX_SAFE_INTEGER));
    } else {
      res = [...res].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return res;
  }, [distanceFilteredListings, filterMagnet, mapGroupChains, myListings, ownerToken, browseSort, locationReferenceCoords]);

  const mapListings = useMemo(() => {
    if (!mapReferenceCoords) return filtered;
    return filtered
      .map(l => {
        if (l.owner_token === ownerToken) return l;
        const d = distanceKm(mapReferenceCoords.lat, mapReferenceCoords.lng, l.lat, l.lng);
        return d == null ? null : { ...l, __distanceKm: d };
      })
      .filter(l => l && (l.owner_token === ownerToken || l.__distanceKm <= MAP_NEARBY_RADIUS_KM))
      .sort((a, b) => {
        if (a.owner_token === ownerToken && b.owner_token !== ownerToken) return -1;
        if (b.owner_token === ownerToken && a.owner_token !== ownerToken) return 1;
        return (a.__distanceKm ?? 0) - (b.__distanceKm ?? 0);
      });
  }, [filtered, mapReferenceCoords, ownerToken]);

  const availableMagnets = useMemo(() => {
    const counts = new Map();
    distanceFilteredListings
      .filter(l => l.owner_token !== ownerToken)
      .forEach(l => {
        toArr(l.have).forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
      });
    return MAGNETS
      .map(m => ({ ...m, count: counts.get(m.id) || 0 }))
      .filter(m => m.count > 0);
  }, [distanceFilteredListings, ownerToken]);

  const matchCount = useMemo(() => {
    if (!myListings.length) return 0;
    return activeListings.filter(l => l.owner_token !== ownerToken && isMatchAny(myListings, l)).length;
  }, [activeListings, myListings, ownerToken]);

  const mapMatchCount = useMemo(() => {
    if (!myListings.length) return 0;
    return mapListings.filter(l => l.owner_token !== ownerToken && isMatchAny(myListings, l)).length;
  }, [mapListings, myListings, ownerToken]);

  // Which rings already have a match_groups row (so the button can say "open" instead of "create")
  const [existingGroupIds, setExistingGroupIds] = useState({});
  useEffect(() => {
    const keys = [...new Set([...groupChains.map(c => c.key), ...mapGroupChains.map(c => c.key)])];
    if (!keys.length) { setExistingGroupIds({}); return; }
    let cancelled = false;
    supabase.from("match_groups").select("id, canonical_key").in("canonical_key", keys).then(({ data }) => {
      if (cancelled) return;
      const map = {};
      (data || []).forEach(g => { map[g.canonical_key] = g.id; });
      setExistingGroupIds(map);
    });
    return () => { cancelled = true; };
  }, [groupChains, mapGroupChains]);

  const [creatingGroupKey, setCreatingGroupKey] = useState(null);
  const openOrCreateGroupChat = useCallback(async (chain) => {
    if (!ownerToken || creatingGroupKey) return;
    setCreatingGroupKey(chain.key);
    try {
      let groupId = existingGroupIds[chain.key];
      if (!groupId) {
        const { data: existing } = await supabase.from("match_groups").select("id").eq("canonical_key", chain.key).maybeSingle();
        groupId = existing?.id;
      }
      if (!groupId) {
        const { data: created } = await supabase.from("match_groups").insert({
          member_listing_ids: chain.members.map(m => m.id),
          member_tokens: chain.members.map(m => m.owner_token),
          trade_items: chain.items,
          canonical_key: chain.key,
        }).select().single();
        if (created) {
          groupId = created.id;
          const participants = chain.members.map(m => ({
            conversation_id: groupId, user_token: m.owner_token, listing_id: m.id, nickname: m.nickname,
          }));
          await supabase.from("group_conversation_participants").upsert(participants, { onConflict: "conversation_id,user_token" });
        } else {
          // Race: another member's click already created it between our check and this insert.
          const { data: retry } = await supabase.from("match_groups").select("id").eq("canonical_key", chain.key).maybeSingle();
          groupId = retry?.id;
        }
      }
      if (!groupId) throw new Error("Could not create group chat");
      const me = chain.members.find(m => m.owner_token === ownerToken);
      if (me) {
        await supabase.from("group_conversation_participants").upsert({
          conversation_id: groupId, user_token: ownerToken, listing_id: me.id, nickname: me.nickname,
        }, { onConflict: "conversation_id,user_token" });
      }
      const { data: members } = await supabase.from("group_conversation_participants").select("*").eq("conversation_id", groupId);
      setExistingGroupIds(prev => ({ ...prev, [chain.key]: groupId }));
      unhideConversation(groupId);
      setGroupChatTarget({ conversationId: groupId, members: members || [] });
      setChatTarget(null);
      setTab("msgs");
    } catch (e) {
      console.error(e);
      alert(lang === "cn" ? "创建群聊失败，请重试" : "Failed to create group chat, please try again");
    }
    setCreatingGroupKey(null);
  }, [ownerToken, existingGroupIds, creatingGroupKey, lang, unhideConversation]);

  // ── Post a new listing, or save edits to an existing one ──
  const handlePost = useCallback(async () => {
    if (!profile || !fAddr || fHave.length === 0 || fWant.length === 0 || !fExpireDays || posting) return;
    setPosting(true);
    try {
      const expiresAt = expiresAtFromDays(fExpireDays);
      if (!expiresAt) throw new Error("Please choose an expiration date.");
      const payload = {
        nickname: profile.nickname, address: fAddr,
        country: fCountry, city: fCity, have: fHave, want: fWant, swap_areas: fAreas,
        expires_at: expiresAt,
        lat: fLat, lng: fLng,
      };
      if (editingId && editingId !== "new") {
        const { data, error } = await supabase.from("listings").update(payload).eq("id", editingId).eq("owner_token", ownerToken).select().single();
        if (error) throw error;
        setListings(prev => data.active === false ? prev.filter(l => l.id !== data.id) : prev.map(l => l.id === data.id ? data : l));
      } else {
        const { data, error } = await supabase.from("listings").insert({ ...payload, owner_token: ownerToken }).select().single();
        if (error) throw error;
        if (data.active !== false) setListings(prev => [data, ...prev]);
      }
      setEditingId(null);
      resetForm();
      setTab("map");
    } catch (e) {
      console.error(e);
      alert(`Failed to save: ${e?.message || "Please try again."}`);
    }
    setPosting(false);
  }, [profile, fCountry, fCity, fAddr, fLat, fLng, fHave, fWant, fAreas, fExpireDays, posting, ownerToken, editingId]);

  // ── Start editing one of my listings ──
  const startEdit = (listing) => {
    setFCountry(listing.country || "");
    setFCity(listing.city || "");
    setFAddr(listing.address || "");
    setFLat(listing.lat || null);
    setFLng(listing.lng || null);
    setFHave(toArr(listing.have));
    setFWant(listing.want || []);
    setFAreas(listing.swap_areas || []);
    setFExpireDays(expiryDaysFromListing(listing));
    setEditingId(listing.id);
  };

  const startNew = () => { resetForm(); setEditingId("new"); };
  const cancelEdit = () => { setEditingId(null); resetForm(); };

  // ── Go offline (delete) one listing ──
  const handleOffline = async (listing) => {
    if (!listing || offlineDeleting) return;
    setOfflineDeleting(true);

    try {
      await supabase.from("listings").delete().eq("id", listing.id).eq("owner_token", ownerToken);
      setListings(prev => prev.filter(l => l.id !== listing.id));
      if (editingId === listing.id) { setEditingId(null); resetForm(); }
      setPendingOfflineListing(null);
    } catch (e) {
      console.error(e);
      alert(`Failed to drop post: ${e?.message || "Please try again."}`);
    } finally {
      setOfflineDeleting(false);
    }
  };

  const openChat = (listing) => {
    if (!myListings.length) return;
    unhideConversation(getConversationId(ownerToken, listing.owner_token));
    setChatTarget({ token: listing.owner_token, name: listing.nickname });
    setGroupChatTarget(null);
    setTab("msgs");
  };

  const openChatDirect = (token, name) => {
    unhideConversation(getConversationId(ownerToken, token));
    setChatTarget({ token, name });
    setGroupChatTarget(null);
  };
  const viewListingFromChat = (listing) => {
    setChatPreviewListing(listing);
    setExpandedId(listing.id);
    setFilterMagnet("");
    setDistanceKmFilter("");
    setChatTarget(null);
    setTab("browse");
  };

  const canPost = profile && fAddr && fHave.length > 0 && fWant.length > 0 && fExpireDays;
  const viewportWidth = useViewportWidth();
  const isWide = viewportWidth >= 768;
  const appMaxWidth = isWide ? 1120 : 440;
  const appPaddingX = isWide ? 24 : 16;
  const contentGrid = isWide
    ? { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, alignItems: "start" }
    : { display: "flex", flexDirection: "column", gap: 6 };
  const formShell = isWide ? { maxWidth: 720, margin: "0 auto" } : {};

  const inp = { width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, border: "1.5px solid #ddd", background: "#fff", color: "#333", outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 13, fontWeight: 500, color: "#666", display: "block", marginTop: 16, marginBottom: 6 };
  const chipStyle = (on) => ({ padding: "5px 13px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 500, background: on ? "#333" : "#f5f5f0", color: on ? "#fff" : "#555", border: `1px solid ${on ? "transparent" : "#e5e5e0"}`, userSelect: "none" });

  if (session === undefined || loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 15, color: "#888" }}>{t.loading}</div>
  );

  if (session === null) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", padding: 18 }}>
      <div style={{
        width: "100%", maxWidth: 340, textAlign: "center", borderRadius: 16,
        background: "#fff", boxShadow: "0 18px 60px rgba(0,0,0,.12)",
        padding: "32px 24px", border: "1px solid rgba(0,0,0,.06)",
      }}>
        <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 6, color: "#222" }}>{t.title}</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>{t.signInDesc}</div>
        <button
          onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "1.5px solid #ddd",
            background: "#fff", color: "#333", fontWeight: 600, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          🔑 {t.signInGoogle}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#eee" }} />
          <span style={{ fontSize: 12, color: "#aaa" }}>{t.authOr}</span>
          <div style={{ flex: 1, height: 1, background: "#eee" }} />
        </div>

        <input
          value={authUsername} onChange={e => setAuthUsername(e.target.value)}
          placeholder={t.authUsernamePh} style={{ ...inp, marginBottom: 10 }}
        />
        <div style={{ position: "relative", marginBottom: 10 }}>
          <input
            value={authPassword} onChange={e => setAuthPassword(e.target.value)} type={showAuthPassword ? "text" : "password"}
            placeholder={t.authPasswordPh} style={{ ...inp, paddingRight: 40 }}
            onKeyDown={e => e.key === "Enter" && submitUsernameAuth()}
          />
          <button
            type="button" onClick={() => setShowAuthPassword(v => !v)} aria-label={showAuthPassword ? t.authHidePassword : t.authShowPassword}
            style={{
              position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
              width: 32, height: 32, border: "none", background: "transparent", cursor: "pointer", fontSize: 15,
            }}
          >
            {showAuthPassword ? "🙈" : "👁"}
          </button>
        </div>
        {authMode === "signup" && !authError && (
          <div style={{ fontSize: 11, color: "#aaa", marginBottom: 10, textAlign: "left" }}>
            {t.authUsernameInvalid}；{t.authPasswordInvalid}
          </div>
        )}
        {authError && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 10, textAlign: "left" }}>{authError}</div>}
        <button
          onClick={submitUsernameAuth} disabled={authBusy}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "#333", color: "#fff", fontWeight: 600, fontSize: 14,
            cursor: authBusy ? "default" : "pointer", opacity: authBusy ? 0.6 : 1,
          }}
        >
          {authBusy ? t.loading : (authMode === "signup" ? t.authSignUp : t.authSignIn)}
        </button>
        <div
          onClick={() => { setAuthMode(m => m === "signup" ? "signin" : "signup"); setAuthError(""); }}
          style={{ fontSize: 12, color: "#888", marginTop: 12, cursor: "pointer" }}
        >
          {authMode === "signup" ? t.authToggleToSignin : t.authToggleToSignup}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: appMaxWidth, margin: "0 auto", height: "100dvh", maxHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{ padding: `14px ${appPaddingX}px 10px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
            {t.subtitle && `${t.subtitle} · `}{activeListings.length} {t.active}
            {(matchCount + groupChains.length) > 0 && <span style={{ color: "#10b981", fontWeight: 600 }}> · {matchCount + groupChains.length} {t.matches}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button onClick={() => setLang(lang === "cn" ? "en" : "cn")} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#f0f0ea", border: "1px solid #ddd", color: "#333" }}>
            {lang === "cn" ? "EN" : "中"}
          </button>
          <button onClick={() => supabase.auth.signOut()} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#f0f0ea", border: "1px solid #ddd", color: "#333" }}>
            {t.signOut}
          </button>
        </div>
      </div>

      {/* ── Location pill (Map/Browse) ── */}
      {(tab === "map" || tab === "browse") && (
        <div style={{ padding: `0 ${appPaddingX}px 10px` }}>
          <button
            onClick={() => { setLocationSearchInput(myLocation?.label || ""); setLocationError(false); setShowLocationModal(true); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, maxWidth: "100%",
              padding: "7px 12px", borderRadius: 20, border: "1px solid #e5e5e0",
              background: "#f5f5f0", color: "#333", fontWeight: 500, fontSize: 12.5, cursor: "pointer",
            }}
          >
            <span>📍</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {myLocation?.label || t.setLocation}
            </span>
          </button>
        </div>
      )}

      {/* ── Content ── */}
      <div style={{
        flex: 1, minHeight: 0, overflow: (tab === "msgs" && (chatTarget || groupChatTarget)) ? "hidden" : "auto",
        display: "flex", flexDirection: "column",
        padding: (tab === "msgs" && (chatTarget || groupChatTarget)) ? `0 ${appPaddingX}px calc(64px + env(safe-area-inset-bottom))` : `0 ${appPaddingX}px ${isWide ? "96px" : "88px"}`,
      }}>

        {/* MAP TAB */}
        {tab === "map" && (
          <div>
            <GoogleMapView
              listings={mapListings}
              onSelect={l => { setExpandedId(l.id); setTab("browse"); }}
              myListings={myListings}
              centerCoords={mapReferenceCoords}
              t={t}
              isWide={isWide}
            />

            {/* Magnet filters */}
            <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap" }}>
              <span onClick={() => setFilterMagnet("")} style={chipStyle(!filterMagnet)}>{t.all}</span>
              {myListings.length > 0 && <span onClick={() => setFilterMagnet(filterMagnet === "__match__" ? "" : "__match__")} style={{
                ...chipStyle(filterMagnet === "__match__"),
                background: filterMagnet === "__match__" ? "#10b981" : "#f5f5f0",
                color: filterMagnet === "__match__" ? "#fff" : "#555",
              }}>{t.swappable} ({mapMatchCount})</span>}
              {(mapGroupChains.length > 0 || filterMagnet === "__group__") && <span onClick={() => setFilterMagnet(filterMagnet === "__group__" ? "" : "__group__")} style={{
                ...chipStyle(filterMagnet === "__group__"),
                background: filterMagnet === "__group__" ? "#6366f1" : "#f5f5f0",
                color: filterMagnet === "__group__" ? "#fff" : "#555",
              }}>{t.groupSwap} ({mapGroupChains.length})</span>}
              {MAGNETS.map(m => {
                const c = mColor(m.id);
                const on = filterMagnet === m.id;
                return (
                  <span key={m.id} onClick={() => setFilterMagnet(on ? "" : m.id)} style={{
                    display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 8px", borderRadius: 14, fontSize: 11, cursor: "pointer", fontWeight: 500,
                    background: on ? c + "15" : "#f5f5f0", color: on ? c : "#777",
                    border: `1px solid ${on ? c + "40" : "transparent"}`, userSelect: "none",
                  }}>
                    <FlagCircle id={m.id} size={14} /> {m[lang]}
                  </span>
                );
              })}
            </div>

            {myListings.length === 0 && (
              <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg,rgba(16,185,129,.05),rgba(59,130,246,.05))", border: "1px solid rgba(16,185,129,.12)" }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t.postCta}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{t.postCtaSub}</div>
                <button onClick={() => { startNew(); setTab("post"); }} style={{ marginTop: 10, padding: "8px 20px", border: "none", borderRadius: 10, background: "#10b981", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{t.goPost}</button>
              </div>
            )}

            {filterMagnet !== "__group__" && myListings.length > 0 && mapMatchCount > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#10b981" }}>{t.swappable} ({mapMatchCount})</div>
                <div style={contentGrid}>
                  {mapListings.filter(l => isMatchAny(myListings, l))
                    .map(l => <ListingCard key={l.id} listing={l} myListings={myListings} onMessage={openChat} expanded={expandedId === l.id} onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)} lang={lang} t={t} />)}
                </div>
              </div>
            )}

            {filterMagnet !== "__match__" && mapGroupChains.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#6366f1" }}>{t.groupSwap} ({mapGroupChains.length})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {mapGroupChains.map(chain => (
                    <GroupRingCard
                      key={chain.key}
                      chain={chain}
                      ownerToken={ownerToken}
                      lang={lang}
                      t={t}
                      creating={creatingGroupKey === chain.key}
                      exists={!!existingGroupIds[chain.key]}
                      onAction={() => openOrCreateGroupChat(chain)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BROWSE / DISCOVER TAB */}
        {tab === "browse" && (
          <div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <span onClick={() => setFilterMagnet("")} style={chipStyle(!filterMagnet)}>{t.all} ({activeListings.length})</span>
              {myListings.length > 0 && <span onClick={() => setFilterMagnet(filterMagnet === "__match__" ? "" : "__match__")} style={{
                ...chipStyle(filterMagnet === "__match__"),
                background: filterMagnet === "__match__" ? "#10b981" : "#f5f5f0",
                color: filterMagnet === "__match__" ? "#fff" : "#555",
              }}>{t.swappable} ({matchCount})</span>}
              {(groupChains.length > 0 || filterMagnet === "__group__") && <span onClick={() => setFilterMagnet(filterMagnet === "__group__" ? "" : "__group__")} style={{
                ...chipStyle(filterMagnet === "__group__"),
                background: filterMagnet === "__group__" ? "#6366f1" : "#f5f5f0",
                color: filterMagnet === "__group__" ? "#fff" : "#555",
              }}>{t.groupSwap} ({groupChains.length})</span>}
            </div>

            {filterMagnet !== "__group__" && availableMagnets.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>{t.available}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {availableMagnets.map(m => {
                    const c = mColor(m.id);
                    const on = filterMagnet === m.id;
                    return (
                      <span key={m.id} onClick={() => setFilterMagnet(on ? "" : m.id)} style={{
                        display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 9px", borderRadius: 14, fontSize: 11, cursor: "pointer", fontWeight: 500,
                        background: on ? c + "15" : "#f5f5f0", color: on ? c : "#777",
                        border: `1px solid ${on ? c + "40" : "transparent"}`, userSelect: "none",
                      }}>
                        <FlagCircle id={m.id} size={14} /> {m[lang]} ({m.count})
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Distance filter */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 10, padding: "8px 10px", background: "#f9f9f5", border: "1px solid #eee", borderRadius: 12 }}>
              <span style={{ fontSize: 12, color: "#888" }}>📏 {t.distance}</span>
              <select value={distanceKmFilter} onChange={e => setDistanceKmFilter(e.target.value)} style={{
                padding: "5px 8px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: "1.5px solid #ddd", background: "#fff", color: "#333", outline: "none", cursor: "pointer",
              }}>
                <option value="">{t.anyDistance}</option>
                {[5, 10, 20, 25, 50, 100].map(km => <option key={km} value={km}>{km} km {t.within}</option>)}
              </select>
              <span style={{ fontSize: 12, color: "#888" }}>{t.sort}</span>
              <select value={browseSort} onChange={e => setBrowseSort(e.target.value)} style={{
                padding: "5px 8px", borderRadius: 8, fontSize: 12, fontWeight: 500,
                border: "1.5px solid #ddd", background: "#fff", color: "#333", outline: "none", cursor: "pointer",
              }}>
                <option value="newest">{t.newest}</option>
                <option value="nearest">{t.nearest}</option>
              </select>
              {distanceKmFilter && locationReferenceCoords && (
                <span style={{ fontSize: 10, color: locationReferenceCoords.source === "listing" ? "#b5651d" : "#10b981" }}>
                  {locationReferenceCoords.source === "gps" ? "📍 GPS" : locationReferenceCoords.source === "manual" ? `📍 ${myLocation?.label || ""}` : `⚠️ ${t.locationDenied}`}
                </span>
              )}
            </div>
            {distanceKmFilter && !locationReferenceCoords && (
              <div style={{ fontSize: 11, color: "#b5651d", marginBottom: 10 }}>{t.noLocationRef}</div>
            )}

            {filterMagnet === "__group__" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {groupChains.map(chain => (
                  <GroupRingCard
                    key={chain.key}
                    chain={chain}
                    ownerToken={ownerToken}
                    lang={lang}
                    t={t}
                    creating={creatingGroupKey === chain.key}
                    exists={!!existingGroupIds[chain.key]}
                    onAction={() => openOrCreateGroupChat(chain)}
                  />
                ))}
                {groupChains.length === 0 && (
                  <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>🔗</div>
                    <div style={{ fontSize: 13 }}>{t.noGroupChains}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={contentGrid}>
                {filtered.map(l => <ListingCard key={l.id} listing={l} myListings={myListings} onMessage={openChat} expanded={expandedId === l.id} onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)} lang={lang} t={t} />)}
                {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div><div style={{ fontSize: 13 }}>{t.noResults}</div></div>}
              </div>
            )}
          </div>
        )}

        {/* POST / MINE TAB */}
        {tab === "post" && (
          <div>
            {editingId ? (
              <div style={formShell}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{editingId === "new" ? t.postTitle : t.editTitle}</div>

                <label style={{ ...lbl, marginTop: 0 }}>{t.location} <span style={{ color: "#ef4444" }}>*</span></label>
                <AddressInput
                  value={fAddr}
                  onChange={(address) => {
                    setFAddr(address);
                    setFCity("");
                    setFLat(null);
                    setFLng(null);
                  }}
                  onPlaceSelect={({ address, lat, lng, country, city }) => {
                    setFAddr(address);
                    setFLat(lat);
                    setFLng(lng);
                    if (country) setFCountry(country);
                    if (city) setFCity(city);
                  }}
                  placeholder={t.locPh} style={inp} t={t}
                />
                {fLat && fLng && <div style={{ fontSize: 11, color: "#10b981", marginTop: 4 }}>✓ {fAddr}</div>}

                <label style={lbl}>{t.swapAreas} <span style={{ fontWeight: 400, color: "#aaa" }}>({t.optional})</span></label>
                <TagInput tags={fAreas} onChange={setFAreas} placeholder={t.swapAreasPh} hint={t.swapAreasHint} />

                <label style={lbl}>{t.iHave} <span style={{ color: "#ef4444" }}>*</span> <span style={{ fontWeight: 400, color: "#aaa" }}>{t.pickMulti}</span></label>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {MAGNETS.map(m => <MagnetPill key={m.id} id={m.id} lang={lang}
                    selected={fHave.includes(m.id)}
                    onClick={() => {
                      setFHave(p => p.includes(m.id) ? p.filter(x => x !== m.id) : [...p, m.id]);
                      setFWant(p => p.filter(w => w !== m.id));
                    }} />)}
                </div>

                <label style={lbl}>{t.iWant} <span style={{ color: "#ef4444" }}>*</span> <span style={{ fontWeight: 400, color: "#aaa" }}>{t.pickMany}</span></label>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {MAGNETS.filter(m => !fHave.includes(m.id)).map(m => <MagnetPill key={m.id} id={m.id} lang={lang}
                    selected={fWant.includes(m.id)}
                    onClick={() => setFWant(p => p.includes(m.id) ? p.filter(x => x !== m.id) : [...p, m.id])} />)}
                </div>

                <label style={lbl}>{t.expireIn} <span style={{ color: "#ef4444" }}>*</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  {EXPIRY_OPTIONS.map(days => {
                    const selected = fExpireDays === String(days);
                    return (
                      <button key={days} type="button" onClick={() => setFExpireDays(String(days))} style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 14, fontWeight: 500,
                        background: selected ? "#10b98115" : "#f5f5f0",
                        border: `1.5px solid ${selected ? "#10b981" : "#e0e0d8"}`,
                        color: selected ? "#10b981" : "#1a1a1a",
                        cursor: "pointer", transition: "all .12s",
                      }}>{days} {t.expireDays}</button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                  <button onClick={cancelEdit} style={{
                    padding: "12px 18px", border: "1.5px solid #ddd", borderRadius: 12,
                    background: "transparent", color: "#666", fontWeight: 500, fontSize: 15, cursor: "pointer",
                  }}>{t.cancel}</button>
                  <button onClick={handlePost} disabled={!canPost || posting} style={{
                    flex: 1, padding: "12px 0", border: "none", borderRadius: 12,
                    background: canPost ? "#10b981" : "#ccc",
                    color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer",
                    opacity: canPost ? 1 : .5,
                  }}>{posting ? t.publishing : (editingId === "new" ? t.publish : t.save)}</button>
                </div>
              </div>
            ) : (
              <div style={formShell}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                  padding: "10px 12px", borderRadius: 12, background: "#f9f9f5", border: "1px solid #eee",
                }}>
                  <span style={{ fontSize: 12, color: "#888", flexShrink: 0 }}>{t.postingAs}</span>
                  {editingNickname ? (
                    <>
                      <input
                        value={nicknameInput}
                        onChange={e => setNicknameInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveNickname(); }}
                        autoFocus
                        style={{ flex: 1, minWidth: 0, padding: "6px 10px", borderRadius: 8, fontSize: 13, border: "1.5px solid #ddd", background: "#fff", color: "#222", outline: "none" }}
                      />
                      <button onClick={saveNickname} disabled={savingNickname} style={{ padding: "6px 12px", borderRadius: 8, border: "none", background: "#10b981", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                        {t.save}
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "#222", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.nickname}</span>
                      <button onClick={() => { setNicknameInput(profile?.nickname || ""); setEditingNickname(true); }} style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #ddd", background: "#fff", color: "#555", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 }}>
                        {t.editNickname}
                      </button>
                    </>
                  )}
                </div>

                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t.myListings}</div>
                {myListings.length === 0 ? (
                  <div style={{ textAlign: "center", padding: 30, color: "#aaa" }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>➕</div>
                    <div style={{ fontSize: 13 }}>{t.postCtaSub}</div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {myListings.map(l => (
                      <div key={l.id}>
                        <ListingCard listing={l} myListings={myListings} expanded onToggle={() => {}} onMessage={() => {}} lang={lang} t={t} />
                        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                          <button onClick={() => startEdit(l)} style={{ flex: 1, padding: "9px 0", border: "1.5px solid #3b82f6", borderRadius: 10, background: "transparent", color: "#3b82f6", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>{t.edit}</button>
                          <button onClick={() => setPendingOfflineListing(l)} style={{ flex: 1, padding: "9px 0", border: "1.5px solid #ef4444", borderRadius: 10, background: "transparent", color: "#ef4444", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>{t.offline}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button onClick={startNew} style={{
                  width: "100%", marginTop: 14, padding: "11px 0", border: "1.5px dashed #10b981", borderRadius: 12,
                  background: "rgba(16,185,129,.05)", color: "#10b981", fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}>{t.addAnother}</button>
              </div>
            )}
          </div>
        )}

        {/* MESSAGES TAB */}
        {tab === "msgs" && (
          chatTarget ? (
            <ChatThread
              ownerToken={ownerToken}
              otherToken={chatTarget.token}
              otherName={chatTarget.name}
              otherListing={latestListingForOwner(listings, chatTarget.token)}
              onBack={() => setChatTarget(null)}
              onViewListing={viewListingFromChat}
              t={t}
            />
          ) : groupChatTarget ? (
            <GroupChatThread
              ownerToken={ownerToken}
              conversationId={groupChatTarget.conversationId}
              members={groupChatTarget.members}
              onBack={() => setGroupChatTarget(null)}
              t={t}
            />
          ) : (
            <div style={{ paddingBottom: 88, overflow: "auto" }}>
              <ChatView
                ownerToken={ownerToken} allListings={listings} t={t} lang={lang}
                onOpenChat={openChatDirect} onViewListing={viewListingFromChat}
                groupConversations={groupConversations} onOpenGroupChat={openGroupChat}
              />
            </div>
          )
        )}
      </div>

      {showLocationModal && (
        <div
          role="presentation"
          onClick={() => setShowLocationModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(0,0,0,.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-modal-title"
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 380, borderRadius: 16,
              background: "#fff", boxShadow: "0 18px 60px rgba(0,0,0,.18)",
              padding: 18, border: "1px solid rgba(0,0,0,.06)",
            }}
          >
            <div id="location-modal-title" style={{ fontSize: 17, fontWeight: 700, color: "#222", marginBottom: 14 }}>
              {t.changeLocation}
            </div>

            <button
              onClick={fetchGpsLocation}
              disabled={locating}
              style={{
                width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
                background: "#3b82f6", color: "#fff", fontWeight: 600, fontSize: 14,
                cursor: locating ? "default" : "pointer", opacity: locating ? .7 : 1,
              }}
            >
              📍 {locating ? t.locatingMe : t.useMyLocation}
            </button>
            {locationError && (
              <div style={{ fontSize: 12, color: "#ef4444", marginTop: 8 }}>
                {t.locationErrorGps}{locationErrorDetail && ` (${locationErrorDetail})`}
              </div>
            )}

            <div style={{ fontSize: 12, color: "#aaa", margin: "14px 0 8px", textAlign: "center" }}>
              {lang === "cn" ? "或" : "or"}
            </div>

            <AddressInput
              value={locationSearchInput}
              onChange={setLocationSearchInput}
              onPlaceSelect={applySearchedLocation}
              placeholder={t.mapSearch}
              style={inp}
              t={t}
            />

            <button
              onClick={() => setShowLocationModal(false)}
              style={{
                width: "100%", marginTop: 14, padding: "10px 0", borderRadius: 12,
                border: "1.5px solid #ddd", background: "#fff", color: "#555",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}

      {pendingOfflineListing && (
        <div
          role="presentation"
          onClick={() => { if (!offlineDeleting) setPendingOfflineListing(null); }}
          style={{
            position: "fixed", inset: 0, zIndex: 90,
            background: "rgba(0,0,0,.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="drop-post-title"
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 380, borderRadius: 16,
              background: "#fff", boxShadow: "0 18px 60px rgba(0,0,0,.18)",
              padding: 18, border: "1px solid rgba(0,0,0,.06)",
            }}
          >
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: "rgba(239,68,68,.1)", color: "#ef4444",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, marginBottom: 12,
            }}>!</div>
            <div id="drop-post-title" style={{ fontSize: 17, fontWeight: 700, color: "#222" }}>
              {lang === "cn" ? "下线这条发布？" : "Drop this post?"}
            </div>
            <div style={{ fontSize: 13, color: "#666", lineHeight: 1.55, marginTop: 8 }}>
              {lang === "cn"
                ? "下线后，其他人将无法在浏览页看到这条发布，也不能再通过它发起聊天。"
                : "After dropping it, other users will no longer see this post in Browse or start a chat from it."}
            </div>
            <div style={{ marginTop: 10, padding: "9px 11px", borderRadius: 12, background: "#fafafa", border: "1px solid #eee", fontSize: 12, color: "#777" }}>
              <div style={{ fontWeight: 600, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pendingOfflineListing.nickname || "My post"}
              </div>
              <div style={{ marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {publicLocationLabel(pendingOfflineListing, lang)}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                type="button"
                disabled={offlineDeleting}
                onClick={() => setPendingOfflineListing(null)}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 12,
                  border: "1.5px solid #ddd", background: "#fff", color: "#555",
                  fontWeight: 600, fontSize: 14, cursor: offlineDeleting ? "default" : "pointer",
                }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={offlineDeleting}
                onClick={() => handleOffline(pendingOfflineListing)}
                style={{
                  flex: 1, padding: "11px 0", borderRadius: 12,
                  border: "none", background: "#ef4444", color: "#fff",
                  fontWeight: 700, fontSize: 14, cursor: offlineDeleting ? "default" : "pointer",
                  opacity: offlineDeleting ? .65 : 1,
                }}
              >
                {offlineDeleting ? (lang === "cn" ? "下线中..." : "Dropping...") : (lang === "cn" ? "确认下线" : "Drop post")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: appMaxWidth, display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "6px 0 max(6px,env(safe-area-inset-bottom))", background: "#fff", borderTop: "1px solid #eee", zIndex: 50,
      }}>
        {[
          { id: "map", icon: "📍", label: t.map },
          { id: "browse", icon: "🔍", label: t.browse },
          { id: "msgs", icon: "💬", label: t.msgs, badge: unreadCount + groupUnreadCount },
          { id: "post", icon: myListings.length > 0 ? "👤" : "➕", label: myListings.length > 0 ? t.mine : t.post },
        ].map(x => (
          <button key={x.id} onClick={() => { setTab(x.id); setExpandedId(null); if (x.id !== "msgs") { setChatTarget(null); setGroupChatTarget(null); } if (x.id !== "browse") setChatPreviewListing(null); }} style={{
            position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            background: "none", border: "none", cursor: "pointer", padding: "3px 14px",
            color: tab === x.id ? "#10b981" : "#999", fontWeight: tab === x.id ? 600 : 400, fontSize: 10,
          }}>
            <span style={{ fontSize: 18 }}>{x.icon}</span>{x.label}
            {x.badge > 0 && (
              <span style={{
                position: "absolute", top: -2, right: 4,
                minWidth: 16, height: 16, borderRadius: 8,
                background: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
              }}>{x.badge > 99 ? "99+" : x.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
