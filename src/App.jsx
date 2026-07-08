import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase.js";

// Raw SVG source for each flag, inlined at build time so map-marker icons (rendered as
// data: URI images) don't have to fetch an external file — data: URIs can't reliably
// resolve external resource references, which left the flags transparent on the map.
const FLAG_SVG_SOURCE = Object.fromEntries(
  Object.entries(import.meta.glob("./assets/flags/*.svg", { eager: true, query: "?raw", import: "default" }))
    .map(([path, raw]) => [path.match(/([^/]+)\.svg$/)[1], raw])
);

// ════════════════════════════════════════════════════════════
//  DATA — 22 magnets (including England + Mystery)
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
//  WORLD VIEW — default map center/zoom when no location is known yet.
//  Mainland China isn't supported yet (see chinaNotSupported) — a future phase may add it via Amap.
// ════════════════════════════════════════════════════════════

const WORLD_VIEW = { lat: 20, lng: 10, zoom: 2 };

// ════════════════════════════════════════════════════════════
//  TRANSLATIONS
// ════════════════════════════════════════════════════════════

const T = {
  cn: {
    title:"⚽ 喜茶世界杯换贴", subtitle:"海外版",
    active:"条帖子", matches:"个匹配",
    map:"地图", browse:"浏览", post:"发布", mine:"我的", msgs:"消息",
    all:"全部", swappable:"可互换",
    available:"可换国家",
    optional:"选填",
    postTitle:"发布换贴信息",
    postingAs:"当前昵称", editNickname:"修改",
    location:"详细地址", locPh:"搜索地址...",
    swapAreas:"意向交换地区", swapAreasPh:"输入地区名，按回车添加",
    swapAreasHint:"如：Downtown、North York、Markham",
    iHave:"我有的冰箱贴", pickMulti:"（可多选）",
    iWant:"想换的冰箱贴", pickMany:"（可多选）",
    expireIn:"发布有效期", expireDays:"天",
    publish:"发布上线", publishing:"发布中...",
    myInfo:"我的信息", offline:"下线 / 重新发布",
    have:"有", want:"想换",
    matchLabel:"可互换",
    matchDesc:"你们的需求匹配！",
    msgBtn:"发消息",
    noMatchYet:"暂时不匹配，可联系对方看看",
    postFirst:"发布你的信息后可查看匹配",
    noResults:"暂无匹配的信息",
    postCta:"发布你的冰箱贴",
    postCtaSub:"告诉大家你有什么、想换什么，系统自动匹配附近的人",
    goPost:"去发布",
    just:"刚刚", minAgo:"分钟前", hrAgo:"小时前", dayAgo:"天前",
    loading:"加载中...",
    chatPh:"输入消息...", send:"发送",
    noChats:"暂无消息", noChatsDesc:"和其他人交换冰箱贴时会在这里显示消息",
    me:"我",
    edit:"编辑", save:"保存修改", cancel:"取消",
    myListings:"我的发布", addAnother:"➕ 发布新的一条",
    editTitle:"编辑换贴信息",
    distance:"距离", anyDistance:"不限距离", sort:"排序", newest:"最新发布", nearest:"距离最近",
    within:"内", useMyLocation:"使用我的定位",
    locatingMe:"定位中...", locationDenied:"未授权定位，已使用你发布的地址作为参考位置",
    noLocationRef:"筛选距离需要先定位，或先发布一条信息",
    mapsError:"Google 地图加载失败，请检查 API Key 设置（启用计费、启用 Maps JavaScript API + Places API、检查域名白名单）",
    mapSearch:"搜索地址、商场或地标...",
    setLocation:"设置位置", changeLocation:"更改位置",
    locationErrorGps:"无法获取定位，请手动搜索；如果浏览器已拒绝，请在系统设置里重新允许定位",
    signInDesc:"登录后即可发布、查看和接收消息", signInGoogle:"使用 Google 登录", signOut:"退出登录",
    groupSwap:"多人交换", createGroupChat:"组建群聊", openGroupChat:"进入群聊",
    groupTitle:(n) => `${n}人交换群`,
    ringLabel:(n) => `${n}人可交换`,
    groupChatTag:"群",
    noGroupChains:"当前范围内暂无可组成的多人交换环",
    deleteChat:"删除",
    chinaNotSupported:"暂不支持中国大陆地区，敬请期待",
  },
  en: {
    title:"⚽ Heytea WC Swap", subtitle:"International",
    active:"posts", matches:"matches",
    map:"Map", browse:"Browse", post:"Post", mine:"Mine", msgs:"Chat",
    all:"All", swappable:"Swappable",
    available:"Available",
    optional:"optional",
    postTitle:"Post your magnet",
    postingAs:"Nickname", editNickname:"Edit",
    location:"Address", locPh:"Search address...",
    swapAreas:"Preferred swap areas", swapAreasPh:"Type an area, press Enter to add",
    swapAreasHint:"e.g. Downtown, North York, Markham",
    iHave:"I have", pickMulti:"(pick multiple)",
    iWant:"I want", pickMany:"(pick multiple)",
    expireIn:"Post Expires in", expireDays:"days",
    publish:"Go live", publishing:"Posting...",
    myInfo:"My listing", offline:"Go offline / Re-post",
    have:"Have", want:"Want",
    matchLabel:"Match",
    matchDesc:"Your needs match!",
    msgBtn:"Message",
    noMatchYet:"No match yet — you can still reach out",
    postFirst:"Post your listing to see matches",
    noResults:"No listings found",
    postCta:"Post your magnet",
    postCtaSub:"Tell everyone what you have and want — we'll match you nearby",
    goPost:"Post now",
    just:"just now", minAgo:"m ago", hrAgo:"h ago", dayAgo:"d ago",
    loading:"Loading...",
    chatPh:"Type a message...", send:"Send",
    noChats:"No messages yet", noChatsDesc:"Messages will appear here when you chat with other swappers",
    me:"Me",
    edit:"Edit", save:"Save changes", cancel:"Cancel",
    myListings:"My listings", addAnother:"➕ Post another one",
    editTitle:"Edit your listing",
    distance:"Distance", anyDistance:"Any distance", sort:"Sort", newest:"Newest", nearest:"Nearest",
    within:"within", useMyLocation:"Use my location",
    locatingMe:"Locating...", locationDenied:"Location not granted — using your listing's address as reference",
    noLocationRef:"Filtering by distance needs your location, or post a listing first",
    mapsError:"Google Maps failed to load — check API key setup (billing enabled, Maps JavaScript API + Places API enabled, domain allow-list)",
    mapSearch:"Search an address, mall, or landmark...",
    setLocation:"Set your location", changeLocation:"Change location",
    locationErrorGps:"Couldn't get your location — search instead; if denied, re-enable location in browser settings",
    signInDesc:"Sign in to post, browse, and receive messages", signInGoogle:"Continue with Google", signOut:"Sign out",
    groupSwap:"Group swap", createGroupChat:"Create group chat", openGroupChat:"Open group chat",
    groupTitle:(n) => `${n}-person swap`,
    ringLabel:(n) => `${n}-way match available`,
    groupChatTag:"Group",
    noGroupChains:"No group swap rings in your current range yet",
    deleteChat:"Delete",
    chinaNotSupported:"Mainland China isn't supported yet — stay tuned!",
  }
};

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

