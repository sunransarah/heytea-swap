import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase.js";

// ════════════════════════════════════════════════════════════
//  DATA — 23 magnets (added England)
// ════════════════════════════════════════════════════════════

const MAGNETS = [
  { id:"ned", cn:"荷兰",     en:"Netherlands",  c1:"#AE1C28", c2:"#FFF",    c3:"#21468B" },
  { id:"mar", cn:"摩洛哥",   en:"Morocco",      c1:"#C1272D", c2:"#006233", c3:"#C1272D" },
  { id:"mex", cn:"墨西哥",   en:"Mexico",       c1:"#006847", c2:"#FFF",    c3:"#CE1126" },
  { id:"egy", cn:"埃及",     en:"Egypt",        c1:"#CE1126", c2:"#FFF",    c3:"#000"    },
  { id:"aut", cn:"奥地利",   en:"Austria",      c1:"#ED2939", c2:"#FFF",    c3:"#ED2939" },
  { id:"ger", cn:"德国",     en:"Germany",      c1:"#000",    c2:"#DD0000", c3:"#FFCC00" },
  { id:"kor", cn:"韩国",     en:"South Korea",  c1:"#003478", c2:"#FFF",    c3:"#C60C30" },
  { id:"por", cn:"葡萄牙",   en:"Portugal",     c1:"#006600", c2:"#FF0000", c3:"#FF0000" },
  { id:"bra", cn:"巴西",     en:"Brazil",       c1:"#009739", c2:"#FEDD00", c3:"#009739" },
  { id:"can", cn:"加拿大",   en:"Canada",       c1:"#FF0000", c2:"#FFF",    c3:"#FF0000" },
  { id:"cro", cn:"克罗地亚", en:"Croatia",      c1:"#FF0000", c2:"#FFF",    c3:"#171796" },
  { id:"fra", cn:"法国",     en:"France",       c1:"#002395", c2:"#FFF",    c3:"#ED2939" },
  { id:"sui", cn:"瑞士",     en:"Switzerland",  c1:"#FF0000", c2:"#FFF",    c3:"#FF0000" },
  { id:"jpn", cn:"日本",     en:"Japan",        c1:"#FFF",    c2:"#BC002D", c3:"#FFF"    },
  { id:"esp", cn:"西班牙",   en:"Spain",        c1:"#AA151B", c2:"#F1BF00", c3:"#AA151B" },
  { id:"usa", cn:"美国",     en:"USA",          c1:"#3C3B6E", c2:"#FFF",    c3:"#B22234" },
  { id:"nor", cn:"挪威",     en:"Norway",       c1:"#BA0C2F", c2:"#FFF",    c3:"#00205B" },
  { id:"arg", cn:"阿根廷",   en:"Argentina",    c1:"#75AADB", c2:"#FFF",    c3:"#75AADB" },
  { id:"bel", cn:"比利时",   en:"Belgium",      c1:"#000",    c2:"#FAE042", c3:"#ED2939" },
  { id:"uru", cn:"乌拉圭",   en:"Uruguay",      c1:"#001489", c2:"#FFF",    c3:"#001489" },
  { id:"eng", cn:"英格兰",   en:"England",      c1:"#FFF",    c2:"#CF081F", c3:"#FFF"    },
  { id:"hid", cn:"隐藏款",   en:"Mystery",      c1:"#FFD700", c2:"#FFF8DC", c3:"#FFD700" },
];

// ════════════════════════════════════════════════════════════
//  TRANSLATIONS
// ════════════════════════════════════════════════════════════

