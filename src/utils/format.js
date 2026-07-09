// Normalize have field: always return an array
export const toArr = (v) => Array.isArray(v) ? v : (v ? [v] : []);

export const EXPIRY_OPTIONS = [3, 7, 15];

// Darkens colors that are too light to read against their own pale tinted background (e.g. gold, light blue).
export const readableBadgeColor = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < 0.6) return hex;
  return `rgb(${Math.round(r * 0.45)}, ${Math.round(g * 0.45)}, ${Math.round(b * 0.45)})`;
};

export const generateNickname = () => `Swapper-${crypto.randomUUID().slice(0, 6)}`;

export const timeAgo = (ts, t) => {
  const d = Date.now() - new Date(ts).getTime();
  if (d < 60000) return t.just;
  if (d < 3600000) return Math.floor(d / 60000) + t.minAgo;
  if (d < 86400000) return Math.floor(d / 3600000) + t.hrAgo;
  return Math.floor(d / 86400000) + t.dayAgo;
};

export const expiresAtFromDays = (days) => {
  const n = Number(days);
  if (!EXPIRY_OPTIONS.includes(n)) return null;
  return new Date(Date.now() + n * 86400000).toISOString();
};

export const isExpiredListing = (listing) => {
  if (!listing?.expires_at) return false;
  return new Date(listing.expires_at).getTime() <= Date.now();
};

export const expiryDaysFromListing = (listing) => {
  if (!listing?.expires_at) return "";
  const daysLeft = Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / 86400000);
  return String(EXPIRY_OPTIONS.find(days => daysLeft <= days) || 15);
};
