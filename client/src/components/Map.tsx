/**
 * Google Maps Frontend Integration
 * Priority: Direct Google Maps API key (VITE_GOOGLE_MAPS_API_KEY) → Manus Forge proxy
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

// Resolve which API key and script URL to use
function getMapScriptUrl(): string {
  const directKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (directKey) {
    // Direct Google Maps API
    return `https://maps.googleapis.com/maps/api/js?key=${directKey}&v=weekly&libraries=marker,places,geocoding,geometry`;
  }

  // Manus Forge proxy fallback
  const forgeKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
  const forgeUrl = import.meta.env.VITE_FRONTEND_FORGE_API_URL || "https://forge.butterfly-effect.dev";
  if (forgeKey) {
    return `${forgeUrl}/v1/maps/proxy/maps/api/js?key=${forgeKey}&v=weekly&libraries=marker,places,geocoding,geometry`;
  }

  console.error("[Map] No Google Maps API key configured. Set VITE_GOOGLE_MAPS_API_KEY or VITE_FRONTEND_FORGE_API_KEY.");
  return "";
}

let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

function loadMapScript(): Promise<void> {
  if (scriptLoaded && window.google?.maps) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const url = getMapScriptUrl();
    if (!url) {
      reject(new Error("No Google Maps API key configured"));
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter = { lat: 10.762622, lng: 106.660172 }, // Default: Ho Chi Minh City
  initialZoom = 14,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);

  const init = usePersistFn(async () => {
    try {
      await loadMapScript();
    } catch (err) {
      console.error("[Map] Script load failed:", err);
      return;
    }

    if (!mapContainer.current || !window.google?.maps) return;

    map.current = new window.google.maps.Map(mapContainer.current, {
      zoom: initialZoom,
      center: initialCenter,
      mapTypeControl: true,
      fullscreenControl: true,
      zoomControl: true,
      streetViewControl: false,
      mapId: "WEAT_MAP",
    });

    if (onMapReady) {
      onMapReady(map.current);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div ref={mapContainer} className={cn("w-full h-[500px]", className)} />
  );
}
