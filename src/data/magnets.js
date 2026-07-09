// Raw SVG source for each flag, inlined at build time so map-marker icons (rendered as
// data: URI images) don't have to fetch an external file — data: URIs can't reliably
// resolve external resource references, which left the flags transparent on the map.
export const FLAG_SVG_SOURCE = Object.fromEntries(
  Object.entries(import.meta.glob("../assets/flags/*.svg", { eager: true, query: "?raw", import: "default" }))
    .map(([path, raw]) => [path.match(/([^/]+)\.svg$/)[1], raw])
);

// ════════════════════════════════════════════════════════════
//  DATA — 22 magnets (including England + Mystery)
// ════════════════════════════════════════════════════════════

export const MAGNETS = [
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

export const mName = (id, lang) => MAGNETS.find(x => x.id === id)?.[lang] || id;
export const mFind = (id) => MAGNETS.find(x => x.id === id);
export const mColor = (id) => { const m = mFind(id); if (!m) return "#888"; return m.c1 === "#FFF" ? m.c2 : m.c1; };
