import { useState, useEffect, useRef } from "react";
import { GMAP_KEY, loadGoogleMaps } from "../lib/googleMaps.js";
import { WORLD_VIEW } from "../utils/geo.js";
import { isMatchAny } from "../utils/matching.js";
import { toArr } from "../utils/format.js";
import { buildFlagIconUrl } from "../utils/mapIcons.js";
import { FallbackMapView } from "./FallbackMapView.jsx";

// ── Google Map View (interactive, zoomable) ──
export function GoogleMapView({ listings, onSelect, myListings = [], centerCoords, t, isWide = false }) {
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
