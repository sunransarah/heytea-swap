import { useState, useEffect, useRef } from "react";
import { GMAP_KEY, loadGoogleMaps } from "../lib/googleMaps.js";
import { inferPlaceLocation } from "../utils/geo.js";

// ── Address Autocomplete ──
export function AddressInput({ value, onChange, onPlaceSelect, placeholder, style: inputStyle, t }) {
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
