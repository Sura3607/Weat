'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/shared/api/client';

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  accuracyM: number | null;
  isTracking: boolean;
  error: string | null;
}

const CHECK_IN_INTERVAL_MS = 30 * 1000; // 30 seconds

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    accuracyM: null,
    isTracking: false,
    error: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const latestPositionRef = useRef<{ lat: number; lng: number; accuracyM: number } | null>(null);

  const checkIn = useCallback(async (lat: number, lng: number, accuracyM: number) => {
    try {
      await api.post('/pwa-check-in', { lat, lng, accuracyM });
    } catch {
      // Silent fail - check-in is best-effort
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({ ...prev, error: 'Geolocation không được hỗ trợ' }));
      return;
    }

    setState((prev) => ({ ...prev, isTracking: true, error: null }));

    // Watch position
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        latestPositionRef.current = { lat: latitude, lng: longitude, accuracyM: accuracy };

        setState((prev) => ({
          ...prev,
          lat: latitude,
          lng: longitude,
          accuracyM: accuracy,
          error: null,
        }));

        // Immediate check-in on first position
        checkIn(latitude, longitude, accuracy);
      },
      (err) => {
        setState((prev) => ({
          ...prev,
          error: err.code === 1 ? 'Vui lòng cấp quyền vị trí' : 'Không thể lấy vị trí',
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      },
    );

    // Periodic check-in
    intervalRef.current = setInterval(() => {
      const pos = latestPositionRef.current;
      if (pos) {
        checkIn(pos.lat, pos.lng, pos.accuracyM);
      }
    }, CHECK_IN_INTERVAL_MS);
  }, [checkIn]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState((prev) => ({ ...prev, isTracking: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
}
