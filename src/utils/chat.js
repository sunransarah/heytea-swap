export function getConversationId(a, b) { return [a, b].sort().join("_"); }

export const latestListingForOwner = (listings, ownerToken) => {
  const mine = listings.filter(l => l.owner_token === ownerToken);
  return mine.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0] || null;
};
