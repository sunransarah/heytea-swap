export const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || "";

let __gmapsLoadPromise = null;
export function loadGoogleMaps() {
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
export async function reverseGeocodeLabel(lat, lng) {
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