const T = {
  cn: {
    title:"⚽ 喜茶世界杯换贴", subtitle:"Toronto",
    active:"条活跃", matches:"个匹配", online:"已上线",
    map:"地图", browse:"浏览", post:"发布", mine:"我的", msgs:"消息",
    all:"全部", swappable:"可互换",
    postTitle:"发布换贴信息",
    nickname:"昵称", nickPh:"怎么称呼你",
    location:"你的位置", locPh:"搜索地址...",
    radius:"搜索范围",
    iHave:"我有的冰箱贴", pickOne:"（选一个）",
    iWant:"想换的冰箱贴", pickMany:"（可多选）",
    contactSection:"联系方式（选填）",
    phoneLbl:"电话", phonePh:"手机号码",
    whatsappLbl:"WhatsApp", whatsappPh:"WhatsApp 号码",
    instagramLbl:"Instagram", instagramPh:"IG 用户名",
    wechatLbl:"微信", wechatPh:"微信号",
    contactNote:"联系方式仅在对方查看你的帖子时可见",
    publish:"发布上线", publishing:"发布中...",
    published:"发布成功！",
    publishedSub:"你的信息已上线，正在为你匹配附近的人",
    myInfo:"我的信息", offline:"下线 / 重新发布",
    have:"有", want:"想换",
    matchLabel:"可互换",
    matchDesc:"你们的需求匹配！",
    contactBtn:"联系对方交换", msgBtn:"发消息",
    noMatchYet:"暂时不匹配，可联系对方看看",
    postFirst:"发布你的信息后可查看匹配",
    noResults:"暂无匹配的信息",
    contactTitle:"联系",
    meetTip:"建议约在附近的喜茶门店见面交换",
    gotIt:"知道了",
    postCta:"发布你的冰箱贴",
    postCtaSub:"告诉大家你有什么、想换什么，系统自动匹配附近的人",
    goPost:"去发布",
    just:"刚刚", minAgo:"分钟前", hrAgo:"小时前", dayAgo:"天前",
    within:"范围", loading:"加载中...",
    addHome:"添加到主屏幕，体验更好",
    chatPh:"输入消息...", send:"发送",
    noChats:"暂无消息", noChatsDesc:"和其他人交换冰箱贴时会在这里显示消息",
    chatWith:"和 {name} 的对话",
    me:"我", unread:"未读",
    mapLocating:"正在定位...",
    mapFallback:"请输入 Google Maps API Key 以使用地图自动补全",
    viewContact:"查看联系方式",
  },
  en: {
    title:"⚽ Heytea WC Swap", subtitle:"Toronto",
    active:"active", matches:"matches", online:"Online",
    map:"Map", browse:"Browse", post:"Post", mine:"Mine", msgs:"Chat",
    all:"All", swappable:"Swappable",
    postTitle:"Post your magnet",
    nickname:"Nickname", nickPh:"What should we call you?",
    location:"Your location", locPh:"Search address...",
    radius:"Search radius",
    iHave:"I have", pickOne:"(pick one)",
    iWant:"I want", pickMany:"(pick multiple)",
    contactSection:"Contact (optional)",
    phoneLbl:"Phone", phonePh:"Phone number",
    whatsappLbl:"WhatsApp", whatsappPh:"WhatsApp number",
    instagramLbl:"Instagram", instagramPh:"IG username",
    wechatLbl:"WeChat", wechatPh:"WeChat ID",
    contactNote:"Contact info is visible when others view your listing",
    publish:"Go live", publishing:"Posting...",
    published:"Published!",
    publishedSub:"Your listing is live. Matching nearby swappers now.",
    myInfo:"My listing", offline:"Go offline / Re-post",
    have:"Have", want:"Want",
    matchLabel:"Match",
    matchDesc:"Your needs match!",
    contactBtn:"Contact to swap", msgBtn:"Message",
    noMatchYet:"No match yet — you can still reach out",
    postFirst:"Post your listing to see matches",
    noResults:"No listings found",
    contactTitle:"Contact",
    meetTip:"Meet at a nearby Heytea store for safety.",
    gotIt:"Got it",
    postCta:"Post your magnet",
    postCtaSub:"Tell everyone what you have and want — we'll match you nearby",
    goPost:"Post now",
    just:"just now", minAgo:"m ago", hrAgo:"h ago", dayAgo:"d ago",
    within:"within", loading:"Loading...",
    addHome:"Add to home screen for a better experience",
    chatPh:"Type a message...", send:"Send",
    noChats:"No messages yet", noChatsDesc:"Messages will appear here when you chat with other swappers",
    chatWith:"Chat with {name}",
    me:"Me", unread:"unread",
    mapLocating:"Locating...",
    mapFallback:"Add a Google Maps API Key to enable address autocomplete",
    viewContact:"View contact info",
  }
};

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

const mName = (id, lang) => MAGNETS.find(x => x.id === id)?.[lang] || id;
const mFind = (id) => MAGNETS.find(x => x.id === id);
const mColor = (id) => { const m = mFind(id); if (!m) return "#888"; return m.c1 === "#FFF" ? m.c2 : m.c1; };

function getOwnerToken() {
  let t = localStorage.getItem("heytea-owner");
  if (!t) { t = crypto.randomUUID(); localStorage.setItem("heytea-owner", t); }
  return t;
}

function getConversationId(tokenA, tokenB) {
  return [tokenA, tokenB].sort().join("_");
}

const timeAgo = (ts, t) => {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return t.just;
  if (d < 3600000) return Math.floor(d / 60000) + t.minAgo;
  if (d < 86400000) return Math.floor(d / 3600000) + t.hrAgo;
  return Math.floor(d / 86400000) + t.dayAgo;
};

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (!GMAP_KEY) { reject(new Error("No API key")); return; }
    if (window.google?.maps?.places) { resolve(window.google.maps); return; }
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&libraries=places&callback=__gmapCb`;
    s.async = true;
    window.__gmapCb = () => { delete window.__gmapCb; resolve(window.google.maps); };
    s.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(s);
  });
}

// ════════════════════════════════════════════════════════════
//  COMPONENTS
// ════════════════════════════════════════════════════════════

function FlagCircle({ id, size = 28 }) {
  const m = mFind(id);
  if (!m) return null;
  const r = size / 2;
  if (id === "hid") return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - .5} fill="#FFD700" stroke="#DAA520" strokeWidth=".5" />
      <text x={r} y={r + 1} textAnchor="middle" dominantBaseline="central" fontSize={size * .45} fill="#8B6914" fontWeight="700">?</text>
    </svg>
  );
  if (id === "jpn") return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - .5} fill="#FFF" stroke="#ddd" strokeWidth=".5" />
      <circle cx={r} cy={r} r={r * .35} fill="#BC002D" />
    </svg>
  );
  if (id === "sui") return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={r - .5} fill="#F00" />
      <rect x={r - size * .22} y={r - size * .06} width={size * .44} height={size * .12} rx="1" fill="#FFF" />
      <rect x={r - size * .06} y={r - size * .22} width={size * .12} height={size * .44} rx="1" fill="#FFF" />
    </svg>
  );
  if (id === "eng") return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><clipPath id={`feng${size}`}><circle cx={r} cy={r} r={r - .5} /></clipPath></defs>
      <g clipPath={`url(#feng${size})`}>
        <rect x="0" y="0" width={size} height={size} fill="#FFF" />
        <rect x={r - size * .06} y="0" width={size * .12} height={size} fill="#CF081F" />
        <rect x="0" y={r - size * .06} width={size} height={size * .12} fill="#CF081F" />
      </g>
      <circle cx={r} cy={r} r={r - .5} fill="none" stroke="rgba(0,0,0,.1)" strokeWidth=".5" />
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs><clipPath id={`f${id}${size}`}><circle cx={r} cy={r} r={r - .5} /></clipPath></defs>
      <g clipPath={`url(#f${id}${size})`}>
        <rect x="0" y="0" width={size} height={size / 3} fill={m.c1} />
        <rect x="0" y={size / 3} width={size} height={size / 3} fill={m.c2} />
        <rect x="0" y={size * 2 / 3} width={size} height={size / 3} fill={m.c3} />
      </g>
      <circle cx={r} cy={r} r={r - .5} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth=".5" />
    </svg>
  );
}