const mName = (id, lang) => MAGNETS.find(x => x.id === id)?.[lang] || id;
const mFind = (id) => MAGNETS.find(x => x.id === id);
const mColor = (id) => { const m = mFind(id); if (!m) return "#888"; return m.c1 === "#FFF" ? m.c2 : m.c1; };
// Darkens colors that are too light to read against their own pale tinted background (e.g. gold, light blue).
const readableBadgeColor = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.6) return hex;
  return `rgb(${Math.round(r * 0.45)}, ${Math.round(g * 0.45)}, ${Math.round(b * 0.45)})`;
};

// Normalize have field: always return an array
const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
const EXPIRY_OPTIONS = [3, 7, 15];
const RING_COLORS = ["#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#6366f1"];
// General country code -> localized name, via the browser's built-in locale data (no maintenance).
const countryLabel = (code, lang) => {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([lang === "cn" ? "zh" : "en"], { type: "region" }).of(code.toUpperCase());
  } catch { return code; }
};
const inferPlaceLocation = (place) => {
  const parts = place?.address_components || [];
  const byType = (...types) => parts.find(p => types.some(type => p.types?.includes(type)));
  const country = byType("country")?.short_name?.toUpperCase() || "";
  const cityName = byType("locality", "postal_town", "sublocality", "sublocality_level_1", "administrative_area_level_3")?.long_name || "";
  return { country, city: cityName };
};
const publicLocationLabel = (listing, lang) => {
  const cityName = listing.city || "";
  const countryName = countryLabel(listing.country, lang);
  const parts = (listing.address || "")
    .split(",")
    .map(p => p.trim())
    .filter(Boolean)
    .filter(p => !countryName || p.toLowerCase() !== countryName.toLowerCase())
    .filter(p => !/^[A-Z]{2}\s*([A-Z]\d[A-Z]\s*\d[A-Z]\d|\d{5})?$/i.test(p));

  const isStreet = (part) => /^\d+\b/.test(part) || /\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|court|ct|plaza|pkwy|parkway)\b/i.test(part);
  const areaParts = (isStreet(parts[0] || "") ? parts.slice(1) : parts)
    .filter((part, idx, arr) => arr.findIndex(x => x.toLowerCase() === part.toLowerCase()) === idx)
    .slice(0, 2);

  if (areaParts.length) return areaParts.join(", ");
  return cityName || countryName;
};

