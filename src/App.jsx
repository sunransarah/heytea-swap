import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./lib/supabase.js";

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
//  CITIES
// ════════════════════════════════════════════════════════════

const CITIES = [
  { id:"toronto",    name:"Toronto",           country:"🇨🇦", lat:43.6532, lng:-79.3832, zoom:12 },
  { id:"markham",    name:"Markham",            country:"🇨🇦", lat:43.8561, lng:-79.3370, zoom:13 },
  { id:"scarborough",name:"Scarborough",        country:"🇨🇦", lat:43.7731, lng:-79.2577, zoom:13 },
  { id:"richmond",   name:"Richmond",           country:"🇨🇦", lat:49.1666, lng:-123.1336,zoom:13 },
  { id:"burnaby",    name:"Burnaby",            country:"🇨🇦", lat:49.2488, lng:-122.9805,zoom:13 },
  { id:"nyc",        name:"New York City",      country:"🇺🇸", lat:40.7128, lng:-74.0060, zoom:12 },
  { id:"brooklyn",   name:"Brooklyn",           country:"🇺🇸", lat:40.6782, lng:-73.9442, zoom:13 },
  { id:"flushing",   name:"Flushing",           country:"🇺🇸", lat:40.7654, lng:-73.8318, zoom:14 },
  { id:"lic",        name:"Long Island City",   country:"🇺🇸", lat:40.7447, lng:-73.9485, zoom:14 },
  { id:"la",         name:"Los Angeles",        country:"🇺🇸", lat:34.0522, lng:-118.2437,zoom:11 },
  { id:"beverly",    name:"Beverly Hills",      country:"🇺🇸", lat:34.0736, lng:-118.4004,zoom:14 },
  { id:"irvine",     name:"Irvine",             country:"🇺🇸", lat:33.6846, lng:-117.8265,zoom:13 },
  { id:"rowland",    name:"Rowland Heights",    country:"🇺🇸", lat:33.9761, lng:-117.9053,zoom:14 },
  { id:"sanjose",    name:"San Jose",           country:"🇺🇸", lat:37.3382, lng:-121.8863,zoom:12 },
  { id:"milpitas",   name:"Milpitas",           country:"🇺🇸", lat:37.4323, lng:-121.8996,zoom:14 },
  { id:"berkeley",   name:"Berkeley",           country:"🇺🇸", lat:37.8716, lng:-122.2727,zoom:14 },
  { id:"seattle",    name:"Seattle",            country:"🇺🇸", lat:47.6062, lng:-122.3321,zoom:12 },
  { id:"houston",    name:"Houston",            country:"🇺🇸", lat:29.7604, lng:-95.3698, zoom:12 },
  { id:"boston",      name:"Boston",             country:"🇺🇸", lat:42.3601, lng:-71.0589, zoom:13 },
  { id:"tysons",     name:"Tysons (DC Metro)",  country:"🇺🇸", lat:38.9187, lng:-77.2311, zoom:14 },
  { id:"jerseycity", name:"Jersey City",        country:"🇺🇸", lat:40.7178, lng:-74.0431, zoom:13 },
];

// ════════════════════════════════════════════════════════════
//  TRANSLATIONS
// ════════════════════════════════════════════════════════════

