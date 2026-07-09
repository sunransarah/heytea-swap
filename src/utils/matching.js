import { toArr } from "./format.js";

export const RING_COLORS = ["#3b82f6", "#a855f7", "#f59e0b", "#ec4899", "#14b8a6", "#ef4444", "#6366f1"];

// Match logic: any of my haves is in their wants, AND any of their haves is in my wants
export function isMatch(myListing, other) {
  if (!myListing || !other || myListing.id === other.id) return false;
  const myHave = toArr(myListing.have);
  const theirHave = toArr(other.have);
  const myWant = myListing.want || [];
  const theirWant = other.want || [];
  return myHave.some(h => theirWant.includes(h)) && theirHave.some(h => myWant.includes(h));
}

// Match against a list of my own listings — true if ANY of them match `other`
export function isMatchAny(myListings, other) {
  if (!myListings || !myListings.length || !other) return false;
  return myListings.some(mine => isMatch(mine, other));
}

// ── Group swap chain matching (3-person rings, shown on the Browse tab) ──

// The specific magnet `a` would hand to `b` (first of a.have that's in b.want), or null.
export function pickSwapItem(a, b) {
  const item = toArr(a.have).find(h => (b.want || []).includes(h));
  return item || null;
}

// Bounded DFS for cycles of length minLen..maxLen that start and end at `seed`. Callers are
// expected to pass in an `allListings` set that's already narrowed to the viewer's chosen
// distance range (e.g. distanceFilteredListings) — this function does no distance checks itself.
export function findSwapChains(seed, allListings, { minLen = 3, maxLen = 3 } = {}) {
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
export function canonicalMatchKey(listingIds) {
  let minIdx = 0;
  for (let i = 1; i < listingIds.length; i++) if (listingIds[i] < listingIds[minIdx]) minIdx = i;
  return [...listingIds.slice(minIdx), ...listingIds.slice(0, minIdx)].join(",");
}

// Sum of the other members' distance from the viewer (each already carries __distanceKm from
// distanceFilteredListings/mapListings) — used to sort rings by "closest to me overall" first.
export function chainTotalDistance(chain, ownerToken) {
  return chain.members.reduce((sum, m) => m.owner_token === ownerToken ? sum : sum + (m.__distanceKm ?? Infinity), 0);
}