function useViewportWidth() {
  const [width, setWidth] = useState(() => typeof window === "undefined" ? 0 : window.innerWidth);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return width;
}

// Match logic: any of my haves is in their wants, AND any of their haves is in my wants
function isMatch(myListing, other) {
  if (!myListing || !other || myListing.id === other.id) return false;
  const myHave = toArr(myListing.have);
  const theirHave = toArr(other.have);
  const myWant = myListing.want || [];
  const theirWant = other.want || [];
  return myHave.some(h => theirWant.includes(h)) && theirHave.some(h => myWant.includes(h));
}

// Match against a list of my own listings — true if ANY of them match `other`
function isMatchAny(myListings, other) {
  if (!myListings || !myListings.length || !other) return false;
  return myListings.some(mine => isMatch(mine, other));
}

// Haversine distance in km between two lat/lng points
const MAP_NEARBY_RADIUS_KM = 25;

function distanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Group swap chain matching (3-person rings, shown on the Browse tab) ──

// The specific magnet `a` would hand to `b` (first of a.have that's in b.want), or null.
function pickSwapItem(a, b) {
  const item = toArr(a.have).find(h => (b.want || []).includes(h));
  return item || null;
}

// Bounded DFS for cycles of length minLen..maxLen that start and end at `seed`. Callers are
// expected to pass in an `allListings` set that's already narrowed to the viewer's chosen
// distance range (e.g. distanceFilteredListings) — this function does no distance checks itself.
function findSwapChains(seed, allListings, { minLen = 3, maxLen = 3 } = {}) {
  const results = [];
  const owners = new Set([seed.owner_token]);

  function extend(path, edgeItems) {
    const tail = path[path.length - 1];
    if (path.length >= minLen) {
      const closingItem = pickSwapItem(tail, seed);
      if (closingItem) results.push({ members: [...path], items: [...edgeItems, closingItem] });
    }
    if (path.length === maxLen) return;
    for (const next of allListings) {
      if (owners.has(next.owner_token)) continue;
      const item = pickSwapItem(tail, next);
      if (!item) continue;
      owners.add(next.owner_token);
      path.push(next);
      edgeItems.push(item);
      extend(path, edgeItems);
      edgeItems.pop();
      path.pop();
      owners.delete(next.owner_token);
    }
  }

  extend([seed], []);
  return results;
}

// Rotate a ring's listing ids so the lexicographically smallest id comes first (direction kept,
// since reversing would imply a different set of trade items). Used to de-dupe the same ring
// discovered from different starting members.
function canonicalMatchKey(listingIds) {
  let minIdx = 0;
  for (let i = 1; i < listingIds.length; i++) if (listingIds[i] < listingIds[minIdx]) minIdx = i;
  return [...listingIds.slice(minIdx), ...listingIds.slice(0, minIdx)].join(",");
}