const T = {
  cn: {
    title:"⚽ 喜茶世界杯换贴", subtitle:"北美",
    active:"条活跃", matches:"个匹配", online:"已上线",
    map:"地图", browse:"浏览", post:"发布", mine:"我的", msgs:"消息",
    all:"全部", swappable:"可互换",
    available:"可换国家",
    optional:"选填",
    postTitle:"发布换贴信息",
    nickname:"昵称", nickPh:"怎么称呼你",
    country:"国家",
    city:"所在城市", cityPh:"输入或搜索城市",
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
    selectCity:"选择城市",
    allCities:"全部城市",
    areas:"地区",
    edit:"编辑", save:"保存修改", cancel:"取消",
    myListings:"我的发布", addAnother:"➕ 发布新的一条",
    editTitle:"编辑换贴信息",
    distance:"距离", anyDistance:"不限距离",
    within:"内", useMyLocation:"使用我的定位",
    locatingMe:"定位中...", locationDenied:"未授权定位，已使用你发布的地址作为参考位置",
    noLocationRef:"筛选距离需要先定位，或先发布一条信息",
    mapsError:"Google 地图加载失败，请检查 API Key 设置（启用计费、启用 Maps JavaScript API + Places API、检查域名白名单）",
  },
  en: {
    title:"⚽ Heytea WC Swap", subtitle:"North America",
    active:"active", matches:"matches", online:"Online",
    map:"Map", browse:"Browse", post:"Post", mine:"Mine", msgs:"Chat",
    all:"All", swappable:"Swappable",
    available:"Available",
    optional:"optional",
    postTitle:"Post your magnet",
    nickname:"Nickname", nickPh:"What should we call you?",
    country:"Country",
    city:"City", cityPh:"Type or search city",
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
    selectCity:"Select city",
    allCities:"All cities",
    areas:"Areas",
    edit:"Edit", save:"Save changes", cancel:"Cancel",
    myListings:"My listings", addAnother:"➕ Post another one",
    editTitle:"Edit your listing",
    distance:"Distance", anyDistance:"Any distance",
    within:"within", useMyLocation:"Use my location",
    locatingMe:"Locating...", locationDenied:"Location not granted — using your listing's address as reference",
    noLocationRef:"Filtering by distance needs your location, or post a listing first",
    mapsError:"Google Maps failed to load — check API key setup (billing enabled, Maps JavaScript API + Places API enabled, domain allow-list)",
  }
};

// ════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════

const mName = (id, lang) => MAGNETS.find(x => x.id === id)?.[lang] || id;
const mFind = (id) => MAGNETS.find(x => x.id === id);
const mColor = (id) => { const m = mFind(id); if (!m) return "#888"; return m.c1 === "#FFF" ? m.c2 : m.c1; };

