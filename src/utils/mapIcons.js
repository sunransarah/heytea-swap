import { mFind, FLAG_SVG_SOURCE } from "../data/magnets.js";

// Build a flag-circle icon as an SVG data URL, for use as a Google Maps marker icon.
// Mirrors the <FlagCircle> component's rendering, plus an optional colored ring.
export function buildFlagIconUrl(id, size = 32, ringColor = null, ringWidth = 3) {
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