// Sum of the other members' distance from the viewer (each already carries __distanceKm from
// distanceFilteredListings/mapListings) — used to sort rings by "closest to me overall" first.
function chainTotalDistance(chain, ownerToken) {
  return chain.members.reduce((sum, m) => m.owner_token === ownerToken ? sum : sum + (m.__distanceKm ?? Infinity), 0);
}

// Build a flag-circle icon as an SVG data URL, for use as a Google Maps marker icon.
// Mirrors the <FlagCircle> component's rendering, plus an optional colored ring.
function buildFlagIconUrl(id, size = 32, ringColor = null, ringWidth = 3) {
  const m = mFind(id);
  const r = size / 2;
  const inner = r - ringWidth - 0.5;
  let flagSvg;
  if (!m) {
    flagSvg = `<circle cx="${r}" cy="${r}" r="${inner}" fill="#888"/>`;
  } else if (id === "hid") {
    flagSvg = `<circle cx="${r}" cy="${r}" r="${inner}" fill="#FFD700" stroke="#DAA520" stroke-width="0.5"/>
      <text x="${r}" y="${r + size * 0.03}" text-anchor="middle" dominant-baseline="central" font-size="${inner * 0.9}" fill="#8B6914" font-weight="700" font-family="sans-serif">?</text>`;
  } else if (FLAG_SVG_SOURCE[id]) {
    // Nest the flag's own <svg> (with its original viewBox) inside ours, positioned via x/y/width/height.
    const nestedFlag = FLAG_SVG_SOURCE[id].replace("<svg ", `<svg x="${r - inner}" y="${r - inner}" width="${inner * 2}" height="${inner * 2}" `);
    flagSvg = `<clipPath id="clip-${id}"><circle cx="${r}" cy="${r}" r="${inner}"/></clipPath>
      <g clip-path="url(#clip-${id})">${nestedFlag}</g>`;
  } else {
    flagSvg = `<circle cx="${r}" cy="${r}" r="${inner}" fill="#888"/>`;
  }
  const ring = ringColor ? `<circle cx="${r}" cy="${r}" r="${r - ringWidth / 2}" fill="none" stroke="${ringColor}" stroke-width="${ringWidth}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${flagSvg}${ring}</svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function getConversationId(a, b) { return [a, b].sort().join("_"); }
const generateNickname = () => `Swapper-${crypto.randomUUID().slice(0, 6)}`;

const timeAgo = (ts, t) => {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return t.just;
  if (d < 3600000) return Math.floor(d / 60000) + t.minAgo;
  if (d < 86400000) return Math.floor(d / 3600000) + t.hrAgo;
  return Math.floor(d / 86400000) + t.dayAgo;
};

const expiresAtFromDays = (days) => {
  const n = Number(days);
  if (!EXPIRY_OPTIONS.includes(n)) return null;
  return new Date(Date.now() + n * 86400000).toISOString();
};

const isExpiredListing = (listing) => {
  if (!listing?.expires_at) return false;
  return new Date(listing.expires_at).getTime() <= Date.now();
};

const expiryDaysFromListing = (listing) => {
  if (!listing?.expires_at) return "";
  const daysLeft = Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / 86400000);
  return String(EXPIRY_OPTIONS.find(days => daysLeft <= days) || 15);
};

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let __gmapsLoadPromise = null;
function loadGoogleMaps() {
  if (__gmapsLoadPromise) return __gmapsLoadPromise;
  __gmapsLoadPromise = new Promise((resolve, reject) => {
    if (!GMAP_KEY) { reject(new Error("No key")); return; }
    if (window.google?.maps?.places) { resolve(window.google.maps); return; }
    const timeout = setTimeout(() => reject(new Error("Maps load timed out")), 8000);
    // Google calls this global if the key/project is misconfigured (billing, restrictions, disabled APIs)
    window.gm_authFailure = () => {
      clearTimeout(timeout);
      reject(new Error("Google Maps auth failure - check API key, billing, and enabled APIs"));
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&libraries=places&callback=__gmCb`;
    s.async = true;
    window.__gmCb = () => {
      clearTimeout(timeout);
      delete window.__gmCb;
      resolve(window.google.maps);
    };
    s.onerror = () => {
      clearTimeout(timeout);
      reject(new Error("Maps load failed"));
    };
    document.head.appendChild(s);
  });
  return __gmapsLoadPromise;
}