// Normalize have field: always return an array
const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);
const EXPIRY_OPTIONS = [1, 3, 7];
const countryFromCityId = (cityId) => CITIES.find(c => c.id === cityId)?.country === "🇺🇸" ? "us" : "ca";
const countryLabel = (code) => code === "us" ? "USA" : "Canada";
const inferPlaceLocation = (place) => {
  const parts = place?.address_components || [];
  const byType = (...types) => parts.find(p => types.some(type => p.types?.includes(type)));
  const countryShort = byType("country")?.short_name?.toLowerCase();
  const country = countryShort === "us" ? "us" : countryShort === "ca" ? "ca" : "";
  const cityName = byType("locality", "postal_town", "sublocality", "sublocality_level_1", "administrative_area_level_3")?.long_name || "";
  return { country, city: cityName };
};
const nearestCityByCoords = (lat, lng) => {
  if (lat == null || lng == null) return null;
  return CITIES.reduce((best, city) => {
    const d = distanceKm(lat, lng, city.lat, city.lng);
    return !best || d < best.distance ? { city, distance: d } : best;
  }, null)?.city || null;
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
function distanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  } else if (id === "jpn") {
    flagSvg = `<circle cx="${r}" cy="${r}" r="${inner}" fill="#FFF"/>
      <circle cx="${r}" cy="${r}" r="${inner * 0.5}" fill="#BC002D"/>`;
  } else if (id === "sui") {
    flagSvg = `<circle cx="${r}" cy="${r}" r="${inner}" fill="#F00"/>
      <rect x="${r - inner * 0.45}" y="${r - inner * 0.12}" width="${inner * 0.9}" height="${inner * 0.24}" rx="1" fill="#FFF"/>
      <rect x="${r - inner * 0.12}" y="${r - inner * 0.45}" width="${inner * 0.24}" height="${inner * 0.9}" rx="1" fill="#FFF"/>`;
  } else if (id === "eng") {
    flagSvg = `<clipPath id="clip-${id}"><circle cx="${r}" cy="${r}" r="${inner}"/></clipPath>
      <g clip-path="url(#clip-${id})">
        <rect x="0" y="0" width="${size}" height="${size}" fill="#FFF"/>
        <rect x="${r - inner * 0.12}" y="0" width="${inner * 0.24}" height="${size}" fill="#CF081F"/>
        <rect x="0" y="${r - inner * 0.12}" width="${size}" height="${inner * 0.24}" fill="#CF081F"/>
      </g>`;
  } else {
    flagSvg = `<clipPath id="clip-${id}"><circle cx="${r}" cy="${r}" r="${inner}"/></clipPath>
      <g clip-path="url(#clip-${id})">
        <rect x="0" y="0" width="${size}" height="${size / 3}" fill="${m.c1}"/>
        <rect x="0" y="${size / 3}" width="${size}" height="${size / 3}" fill="${m.c2}"/>
        <rect x="0" y="${size * 2 / 3}" width="${size}" height="${size / 3}" fill="${m.c3}"/>
      </g>`;
  }
  const ring = ringColor ? `<circle cx="${r}" cy="${r}" r="${r - ringWidth / 2}" fill="none" stroke="${ringColor}" stroke-width="${ringWidth}"/>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${flagSvg}${ring}</svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

function getOwnerToken() {
  let t = localStorage.getItem("heytea-owner");
  if (!t) { t = crypto.randomUUID(); localStorage.setItem("heytea-owner", t); }
  return t;
}

function getConversationId(a, b) { return [a, b].sort().join("_"); }

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
  return String(EXPIRY_OPTIONS.find(days => daysLeft <= days) || 7);
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

// ── Swap time input: date + time picker, adds chips ──
function CitySelector({ value, onChange, t }) {
  const ca = CITIES.filter(c => c.country === "🇨🇦");
  const us = CITIES.filter(c => c.country === "🇺🇸");
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "8px 12px", borderRadius: 10, fontSize: 13, fontWeight: 500,
        border: "1.5px solid #ddd", background: "#fff", color: "#333",
        outline: "none", cursor: "pointer", minWidth: 140,
      }}
    >
      <option value="">{t.allCities}</option>
      <optgroup label="🇨🇦 Canada">
        {ca.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </optgroup>
      <optgroup label="🇺🇸 USA">
        {us.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </optgroup>
    </select>
  );
}

// ── Google Map View (interactive, zoomable) ──
function CityInput({ value, country, onChange, onCitySelect, placeholder, style: inputStyle, t }) {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!GMAP_KEY) return;
    if (acRef.current) {
      acRef.current.setComponentRestrictions({ country: country || ["ca", "us"] });
      return;
    }
    loadGoogleMaps().then(gmaps => {
      if (!inputRef.current) return;
      const ac = new gmaps.places.Autocomplete(inputRef.current, {
        types: ["(cities)"],
        componentRestrictions: { country: country || ["ca", "us"] },
        fields: ["formatted_address", "geometry", "name"],
      });
      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const cityName = place.name || place.formatted_address || value;
        onChange(cityName);
        if (place?.geometry?.location) {
          onCitySelect?.({
            city: cityName,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          });
        }
      });
      acRef.current = ac;
    }).catch(() => setError(true));
  }, [country]);

  return (
    <div>
      <input ref={inputRef} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      {error && <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>âš ï¸ {t?.mapsError}</div>}
    </div>
  );
}

function GoogleMapView({ listings, onSelect, myListings = [], selectedCity, t, isWide = false }) {
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
      const initCity = CITIES.find(c => c.id === selectedCity) || CITIES[0];
      mapInstanceRef.current = new gmaps.Map(mapRef.current, {
        center: { lat: initCity.lat, lng: initCity.lng },
        zoom: initCity.zoom,
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

  // Pan to selected city
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedCity) return;
    const city = CITIES.find(c => c.id === selectedCity);
    if (city) {
      mapInstanceRef.current.panTo({ lat: city.lat, lng: city.lng });
      mapInstanceRef.current.setZoom(city.zoom);
    }
  }, [selectedCity]);

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
function AddressInput({ value, country, onChange, onPlaceSelect, placeholder, style: inputStyle, t }) {
  const inputRef = useRef(null);
  const acRef = useRef(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!GMAP_KEY) return;
    if (acRef.current) {
      acRef.current.setComponentRestrictions({ country: country || ["ca", "us"] });
      return;
    }
    loadGoogleMaps().then(gmaps => {
      if (!inputRef.current) return;
      const ac = new gmaps.places.Autocomplete(inputRef.current, {
        types: ["address"],
        componentRestrictions: { country: country || ["ca", "us"] },
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
  }, [country]);

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
          fontSize: 16, fontWeight: 600, color: isMine ? "#3b82f6" : firstColor, flexShrink: 0,
          boxShadow: matched ? "0 0 10px rgba(16,185,129,.4)" : "none",
        }}>{l.nickname?.[0]}</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nickname}</span>
            {isMine && <span style={{ fontSize: 10, color: "#3b82f6", fontWeight: 600, background: "rgba(59,130,246,.1)", padding: "2px 8px", borderRadius: 10 }}>{t.me}</span>}
            {matched && <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600, background: "rgba(16,185,129,.1)", padding: "2px 8px", borderRadius: 10 }}>{t.matchLabel}</span>}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {l.country && <span>{countryLabel(l.country)} · </span>}
            {l.city && <span>{CITIES.find(c => c.id === l.city)?.name || l.city} · </span>}
            {l.address} · {timeAgo(l.created_at, t)}
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
      {/* Distance from reference point (browse tab) */}
      {typeof l.__distanceKm === "number" && (
        <div style={{ fontSize: 10, color: "#999", marginTop: 6 }}>📏 {l.__distanceKm.toFixed(1)} km</div>
      )}
      {/* Expanded actions */}
      {expanded && !isMine && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee" }}>
          {matched && (
            <div style={{ fontSize: 12, color: "#10b981", fontWeight: 500, marginBottom: 8 }}>
              {t.matchDesc}
            </div>
          )}
          {!matched && <div style={{ fontSize: 12, color: "#888", marginBottom: 8 }}>{myListings.length ? t.noMatchYet : t.postFirst}</div>}
          {myListings.length > 0 && (
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

// ── Chat View (conversation list) ──
function ChatView({ ownerToken, allListings, t, onOpenChat }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (conversations.length === 0) return (
    <div style={{ textAlign: "center", padding: 50, color: "#aaa" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>💬</div>
      <div style={{ fontSize: 14, fontWeight: 500, color: "#888" }}>{t.noChats}</div>
      <div style={{ fontSize: 12, marginTop: 4 }}>{t.noChatsDesc}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {conversations.map(conv => {
        const other = allListings.find(l => l.owner_token === conv.otherToken);
        const name = other?.nickname || "User";
        const haveArr = other ? toArr(other.have) : [];
        const c = haveArr.length ? mColor(haveArr[0]) : "#888";
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

// ── Chat Thread (single conversation) ──
function ChatThread({ ownerToken, otherToken, otherName, onBack, t }) {
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
        <span style={{ fontWeight: 600, fontSize: 15 }}>{otherName}</span>
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
  const [selectedCity, setSelectedCity] = useState(() => localStorage.getItem("heytea-city") || "toronto");

  // Chat state
  const [chatTarget, setChatTarget] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Editing state — which of my listings (if any) is currently being edited. "new" = creating a fresh one.
  const [editingId, setEditingId] = useState(null);

  // Distance filter state (Discover tab)
  const [distanceKmFilter, setDistanceKmFilter] = useState(""); // "" = no filter
  const [myCoords, setMyCoords] = useState(null); // { lat, lng, source: "gps" | "listing" }
  const [locating, setLocating] = useState(false);

  // Form state
  const [fn, setFn] = useState("");
  const [fCountry, setFCountry] = useState("ca");
  const [fCity, setFCity] = useState("");
  const [fAddr, setFAddr] = useState("");
  const [fLat, setFLat] = useState(null);
  const [fLng, setFLng] = useState(null);
  const [fHave, setFHave] = useState([]);
  const [fWant, setFWant] = useState([]);
  const [fAreas, setFAreas] = useState([]);
  const [fExpireDays, setFExpireDays] = useState("3");
  const [posting, setPosting] = useState(false);

  const ownerToken = useMemo(() => getOwnerToken(), []);

  const deleteExpiredListings = useCallback(async () => {
    try {
      await supabase.from("listings").delete().lte("expires_at", new Date().toISOString());
    } catch (e) {
      console.error(e);
    }
  }, []);

  const resetForm = () => {
    const defaultCountry = countryFromCityId(selectedCity);
    setFn(""); setFCountry(defaultCountry); setFCity(""); setFAddr(""); setFLat(null); setFLng(null);
    setFHave([]); setFWant([]); setFAreas([]); setFExpireDays("3");
  };

  // ── Load listings ──
  useEffect(() => {
    async function load() {
      try {
        await deleteExpiredListings();
        const { data } = await supabase
          .from("listings")
          .select("*")
          .eq("active", true)
          .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
          .order("created_at", { ascending: false });
        if (data) setListings(data.filter(l => !isExpiredListing(l)));
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();

    const cleanupTimer = window.setInterval(() => {
      deleteExpiredListings();
      setListings(prev => prev.filter(l => !isExpiredListing(l)));
    }, 60000);

    const ch = supabase.channel("listings-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, (payload) => {
        if (payload.eventType === "INSERT") {
          if (payload.new.active !== false && !isExpiredListing(payload.new)) {
            setListings(prev => [payload.new, ...prev.filter(l => l.id !== payload.new.id)]);
          }
        } else if (payload.eventType === "UPDATE") {
          if (!payload.new.active || isExpiredListing(payload.new)) {
            setListings(prev => prev.filter(l => l.id !== payload.new.id));
          } else {
            setListings(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
          }
        } else if (payload.eventType === "DELETE") {
          setListings(prev => prev.filter(l => l.id !== payload.old.id));
        }
      })
      .subscribe();
    return () => { window.clearInterval(cleanupTimer); supabase.removeChannel(ch); };
  }, [deleteExpiredListings]);

  // ── Unread count ──
  useEffect(() => {
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

  useEffect(() => { localStorage.setItem("heytea-lang", lang); }, [lang]);
  useEffect(() => { localStorage.setItem("heytea-city", selectedCity); }, [selectedCity]);

  const activeListings = useMemo(() => listings.filter(l => l.active !== false && !isExpiredListing(l)), [listings]);

  // All of my own active listings
  const myListings = useMemo(() => activeListings.filter(l => l.owner_token === ownerToken), [activeListings, ownerToken]);

  // ── Geolocation for distance filter ──
  const requestMyLocation = useCallback(() => {
    if (!navigator.geolocation) { fallbackToListingCoords(); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps" }); setLocating(false); },
      () => { fallbackToListingCoords(); setLocating(false); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
    function fallbackToListingCoords() {
      const ref = myListings.find(l => l.lat && l.lng);
      if (ref) setMyCoords({ lat: ref.lat, lng: ref.lng, source: "listing" });
      else setMyCoords(null);
    }
  }, [myListings]);

  const filtered = useMemo(() => {
    let res = activeListings.filter(l => l.owner_token !== ownerToken);
    if (filterMagnet && filterMagnet !== "__match__") {
      res = res.filter(l => toArr(l.have).includes(filterMagnet));
    }
    if (filterMagnet === "__match__") {
      res = res.filter(l => isMatchAny(myListings, l));
    }
    if (distanceKmFilter && myCoords) {
      const maxKm = Number(distanceKmFilter);
      res = res
        .map(l => ({ ...l, __distanceKm: distanceKm(myCoords.lat, myCoords.lng, l.lat, l.lng) }))
        .filter(l => l.__distanceKm != null && l.__distanceKm <= maxKm)
        .sort((a, b) => a.__distanceKm - b.__distanceKm);
    }
    return res;
  }, [activeListings, filterMagnet, myListings, ownerToken, distanceKmFilter, myCoords]);

  const availableMagnets = useMemo(() => {
    const counts = new Map();
    activeListings
      .filter(l => l.owner_token !== ownerToken)
      .forEach(l => {
        toArr(l.have).forEach(id => counts.set(id, (counts.get(id) || 0) + 1));
      });
    return MAGNETS
      .map(m => ({ ...m, count: counts.get(m.id) || 0 }))
      .filter(m => m.count > 0);
  }, [activeListings, ownerToken]);

  const matchCount = useMemo(() => {
    if (!myListings.length) return 0;
    return activeListings.filter(l => l.owner_token !== ownerToken && isMatchAny(myListings, l)).length;
  }, [activeListings, myListings, ownerToken]);

  // ── Post a new listing, or save edits to an existing one ──
  const handlePost = useCallback(async () => {
    if (!fn || !fAddr || fHave.length === 0 || fWant.length === 0 || !fExpireDays || posting) return;
    setPosting(true);
    try {
      const expiresAt = expiresAtFromDays(fExpireDays);
      if (!expiresAt) throw new Error("Please choose an expiration date.");
      const selectedFallback = CITIES.find(c => c.id === selectedCity);
      const city = CITIES.find(c => (c.id === fCity || c.name === fCity) && (!fCountry || countryFromCityId(c.id) === fCountry))
        || nearestCityByCoords(fLat, fLng)
        || selectedFallback;
      const lat = fLat ?? (city ? city.lat + (Math.random() - .5) * .04 : 43.65);
      const lng = fLng ?? (city ? city.lng + (Math.random() - .5) * .06 : -79.38);
      const country = fCountry || (city ? countryFromCityId(city.id) : "ca");
      const cityValue = fCity || city?.name || "";
      const payload = {
        nickname: fn, address: fAddr,
        country, city: cityValue, have: fHave, want: fWant, swap_areas: fAreas,
        wechat: "", phone: "", whatsapp: "", instagram: "",
        expires_at: expiresAt,
        lat, lng,
      };
      if (editingId && editingId !== "new") {
        const { data, error } = await supabase.from("listings").update(payload).eq("id", editingId).eq("owner_token", ownerToken).select().single();
        if (error) throw error;
        setListings(prev => data.active === false ? prev.filter(l => l.id !== data.id) : prev.map(l => l.id === data.id ? data : l));
      } else {
        const { data, error } = await supabase.from("listings").insert({ ...payload, owner_token: ownerToken, radius: 5 }).select().single();
        if (error) throw error;
        if (data.active !== false) setListings(prev => [data, ...prev]);
      }
      setEditingId(null);
      resetForm();
      setTab("map");
      if (city) setSelectedCity(city.id);
    } catch (e) {
      console.error(e);
      alert(`Failed to save: ${e?.message || "Please try again."}`);
    }
    setPosting(false);
  }, [fn, fCountry, fCity, fAddr, fLat, fLng, fHave, fWant, fAreas, fExpireDays, posting, ownerToken, editingId, selectedCity]);

  // ── Start editing one of my listings ──
  const startEdit = (listing) => {
    setFn(listing.nickname || "");
    setFCountry(listing.country || countryFromCityId(listing.city));
    setFCity(CITIES.find(c => c.id === listing.city)?.name || listing.city || "");
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
    try {
      await supabase.from("listings").delete().eq("id", listing.id).eq("owner_token", ownerToken);
      setListings(prev => prev.filter(l => l.id !== listing.id));
      if (editingId === listing.id) { setEditingId(null); resetForm(); }
    } catch (e) { console.error(e); }
  };

  const openChat = (listing) => {
    if (!myListings.length) return;
    setChatTarget({ token: listing.owner_token, name: listing.nickname });
    setTab("msgs");
  };

  const openChatDirect = (token, name) => setChatTarget({ token, name });

  const canPost = fn && fAddr && fHave.length > 0 && fWant.length > 0 && fExpireDays;
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

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontSize: 15, color: "#888" }}>{t.loading}</div>
  );

  return (
    <div style={{ width: "100%", maxWidth: appMaxWidth, margin: "0 auto", height: "100dvh", minHeight: "100vh", maxHeight: "100dvh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <div style={{ padding: `14px ${appPaddingX}px 10px`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: -.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 1 }}>
            {t.subtitle} · {activeListings.length} {t.active}
            {matchCount > 0 && <span style={{ color: "#10b981", fontWeight: 600 }}> · {matchCount} {t.matches}</span>}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {myListings.length > 0 && <span style={{ padding: "3px 10px", borderRadius: 16, fontSize: 11, fontWeight: 500, background: "rgba(16,185,129,.1)", color: "#10b981" }}>{t.online}{myListings.length > 1 ? ` ×${myListings.length}` : ""}</span>}
          <button onClick={() => setLang(lang === "cn" ? "en" : "cn")} style={{ padding: "4px 10px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: "#f0f0ea", border: "1px solid #ddd", color: "#333" }}>
            {lang === "cn" ? "EN" : "中"}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{
        flex: 1, minHeight: 0, overflow: (tab === "msgs" && chatTarget) ? "hidden" : "auto",
        display: "flex", flexDirection: "column",
        padding: (tab === "msgs" && chatTarget) ? `0 ${appPaddingX}px calc(64px + env(safe-area-inset-bottom))` : `0 ${appPaddingX}px ${isWide ? "96px" : "88px"}`,
      }}>

        {/* MAP TAB */}
        {tab === "map" && (
          <div>
            {/* City selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: "#888" }}>📍</span>
              <CitySelector value={selectedCity} onChange={setSelectedCity} t={t} />
            </div>

            <GoogleMapView
              listings={filtered}
              onSelect={l => { setExpandedId(l.id); setTab("browse"); }}
              myListings={myListings}
              selectedCity={selectedCity}
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
              }}>{t.swappable} ({matchCount})</span>}
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

            {myListings.length > 0 && matchCount > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#10b981" }}>{t.swappable} ({matchCount})</div>
                <div style={contentGrid}>
                  {filtered.filter(l => isMatchAny(myListings, l))
                    .map(l => <ListingCard key={l.id} listing={l} myListings={myListings} onMessage={openChat} expanded={expandedId === l.id} onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)} lang={lang} t={t} />)}
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
            </div>

            {availableMagnets.length > 0 && (
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
                {[5, 10, 25, 50, 100].map(km => <option key={km} value={km}>{km} km {t.within}</option>)}
              </select>
              {distanceKmFilter && !myCoords && (
                <button onClick={requestMyLocation} disabled={locating} style={{
                  padding: "5px 10px", borderRadius: 8, border: "none", background: "#3b82f6", color: "#fff",
                  fontWeight: 600, fontSize: 11, cursor: "pointer",
                }}>{locating ? t.locatingMe : t.useMyLocation}</button>
              )}
              {distanceKmFilter && myCoords && (
                <span style={{ fontSize: 10, color: myCoords.source === "gps" ? "#10b981" : "#b5651d" }}>
                  {myCoords.source === "gps" ? "📍 GPS" : `⚠️ ${t.locationDenied}`}
                </span>
              )}
            </div>
            {distanceKmFilter && !myCoords && (
              <div style={{ fontSize: 11, color: "#b5651d", marginBottom: 10 }}>{t.noLocationRef}</div>
            )}

            <div style={contentGrid}>
              {filtered.map(l => <ListingCard key={l.id} listing={l} myListings={myListings} onMessage={openChat} expanded={expandedId === l.id} onToggle={() => setExpandedId(expandedId === l.id ? null : l.id)} lang={lang} t={t} />)}
              {filtered.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}><div style={{ fontSize: 28, marginBottom: 6 }}>🔍</div><div style={{ fontSize: 13 }}>{t.noResults}</div></div>}
            </div>
          </div>
        )}

        {/* POST / MINE TAB */}
        {tab === "post" && (
          <div>
            {editingId ? (
              <div style={formShell}>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>{editingId === "new" ? t.postTitle : t.editTitle}</div>

                <label style={{ ...lbl, marginTop: 0 }}>{t.nickname} <span style={{ color: "#ef4444" }}>*</span></label>
                <input value={fn} onChange={e => setFn(e.target.value)} placeholder={t.nickPh} style={inp} />

                <label style={lbl}>{t.location} <span style={{ color: "#ef4444" }}>*</span></label>
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
                          <button onClick={() => handleOffline(l)} style={{ flex: 1, padding: "9px 0", border: "1.5px solid #ef4444", borderRadius: 10, background: "transparent", color: "#ef4444", fontWeight: 500, fontSize: 13, cursor: "pointer" }}>{t.offline}</button>
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
            <ChatThread ownerToken={ownerToken} otherToken={chatTarget.token} otherName={chatTarget.name} onBack={() => setChatTarget(null)} t={t} />
          ) : (
            <div style={{ paddingBottom: 88, overflow: "auto" }}>
              <ChatView ownerToken={ownerToken} allListings={activeListings} t={t} lang={lang} onOpenChat={openChatDirect} />
            </div>
          )
        )}
      </div>

      {/* ── Bottom Nav ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: appMaxWidth, display: "flex", justifyContent: "space-around", alignItems: "center",
        padding: "6px 0 max(6px,env(safe-area-inset-bottom))", background: "#fff", borderTop: "1px solid #eee", zIndex: 50,
      }}>
        {[
          { id: "map", icon: "📍", label: t.map },
          { id: "browse", icon: "🔍", label: t.browse },
          { id: "msgs", icon: "💬", label: t.msgs, badge: unreadCount },
          { id: "post", icon: myListings.length > 0 ? "👤" : "➕", label: myListings.length > 0 ? t.mine : t.post },
        ].map(x => (
          <button key={x.id} onClick={() => { setTab(x.id); setExpandedId(null); if (x.id !== "msgs") setChatTarget(null); }} style={{
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