function MagnetPill({ id, lang = "cn", size = "sm", onClick, selected }) {
  const m = mFind(id);
  if (!m) return null;
  const c = mColor(id);
  return (
    <span onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: size === "sm" ? "3px 9px" : "5px 12px",
      borderRadius: 20, fontSize: size === "sm" ? 12 : 14, fontWeight: 500,
      background: selected ? c + "15" : "#f5f5f0",
      border: `1.5px solid ${selected ? c : "#e0e0d8"}`,
      color: selected ? c : "#1a1a1a",
      cursor: onClick ? "pointer" : "default",
      transition: "all .12s", whiteSpace: "nowrap", userSelect: "none",
    }}>
      <span style={{ display: "flex", flexShrink: 0 }}><FlagCircle id={id} size={size === "sm" ? 16 : 20} /></span>
      {m[lang]}
    </span>
  );
}

// ── Google Map View ──
function GoogleMapView({ listings, onSelect, myListing }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const circlesRef = useRef([]);
  const [gmaps, setGmaps] = useState(null);

  useEffect(() => {
    loadGoogleMaps().then(g => setGmaps(g)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!gmaps || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new gmaps.Map(mapRef.current, {
      center: { lat: 43.7, lng: -79.4 },
      zoom: 11,
      disableDefaultUI: true,
      zoomControl: true,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
      ],
    });
  }, [gmaps]);

  useEffect(() => {
    if (!gmaps || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    // Clear old markers
    markersRef.current.forEach(m => m.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    const allListings = myListing
      ? [myListing, ...listings.filter(l => l.id !== myListing.id)]
      : listings;

    const bounds = new gmaps.LatLngBounds();

    allListings.forEach(l => {
      if (!l.lat || !l.lng) return;
      const isMine = myListing && l.id === myListing.id;
      const isMatch = myListing && l.id !== myListing.id &&
        l.want?.includes(myListing.have) && myListing.want?.includes(l.have);

      const pos = { lat: l.lat, lng: l.lng };
      bounds.extend(pos);

      const marker = new gmaps.Marker({
        position: pos,
        map,
        title: l.nickname,
        icon: {
          path: gmaps.SymbolPath.CIRCLE,
          fillColor: isMine ? "#3b82f6" : isMatch ? "#10b981" : mColor(l.have),
          fillOpacity: 1,
          strokeColor: isMine ? "#1d4ed8" : isMatch ? "#059669" : "#fff",
          strokeWeight: isMine || isMatch ? 3 : 2,
          scale: isMine || isMatch ? 12 : 8,
        },
        zIndex: isMine ? 100 : isMatch ? 50 : 1,
        label: isMine ? { text: "Me", color: "#fff", fontSize: "9px", fontWeight: "600" } : undefined,
      });

      marker.addListener("click", () => onSelect(l));
      markersRef.current.push(marker);

      // Radius circle for own listing
      if (isMine) {
        const circle = new gmaps.Circle({
          map,
          center: pos,
          radius: (l.radius || 5) * 1000,
          fillColor: "#3b82f6",
          fillOpacity: 0.06,
          strokeColor: "#3b82f6",
          strokeOpacity: 0.25,
          strokeWeight: 1.5,
        });
        circlesRef.current.push(circle);
      }
    });

    if (allListings.length > 0) {
      map.fitBounds(bounds, { top: 20, right: 20, bottom: 20, left: 20 });
      if (allListings.length === 1) map.setZoom(13);
    }
  }, [gmaps, listings, myListing, onSelect]);

  if (!GMAP_KEY) return <FallbackMapView listings={listings} onSelect={onSelect} myListing={myListing} />;

  return (
    <div ref={mapRef} style={{
      width: "100%", height: 280, borderRadius: 16,
      overflow: "hidden", border: "1px solid #e0e0d8",
      background: "#e9f2e9",
    }} />
  );
}

// ── Fallback map (no API key) ──
function FallbackMapView({ listings, onSelect, myListing }) {
  const B = { minLat: 43.55, maxLat: 43.92, minLng: -79.75, maxLng: -79.15 };
  const toX = lng => ((lng - B.minLng) / (B.maxLng - B.minLng)) * 100;
  const toY = lat => (1 - (lat - B.minLat) / (B.maxLat - B.minLat)) * 100;
  const areas = [
    { n: "Downtown", x: 55, y: 68 }, { n: "Markham", x: 72, y: 28 },
    { n: "Scarborough", x: 82, y: 48 }, { n: "North York", x: 48, y: 40 },
    { n: "Mississauga", x: 18, y: 58 }, { n: "Richmond Hill", x: 58, y: 22 },
    { n: "Vaughan", x: 32, y: 28 }, { n: "Etobicoke", x: 25, y: 52 },
  ];

  const allListings = myListing
    ? [myListing, ...listings.filter(l => l.id !== myListing.id)]
    : listings;

  return (
    <div style={{
      position: "relative", width: "100%", paddingBottom: "72%",
      background: "linear-gradient(145deg,#e9f2e9,#d6e6d6 50%,#ccdccc)",
      borderRadius: 16, overflow: "hidden", border: "1px solid #e0e0d8",
    }}>
      {[25, 50, 75].map(p => <div key={`h${p}`} style={{ position: "absolute", left: 0, right: 0, top: `${p}%`, height: 1, background: "rgba(0,0,0,.04)" }} />)}
      {[25, 50, 75].map(p => <div key={`v${p}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${p}%`, width: 1, background: "rgba(0,0,0,.04)" }} />)}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "16%", background: "linear-gradient(to bottom,rgba(100,160,210,.1),rgba(100,160,210,.25))" }} />
      <span style={{ position: "absolute", bottom: "4%", right: "6%", fontSize: 10, color: "rgba(60,100,140,.35)", fontWeight: 500 }}>Lake Ontario</span>
      {areas.map(a => <span key={a.n} style={{ position: "absolute", left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%,-50%)", fontSize: 9, color: "rgba(0,0,0,.18)", fontWeight: 500, pointerEvents: "none" }}>{a.n}</span>)}
      {allListings.map(l => {
        const isMine = myListing && l.id === myListing.id;
        const isM = myListing && l.id !== myListing.id && l.want?.includes(myListing.have) && myListing.want?.includes(l.have);
        const x = toX(l.lng), y = toY(l.lat);
        return (
          <div key={l.id}>
            {isMine && (
              <div style={{
                position: "absolute", left: `${x}%`, top: `${y}%`,
                transform: "translate(-50%,-50%)",
                width: `${(l.radius || 5) * 6}%`, height: `${(l.radius || 5) * 6}%`,
                borderRadius: "50%", background: "rgba(59,130,246,.08)",
                border: "1.5px solid rgba(59,130,246,.2)",
                pointerEvents: "none", zIndex: 0,
              }} />
            )}
            <button onClick={() => onSelect(l)} aria-label={l.nickname} style={{
              position: "absolute", left: `${x}%`, top: `${y}%`,
              transform: "translate(-50%,-50%)",
              width: isMine ? 36 : isM ? 34 : 26,
              height: isMine ? 36 : isM ? 34 : 26,
              borderRadius: "50%",
              background: isMine ? "#3b82f6" : isM ? "#10b981" : "#fff",
              border: isMine ? "3px solid #1d4ed8" : isM ? "3px solid #059669" : "2px solid #fff",
              boxShadow: isMine
                ? "0 0 0 4px rgba(59,130,246,.25),0 2px 8px rgba(0,0,0,.2)"
                : isM
                  ? "0 0 0 4px rgba(16,185,129,.25),0 2px 8px rgba(0,0,0,.2)"
                  : "0 1px 4px rgba(0,0,0,.25)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              animation: isM ? "pulse 2s infinite" : "none",
              zIndex: isMine ? 20 : isM ? 10 : 1, padding: 0, overflow: "hidden",
            }}>
              {isMine ? <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>Me</span>
                : isM ? <span style={{ fontSize: 14 }}>⚡</span>
                : <FlagCircle id={l.have} size={22} />}
            </button>
          </div>
        );
      })}
      <style>{`@keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(16,185,129,.25),0 2px 8px rgba(0,0,0,.2)}50%{box-shadow:0 0 0 8px rgba(16,185,129,.1),0 2px 12px rgba(0,0,0,.25)}}`}</style>
    </div>
  );
}

// ── Address Autocomplete ──
function AddressInput({ value, onChange, onPlaceSelect, placeholder, style: inputStyle }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);

  useEffect(() => {
    if (!GMAP_KEY || autocompleteRef.current) return;
    loadGoogleMaps().then(gmaps => {
      if (!inputRef.current) return;
      const ac = new gmaps.places.Autocomplete(inputRef.current, {
        types: ["address"],
        componentRestrictions: { country: ["ca", "us"] },
        fields: ["formatted_address", "geometry"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (place?.geometry?.location) {
          const addr = place.formatted_address || value;
          onChange(addr);
          onPlaceSelect({
            address: addr,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
      autocompleteRef.current = ac;
    }).catch(() => {});
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={inputStyle}
    />
  );
}

// ── Listing Card ──
function ListingCard({ listing: l, myListing, onContact, onMessage, expanded, onToggle, lang, t }) {
  const isMine = myListing && l.id === myListing.id;
  const isM = !isMine && myListing && l.want?.includes(myListing.have) && myListing.want?.includes(l.have);
  const c = mColor(l.have);
  const hasContact = l.phone || l.whatsapp || l.instagram || l.wechat;
  return (
    <div onClick={onToggle} style={{
      padding: "12px 14px",
      background: isMine ? "rgba(59,130,246,.04)" : isM ? "rgba(16,185,129,.04)" : "#fff",
      border: `1.5px solid ${isMine ? "#3b82f6" : isM ? "#10b981" : "#e5e5e0"}`,
      borderRadius: 14, cursor: "pointer", transition: "all .12s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: isMine ? "rgba(59,130,246,.15)" : c + "15",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 600, color: isMine ? "#3b82f6" : c, flexShrink: 0,
        }}>{l.nickname?.[0]}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nickname}</span>
            {isMine && <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, background: "rgba(59,130,246,.1)", padding: "2px 8px", borderRadius: 10 }}>{t.me}</span>}
            {isM && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600, background: "rgba(16,185,129,.1)", padding: "2px 8px", borderRadius: 10 }}>{t.matchLabel}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.address} · {t.within} {l.radius}km · {timeAgo(l.created_at, t)}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#888" }}>{t.have}</span>
        <MagnetPill id={l.have} lang={lang} selected size="sm" />
        <span style={{ fontSize: 11, color: "#aaa", margin: "0 1px" }}>→</span>
        <span style={{ fontSize: 11, color: "#888" }}>{t.want}</span>
        {l.want?.map(w => <MagnetPill key={w} id={w} lang={lang} size="sm" />)}
      </div>
      {expanded && !isMine && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
          {isM && (
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 500, marginBottom: 8 }}>
              {t.matchDesc} {mName(myListing.have, lang)} ↔ {mName(l.have, lang)}
            </div>
          )}
          {!isM && <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{myListing ? t.noMatchYet : t.postFirst}</div>}
          {myListing && (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={e => { e.stopPropagation(); onMessage(l); }} style={{
                flex: 1, padding: "10px 0", border: "none", borderRadius: 10,
                background: isM ? "#10b981" : "#333", color: "#fff",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
              }}>{t.msgBtn}</button>
              {hasContact && (
                <button onClick={e => { e.stopPropagation(); onContact(l); }} style={{
                  flex: 1, padding: "10px 0", border: "1.5px solid #ddd", borderRadius: 10,
                  background: "transparent", color: "#333",
                  fontWeight: 500, fontSize: 13, cursor: "pointer",
                }}>{t.viewContact}</button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Contact Modal (multiple contact methods) ──
function ContactModal({ listing, onClose, t }) {
  if (!listing) return null;
  const contacts = [
    listing.phone && { icon: "📞", label: t.phoneLbl, value: listing.phone },
    listing.whatsapp && { icon: "💬", label: t.whatsappLbl, value: listing.whatsapp },
    listing.instagram && { icon: "📸", label: t.instagramLbl, value: `@${listing.instagram.replace(/^@/, "")}` },
    listing.wechat && { icon: "🟢", label: t.wechatLbl, value: listing.wechat },
  ].filter(Boolean);

  if (contacts.length === 0) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: "18px 18px 0 0", padding: "20px 18px 28px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "#ddd", margin: "0 auto 14px" }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>{t.contactTitle} {listing.nickname}</div>
        <div style={{ fontSize: 12, color: "#888", marginBottom: 14 }}>
          {listing.address} · {t.have} {mName(listing.have, "en")}
        </div>
        {contacts.map((c, i) => (
          <div key={i} style={{ padding: 14, borderRadius: 12, background: "#f9f9f5", border: "1px solid #eee", marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: "#888", marginBottom: 3 }}>{c.icon} {c.label}</div>
            <div style={{ fontSize: 16, fontWeight: 600, letterSpacing: .3 }}>{c.value}</div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: "#999", marginBottom: 14, lineHeight: 1.5 }}>{t.meetTip}</div>
        <button onClick={onClose} style={{ width: "100%", padding: "11px 0", border: "none", borderRadius: 12, background: "#333", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{t.gotIt}</button>
      </div>
    </div>
  );
}

// ── Chat View ──
function ChatView({ ownerToken, allListings, t, lang, onOpenChat }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      try {
        // Get all messages involving this user
        const { data } = await supabase
          .from("messages")
          .select("*")
          .or(`sender_token.eq.${ownerToken},receiver_token.eq.${ownerToken}`)
          .order("created_at", { ascending: false });

        if (data) {
          // Group by conversation_id, keep latest message
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
            if (!msg.read && msg.receiver_token === ownerToken) {
              convMap[msg.conversation_id].unread++;
            }
          });
          setConversations(Object.values(convMap));
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    loadConversations();

    // Realtime subscription for new messages
    const channel = supabase.channel("chat-list")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `receiver_token=eq.${ownerToken}`,
      }, () => { loadConversations(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ownerToken]);

  if (loading) return <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>{t.loading}</div>;

  if (conversations.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 50, color: "#aaa" }}>
        <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#888" }}>{t.noChats}</div>
        <div style={{ fontSize: 12, marginTop: 4 }}>{t.noChatsDesc}</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {conversations.map(conv => {
        const other = allListings.find(l => l.owner_token === conv.otherToken);
        const name = other?.nickname || "???";
        const c = other ? mColor(other.have) : "#888";
        return (
          <div key={conv.id} onClick={() => onOpenChat(conv.otherToken, name)}
            style={{
              padding: "12px 14px", background: conv.unread > 0 ? "rgba(59,130,246,.04)" : "#fff",
              border: `1.5px solid ${conv.unread > 0 ? "#3b82f6" : "#e5e5e0"}`,
              borderRadius: 14, cursor: "pointer",
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", background: c + "15",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 17, fontWeight: 600, color: c, flexShrink: 0,
              }}>{name[0]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
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
      })}
    </div>
  );
}

// ── Single Chat Thread ──
function ChatThread({ ownerToken, otherToken, otherName, onBack, t }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const convId = getConversationId(ownerToken, otherToken);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true });
      if (data) setMessages(data);

      // Mark as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("conversation_id", convId)
        .eq("receiver_token", ownerToken)
        .eq("read", false);
    }
    load();

    const channel = supabase.channel(`chat-${convId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${convId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
        // Mark incoming as read immediately
        if (payload.new.receiver_token === ownerToken) {
          supabase.from("messages").update({ read: true }).eq("id", payload.new.id).then(() => {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [convId, ownerToken, otherToken]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await supabase.from("messages").insert({
        conversation_id: convId,
        sender_token: ownerToken,
        receiver_token: otherToken,
        text: text.trim(),
      });
      setText("");
    } catch (e) { console.error(e); }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
      {/* Chat header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0 12px", borderBottom: "1px solid #eee" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", fontSize: 20, cursor: "pointer",
          padding: "4px 8px", color: "#333",
        }}>←</button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{otherName}</span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflow: "auto", padding: "12px 0", display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.map(msg => {
          const isMe = msg.sender_token === ownerToken;
          return (
            <div key={msg.id} style={{
              display: "flex", justifyContent: isMe ? "flex-end" : "flex-start",
              padding: "0 4px",
            }}>
              <div style={{
                maxWidth: "75%", padding: "9px 14px", borderRadius: 16,
                background: isMe ? "#3b82f6" : "#f0f0ea",
                color: isMe ? "#fff" : "#333",
                fontSize: 14, lineHeight: 1.4,
                borderBottomRightRadius: isMe ? 4 : 16,
                borderBottomLeftRadius: isMe ? 16 : 4,
              }}>
                {msg.text}
                <div style={{
                  fontSize: 9, marginTop: 3, opacity: 0.6,
                  textAlign: isMe ? "right" : "left",
                }}>{timeAgo(msg.created_at, t)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: 8, padding: "10px 0", borderTop: "1px solid #eee" }}>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder={t.chatPh}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: 20, fontSize: 14,
            border: "1.5px solid #ddd", background: "#fff", outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button onClick={handleSend} disabled={!text.trim() || sending}
          style={{
            padding: "10px 18px", borderRadius: 20, border: "none",
            background: text.trim() ? "#3b82f6" : "#ccc",
            color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
            opacity: text.trim() ? 1 : 0.5,
          }}>{t.send}</button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
//  APP
// ════════════════════════════════════════════════════════════

export default function App() {
  const [lang, setLang] = useState(() => localStorage.getItem("heytea-lang") || "cn");
  const t = T[lang];
  const [tab, setTab] = useState("map");
  const [listings, setListings] = useState([]);
  const [myListing, setMyListing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [contactModal, setContactModal] = useState(null);
  const [filterMagnet, setFilterMagnet] = useState("");
  const [loading, setLoading] = useState(true);

  // Chat state
  const [chatTarget, setChatTarget] = useState(null); // { token, name }
  const [unreadCount, setUnreadCount] = useState(0);

  // Form state
  const [fn, setFn] = useState("");
  const [fAddr, setFAddr] = useState("");
  const [fLat, setFLat] = useState(null);
  const [fLng, setFLng] = useState(null);
  const [fRad, setFRad] = useState(5);
  const [fHave, setFHave] = useState("");
  const [fWant, setFWant] = useState([]);
  const [fPhone, setFPhone] = useState("");
  const [fWhatsapp, setFWhatsapp] = useState("");
  const [fInstagram, setFInstagram] = useState("");
  const [fWechat, setFWechat] = useState("");
  const [posting, setPosting] = useState(false);

  const ownerToken = useMemo(() => getOwnerToken(), []);

  // ── Load listings ──
  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase.from("listings").select("*").eq("active", true).order("created_at", { ascending: false });
        if (data) {
          setListings(data);
          const mine = data.find(l => l.owner_token === ownerToken);
          if (mine) setMyListing(mine);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();

    const channel = supabase.channel("listings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setListings(prev => [payload.new, ...prev.filter(l => l.id !== payload.new.id)]);
          if (payload.new.owner_token === ownerToken) setMyListing(payload.new);
        } else if (payload.eventType === "UPDATE") {
          if (!payload.new.active) {
            setListings(prev => prev.filter(l => l.id !== payload.new.id));
            if (payload.new.owner_token === ownerToken) setMyListing(null);
          } else {
            setListings(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
            if (payload.new.owner_token === ownerToken) setMyListing(payload.new);
          }
        } else if (payload.eventType === "DELETE") {
          setListings(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ownerToken]);

  // ── Unread count ──
  useEffect(() => {
    async function countUnread() {
      try {
        const { count } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_token", ownerToken)
          .eq("read", false);
        setUnreadCount(count || 0);
      } catch (e) { console.error(e); }
    }
    countUnread();

    const channel = supabase.channel("unread-count")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `receiver_token=eq.${ownerToken}`,
      }, () => { countUnread(); })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
      }, () => { countUnread(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ownerToken]);

  useEffect(() => { localStorage.setItem("heytea-lang", lang); }, [lang]);

  const filtered = useMemo(() => {
    let res = listings;
    if (filterMagnet && filterMagnet !== "__match__") res = res.filter(l => l.have === filterMagnet);
    if (filterMagnet === "__match__" && myListing) res = res.filter(l => l.id !== myListing.id && l.want?.includes(myListing.have) && myListing.want?.includes(l.have));
    return res;
  }, [listings, filterMagnet, myListing]);

  const matchCount = useMemo(() => {
    if (!myListing) return 0;
    return listings.filter(l => l.id !== myListing.id && l.want?.includes(myListing.have) && myListing.want?.includes(l.have)).length;
  }, [listings, myListing]);

  // ── Post listing ──
  const handlePost = useCallback(async () => {
    if (!fn || !fAddr || !fHave || fWant.length === 0 || posting) return;
    setPosting(true);
    try {
      // Use geocoded lat/lng if available, otherwise generate near Toronto center
      const lat = fLat ?? 43.65 + (Math.random() - .5) * .2;
      const lng = fLng ?? -79.38 + (Math.random() - .5) * .3;
      const { data, error } = await supabase.from("listings").insert({
        owner_token: ownerToken, nickname: fn, address: fAddr,
        radius: fRad, have: fHave, want: fWant,
        wechat: fWechat || "", phone: fPhone || "",
        whatsapp: fWhatsapp || "", instagram: fInstagram || "",
        lat, lng,
      }).select().single();
      if (error) throw error;
      setMyListing(data);
      setListings(prev => [data, ...prev]);
      setTab("map");
    } catch (e) { console.error(e); alert("Failed to post. Please try again."); }
    setPosting(false);
  }, [fn, fAddr, fLat, fLng, fRad, fHave, fWant, fPhone, fWhatsapp, fInstagram, fWechat, posting, ownerToken]);

  // ── Go offline ──
  const handleOffline = async () => {
    if (!myListing) return;
    try {
      await supabase.from("listings").update({ active: false }).eq("id", myListing.id);
      setListings(prev => prev.filter(l => l.id !== myListing.id));
      setMyListing(null);
      setFn(""); setFAddr(""); setFLat(null); setFLng(null);
      setFHave(""); setFWant([]); setFPhone(""); setFWhatsapp("");
      setFInstagram(""); setFWechat("");
    } catch (e) { console.error(e); }
  };

  // ── Open chat with someone ──
  const openChat = (listing) => {
    if (!myListing) return;
    setChatTarget({ token: listing.owner_token, name: listing.nickname });
    setTab("msgs");
  };

  const openChatDirect = (token, name) => {
    setChatTarget({ token, name });
  };

  const canPost = fn && fAddr && fHave && fWant.length > 0;

  const inp = { width: "100%", padding: "10px 14px", borderRadius: 10, fontSize: 14, border: "1.5px solid #ddd", background: "#fff", color: "#333", outline: "none", boxSizing: "border-box" };
  const lbl = { fontSize: 13, fontWeight: 500, color: "#666", display: "block", marginTop: 16, marginBottom: 6 };
  const chip = (on) => ({ padding: "5px 13px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 500, background: on ? "#333" : "#f5f5f0", color: on ? "#fff" : "#555", border: `1px solid ${on ? "transparent" : "#e5e5e0"}`, userSelect: "none" });

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 15, color: "#888" }}>{t.loading}</div>
  );

  return (
    <div style={{ maxWidth: 440, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{ padding: "14px 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -.3 }}>{t.title}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
            {t.subtitle} · {listings.length} {t.active}
            {matchCount > 0 && <span style={{ color: "#10b981", fontWeight: 600 }}> · {matchCount} {t.matches}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {myListing && <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 500, background: "rgba(16,185,129,.1)", color: "#10b981" }}>{t.online}</span>}
          <button onClick={() => setLang(lang === "cn" ? "en" : "cn")} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#f0f0ea", border: "1px solid #ddd", color: "#333" }}>
            {lang === "cn" ? "EN" : "中"}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: "0 16px 88px", overflow: "auto" }}>

        {/* MAP TAB */}
        {tab === "map" && (
          <div>
            <GoogleMapView
              listings={filtered}
              onSelect={l => { setExpandedId(l.id); setTab("browse"); }}
              myListing={myListing}
            />
            <div style={{ marginTop: 10, display: "flex", gap: 5, flexWrap: "wrap" }}>
              <span onClick={() => setFilterMagnet("")} style={chip(!filterMagnet)}>{t.all}</span>
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
            {!myListing && (
              <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 14, background: "linear-gradient(135deg,rgba(16,185,129,.05),rgba(59,130,246,.05))", border: "1px solid rgba(16,185,129,.12)" }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{t.postCta}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 3 }}>{t.postCtaSub}</div>
                <button onClick={() => setTab("post")} style={{ marginTop: 10, padding: "8px 20px", border: "none", borderRadius: 10, background: "#10b981", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>{t.goPost}</button>
              </div>
            )}
            {myListing && matchCount > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#10b981" }}>{t.swappable} ({matchCount})</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {filtered.filter(l => myListing && l.id !== myListing.id && l.want?.includes(myListing.have) && myListing.want?.includes(l.have))
                    .map(l => <ListingCard key={l.id} listing={l} myListing={myListing} onContact={setContactModal} onMessage={openChat} expanded={expandedId === l.id} onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)} lang={lang} t={t} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* BROWSE TAB */}
        {tab === "browse" && (
          <div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <span onClick={() => setFilterMagnet("")} style={chip(!filterMagnet || filterMagnet === "")}>{t.all} ({listings.length})</span>
              {myListing && <span onClick={() => setFilterMagnet(filterMagnet === "__match__" ? "" : "__match__")} style={chip(filterMagnet === "__match__")}>{t.swappable} ({matchCount})</span>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map(l => <ListingCard key={l.id} listing={l} myListing={myListing} onContact={setContactModal} onMessage={openChat} expanded={expandedId === l.id} onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)} lang={lang} t={t} />)}
              {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div><div style={{ fontSize: 13 }}>{t.noResults}</div></div>}
            </div>
          </div>
        )}

        {/* POST TAB */}
        {tab === "post" && (
          <div>
            {myListing ? (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{t.myInfo}</div>
                <ListingCard listing={myListing} myListing={myListing} expanded onToggle={() => {}} onContact={() => {}} onMessage={() => {}} lang={lang} t={t} />
                <button onClick={handleOffline} style={{ width: "100%", marginTop: 10, padding: "10px 0", border: "1.5px solid #ef4444", borderRadius: 10, background: "transparent", color: "#ef4444", fontWeight: 500, fontSize: 14, cursor: "pointer" }}>{t.offline}</button>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{t.postTitle}</div>

                <label style={{ ...lbl, marginTop: 0 }}>{t.nickname}</label>
                <input value={fn} onChange={e => setFn(e.target.value)} placeholder={t.nickPh} style={inp} />

                <label style={lbl}>{t.location}</label>
                <AddressInput
                  value={fAddr}
                  onChange={setFAddr}
                  onPlaceSelect={({ address, lat, lng }) => { setFAddr(address); setFLat(lat); setFLng(lng); }}
                  placeholder={t.locPh}
                  style={inp}
                />
                {fLat && fLng && (
                  <div style={{ fontSize: 11, color: "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <span>✓</span> {fAddr}
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 12, color: "#888", whiteSpace: "nowrap" }}>{t.radius}</span>
                  {[1, 3, 5, 10].map(r => <span key={r} onClick={() => setFRad(r)} style={{ ...chip(fRad === r), padding: "4px 12px", fontSize: 12 }}>{r} km</span>)}
                </div>

                <label style={lbl}>{t.iHave} <span style={{ fontWeight: 400, color: "#aaa" }}>{t.pickOne}</span></label>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {MAGNETS.map(m => <MagnetPill key={m.id} id={m.id} lang={lang} selected={fHave === m.id} onClick={() => { setFHave(m.id); setFWant(p => p.filter(w => w !== m.id)); }} />)}
                </div>

                <label style={lbl}>{t.iWant} <span style={{ fontWeight: 400, color: "#aaa" }}>{t.pickMany}</span></label>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                  {MAGNETS.filter(m => m.id !== fHave).map(m => <MagnetPill key={m.id} id={m.id} lang={lang} selected={fWant.includes(m.id)} onClick={() => setFWant(p => p.includes(m.id) ? p.filter(x => x !== m.id) : [...p, m.id])} />)}
                </div>

                {/* Contact methods - all optional */}
                <label style={lbl}>{t.contactSection}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 14px", borderRadius: 12, background: "#f9f9f5", border: "1px solid #eee" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>📞</span>
                    <input value={fPhone} onChange={e => setFPhone(e.target.value)} placeholder={t.phonePh} style={{ ...inp, marginTop: 0 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>💬</span>
                    <input value={fWhatsapp} onChange={e => setFWhatsapp(e.target.value)} placeholder={t.whatsappPh} style={{ ...inp, marginTop: 0 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>📸</span>
                    <input value={fInstagram} onChange={e => setFInstagram(e.target.value)} placeholder={t.instagramPh} style={{ ...inp, marginTop: 0 }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, width: 22, textAlign: "center" }}>🟢</span>
                    <input value={fWechat} onChange={e => setFWechat(e.target.value)} placeholder={t.wechatPh} style={{ ...inp, marginTop: 0 }} />
                  </div>
                </div>
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 4 }}>{t.contactNote}</div>

                <button onClick={handlePost} disabled={!canPost || posting} style={{
                  width: "100%", marginTop: 18, padding: "12px 0", border: "none", borderRadius: 12,
                  background: canPost ? "#10b981" : "#ccc",
                  color: "#fff", fontWeight: 600, fontSize: 15, cursor: "pointer",
                  opacity: canPost ? 1 : .5,
                }}>{posting ? t.publishing : t.publish}</button>
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
              onBack={() => setChatTarget(null)}
              t={t}
            />
          ) : (
            <ChatView
              ownerToken={ownerToken}
              allListings={listings}
              t={t}
              lang={lang}
              onOpenChat={openChatDirect}
            />
          )
        )}
      </div>

      {/* ── Contact Modal ── */}
      <ContactModal listing={contactModal} onClose={() => setContactModal(null)} t={t} />

      {/* ── Bottom Nav ── */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 440, display: "flex", justifyContent: "space-around", alignItems: "center", padding: "6px 0 max(6px,env(safe-area-inset-bottom))", background: "#fff", borderTop: "1px solid #eee", zIndex: 50 }}>
        {[
          { id: "map", icon: "📍", label: t.map },
          { id: "browse", icon: "🔍", label: t.browse },
          { id: "msgs", icon: "💬", label: t.msgs, badge: unreadCount },
          { id: "post", icon: myListing ? "👤" : "➕", label: myListing ? t.mine : t.post },
        ].map(x => (
          <button key={x.id} onClick={() => { setTab(x.id); setExpandedId(null); if (x.id !== "msgs") setChatTarget(null); }} style={{
            position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
            background: "none", border: "none", cursor: "pointer", padding: "3px 16px",
            color: tab === x.id ? "#10b981" : "#999", fontWeight: tab === x.id ? 600 : 400, fontSize: 10,
          }}>
            <span style={{ fontSize: 18 }}>{x.icon}</span>{x.label}
            {x.badge > 0 && (
              <span style={{
                position: "absolute", top: -2, right: 6,
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