// Turns raw coordinates into a human-friendly "city, region" label via Google's Geocoder —
// works anywhere in the world, unlike matching against a fixed city list.
async function reverseGeocodeLabel(lat, lng) {
  try {
    const gmaps = await loadGoogleMaps();
    const geocoder = new gmaps.Geocoder();
    const { results } = await geocoder.geocode({ location: { lat, lng } });
    const parts = results?.[0]?.address_components || [];
    const byType = (...types) => parts.find(p => types.some(type => p.types?.includes(type)));
    return byType("locality", "postal_town", "sublocality", "administrative_area_level_2")?.long_name
      || byType("administrative_area_level_1")?.long_name
      || "";
  } catch {
    return "";
  }
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

// ── Tag Input for swap areas ──
function TagInput({ tags, onChange, placeholder, hint }) {
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

// ── Google Map View (interactive, zoomable) ──
function GoogleMapView({ listings, onSelect, myListings = [], centerCoords, t, isWide = false }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const overlaysRef = useRef([]);
  const [gmaps, setGmaps] = useState(null);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    loadGoogleMaps().then(g => setGmaps(g)).catch(() => setMapError(true));
  }, []);

  // Init map
  useEffect(() => {
    if (!gmaps || !mapRef.current || mapInstanceRef.current) return;
    try {
      const initCenter = centerCoords || WORLD_VIEW;
      mapInstanceRef.current = new gmaps.Map(mapRef.current, {
        center: initCenter,
        zoom: centerCoords ? 12 : WORLD_VIEW.zoom,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      });
    } catch (e) {
      console.error(e);
      setMapError(true);
    }
  }, [gmaps]);

  // Center on the user's nearby reference point when available.
  useEffect(() => {
    if (!mapInstanceRef.current || !centerCoords) return;
    mapInstanceRef.current.panTo({ lat: centerCoords.lat, lng: centerCoords.lng });
    mapInstanceRef.current.setZoom(12);
  }, [centerCoords]);

  // Update markers
  useEffect(() => {
    if (!gmaps || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => m.setMap(null));
    overlaysRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    overlaysRef.current = [];

    const myIds = new Set(myListings.map(l => l.id));
    const allListings = myListings.length
      ? [...myListings, ...listings.filter(l => !myIds.has(l.id))]
      : listings;

    allListings.forEach(l => {
      if (!l.lat || !l.lng) return;
      const isMine = myIds.has(l.id);
      const matched = !isMine && isMatchAny(myListings, l);
      const haveArr = toArr(l.have);
      const pos = { lat: l.lat, lng: l.lng };
      const size = isMine ? 34 : matched ? 32 : 22;

      // Light-green blinking glow ring for matches
      if (matched) {
        const glow = new gmaps.Circle({
          map, center: pos,
          radius: 700,
          fillColor: "#10b981", fillOpacity: 0.10,
          strokeColor: "#10b981", strokeOpacity: 0.25, strokeWeight: 1.5,
          clickable: false, zIndex: 1,
        });
        overlaysRef.current.push(glow);
        // Blink via opacity (lighter/transparent feel rather than radius growth)
        let t2 = 0;
        const interval = setInterval(() => {
          t2 += 0.12;
          const wave = (Math.sin(t2) + 1) / 2; // 0..1
          glow.setOptions({
            fillOpacity: 0.05 + wave * 0.15,
            strokeOpacity: 0.15 + wave * 0.25,
          });
        }, 60);
        glow.__interval = interval;
      }

      // Blue range circle for own listing(s)
      if (isMine) {
        const circle = new gmaps.Circle({
          map, center: pos,
          radius: 3000,
          fillColor: "#3b82f6", fillOpacity: 0.06,
          strokeColor: "#3b82f6", strokeOpacity: 0.25, strokeWeight: 1.5,
          clickable: false, zIndex: 0,
        });
        overlaysRef.current.push(circle);
      }

      const iconUrl = isMine
        ? buildFlagIconUrl(haveArr[0], size, "#3b82f6", 3)
        : matched
          ? buildFlagIconUrl(haveArr[0], size, "#10b981", 3)
          : buildFlagIconUrl(haveArr[0], size, "#fff", 2);

      const marker = new gmaps.Marker({
        position: pos, map,
        title: l.nickname,
        icon: { url: iconUrl, scaledSize: new gmaps.Size(size, size), anchor: new gmaps.Point(size / 2, size / 2) },
        zIndex: isMine ? 100 : matched ? 50 : 1,
        label: isMine ? { text: "Me", color: "#fff", fontSize: "8px", fontWeight: "700", className: "gmap-me-label" } : undefined,
      });
      marker.addListener("click", () => onSelect(l));
      markersRef.current.push(marker);
    });

    return () => {
      overlaysRef.current.forEach(c => {
        if (c.__interval) clearInterval(c.__interval);
      });
    };
  }, [gmaps, listings, myListings, onSelect]);

  if (!GMAP_KEY || mapError || !gmaps) {
    return (
      <div>
        <FallbackMapView listings={listings} onSelect={onSelect} myListings={myListings} isWide={isWide} />
        {mapError && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 6 }}>⚠️ {t?.mapsError}</div>}
      </div>
    );
  }

  return (
    <div ref={mapRef} style={{
      width: "100%", height: isWide ? "clamp(360px, 48vh, 560px)" : 300, borderRadius: 16,
      overflow: "hidden", border: "1px solid #e0e0d8", background: "#e9f2e9",
    }} />
  );
}

