// ════════════════════════════════════════════════════════════
//  WORLD VIEW — default map center/zoom when no location is known yet.
// ════════════════════════════════════════════════════════════

export const WORLD_VIEW = { lat: 20, lng: 10, zoom: 2 };

// Haversine distance in km between two lat/lng points
export const MAP_NEARBY_RADIUS_KM = 25;

export function distanceKm(lat1, lng1, lat2, lng2) {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// General country code -> localized name, via the browser's built-in locale data (no maintenance).
export const countryLabel = (code, lang) => {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([lang === "cn" ? "zh" : "en"], { type: "region" }).of(code.toUpperCase());
  } catch { return code; }
};

export const inferPlaceLocation = (place) => {
  const parts = place?.address_components || [];
  const byType = (...types) => parts.find(p => types.some(type => p.types?.includes(type)));
  const country = byType("country")?.short_name?.toUpperCase() || "";
  const cityName = byType("locality", "postal_town", "sublocality", "sublocality_level_1", "administrative_area_level_3")?.long_name || "";
  return { country, city: cityName };
};

export const publicLocationLabel = (listing, lang) => {
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