// ── Fallback map (no API key) ──
function FallbackMapView({ listings, onSelect, myListings = [], isWide = false }) {
  const B = { minLat: 43.55, maxLat: 43.92, minLng: -79.75, maxLng: -79.15 };
  const toX = lng => Math.min(100, Math.max(0, ((lng - B.minLng) / (B.maxLng - B.minLng)) * 100));
  const toY = lat => Math.min(100, Math.max(0, (1 - (lat - B.minLat) / (B.maxLat - B.minLat)) * 100));
  const areas = [
    { n: "Downtown", x: 55, y: 68 }, { n: "Markham", x: 72, y: 28 },
    { n: "Scarborough", x: 82, y: 48 }, { n: "North York", x: 48, y: 40 },
    { n: "Mississauga", x: 18, y: 58 }, { n: "Richmond Hill", x: 58, y: 22 },
  ];

  const myIds = new Set(myListings.map(l => l.id));
  const allListings = myListings.length
    ? [...myListings, ...listings.filter(l => !myIds.has(l.id))]
    : listings;

  return (
    <div style={{
      position: "relative", width: "100%", height: isWide ? "clamp(360px, 48vh, 560px)" : "auto", paddingBottom: isWide ? 0 : "72%",
      background: "linear-gradient(145deg,#e9f2e9,#d6e6d6 50%,#ccdccc)",
      borderRadius: 16, overflow: "hidden", border: "1px solid #e0e0d8",
    }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "16%", background: "linear-gradient(to bottom,rgba(100,160,210,.1),rgba(100,160,210,.25))" }} />
      <span style={{ position: "absolute", bottom: "4%", right: "6%", fontSize: 10, color: "rgba(60,100,140,.35)", fontWeight: 500 }}>Lake Ontario</span>
      {areas.map(a => <span key={a.n} style={{ position: "absolute", left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%,-50%)", fontSize: 9, color: "rgba(0,0,0,.18)", fontWeight: 500, pointerEvents: "none" }}>{a.n}</span>)}
      {allListings.map(l => {
        const isMine = myIds.has(l.id);
        const matched = !isMine && isMatchAny(myListings, l);
        const haveArr = toArr(l.have);
        const x = toX(l.lng), y = toY(l.lat);
        return (
          <div key={l.id}>
            {matched && (
              <div className="match-glow" style={{
                position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
                width: 50, height: 50, borderRadius: "50%",
                background: "rgba(16,185,129,.15)", border: "2px solid rgba(16,185,129,.3)",
                pointerEvents: "none", zIndex: 0,
              }} />
            )}
            {isMine && (
              <div style={{
                position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
                width: 60, height: 60, borderRadius: "50%",
                background: "rgba(59,130,246,.08)", border: "1.5px solid rgba(59,130,246,.2)",
                pointerEvents: "none", zIndex: 0,
              }} />
            )}
            <button onClick={() => onSelect(l)} aria-label={l.nickname} style={{
              position: "absolute", left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)",
              width: isMine ? 36 : matched ? 34 : 26, height: isMine ? 36 : matched ? 34 : 26,
              borderRadius: "50%",
              background: isMine ? "#3b82f6" : "#fff",
              border: isMine ? "3px solid #1d4ed8" : matched ? "3px solid #10b981" : "2px solid #fff",
              boxShadow: matched ? "0 0 12px rgba(16,185,129,.5), 0 0 24px rgba(16,185,129,.2)" : "0 1px 4px rgba(0,0,0,.25)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              animation: matched ? "matchPulse 2s infinite" : "none",
              zIndex: isMine ? 20 : matched ? 10 : 1, padding: 0, overflow: "hidden",
            }}>
              {isMine ? <span style={{ fontSize: 9, color: "#fff", fontWeight: 700 }}>Me</span>
                : <FlagCircle id={haveArr[0]} size={matched ? 26 : 22} />}
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes matchPulse {
          0%, 100% { box-shadow: 0 0 12px rgba(16,185,129,.5), 0 0 24px rgba(16,185,129,.2); }
          50% { box-shadow: 0 0 20px rgba(16,185,129,.7), 0 0 40px rgba(16,185,129,.3); }
        }
        @keyframes glowPulse {
          0%, 100% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          50% { transform: translate(-50%,-50%) scale(1.3); opacity: 0.5; }
        }
        .match-glow { animation: glowPulse 2s infinite ease-in-out; }
      `}</style>
    </div>
  );
}

// ── Address Autocomplete ──
function AddressInput({ value, onChange, onPlaceSelect, placeholder, style: inputStyle, t }) {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!GMAP_KEY || acRef.current) return;
    loadGoogleMaps().then(gmaps => {
      if (!inputRef.current) return;
      const ac = new gmaps.places.Autocomplete(inputRef.current, {
        fields: ["address_components", "formatted_address", "geometry"],
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
            ...inferPlaceLocation(place),
          });
        }
      });
      acRef.current = ac;
    }).catch(() => setError(true));
  }, []);

  return (
    <div>
      <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>⚠️ {t?.mapsError}</div>}
    </div>
  );
}

// ── Listing Card ──
function ListingCard({ listing: l, myListings = [], onMessage, expanded, onToggle, lang, t }) {
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

// ── Chat list row with a persistent, light delete button on the right ──
function DeletableRow({ children, onDelete, deleteLabel }) {
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

// ── Chat View (conversation list) ──
const latestListingForOwner = (listings, ownerToken) => {
  const mine = listings.filter(l => l.owner_token === ownerToken);
  return mine.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
};

function ChatView({ ownerToken, allListings, t, onOpenChat, onViewListing, groupConversations = [], onOpenGroupChat }) {
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

// ── Chat Thread (single conversation) ──
function ChatThread({ ownerToken, otherToken, otherName, otherListing, onBack, onViewListing, t }) {
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

// ── Summary card for one candidate 3-person swap ring (Browse/Map tab, "多人交换") ──
function GroupRingCard({ chain, ownerToken, lang, t, creating, exists, onAction }) {
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

// ── Group Chat Thread (3-person swap ring) ──
function GroupChatThread({ ownerToken, conversationId, members, onBack, t }) {
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
            {t.subtitle} · {activeListings.length} {t.active}
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
                    if (country === "CN") { alert(t.chinaNotSupported); return; }
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
