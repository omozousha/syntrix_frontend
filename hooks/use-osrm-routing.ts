import { useState, useCallback } from "react";
import { fetchRoadRoute, OsgmRouteResult } from "@/lib/api";

export type RoutingNode = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  type: "gps" | "device" | "pop";
};

export function useOsrmRouting(token: string) {
  const [origin, setOrigin] = useState<RoutingNode | null>(null);
  const [destination, setDestination] = useState<RoutingNode | null>(null);
  const [route, setRoute] = useState<OsgmRouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gpsLoading, setGpsLoading] = useState(false);

  // Request browser geolocation to set as origin
  const setOriginFromGps = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setError("Browser Anda tidak mendukung Geolocation GPS.");
      return;
    }

    setGpsLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          id: "gps-current",
          name: "Lokasi GPS Saya",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          type: "gps",
        });
        setGpsLoading(false);
      },
      (geoError) => {
        let msg = "Gagal mendeteksi lokasi GPS.";
        if (geoError.code === geoError.PERMISSION_DENIED) {
          msg = "Izin akses lokasi ditolak oleh pengguna.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          msg = "Posisi GPS tidak tersedia saat ini.";
        } else if (geoError.code === geoError.TIMEOUT) {
          msg = "Waktu tunggu deteksi lokasi GPS habis.";
        }
        setError(msg);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  const calculateRoute = useCallback(async () => {
    if (!origin || !destination) {
      setError("Origin dan Destination harus ditentukan terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError(null);
    setRoute(null);

    try {
      const originStr = `${origin.longitude},${origin.latitude}`;
      const destStr = `${destination.longitude},${destination.latitude}`;

      const response = await fetchRoadRoute(originStr, destStr, token);
      if (response.success && response.data) {
        setRoute(response.data);
      } else {
        throw new Error("Gagal mengambil data rute.");
      }
    } catch (err) {
      setError((err as Error).message || "Gagal menghitung rute navigasi.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, token]);

  const clearRoute = useCallback(() => {
    setRoute(null);
    setError(null);
    setOrigin(null);
    setDestination(null);
  }, []);

  return {
    origin,
    setOrigin,
    destination,
    setDestination,
    route,
    loading,
    error,
    gpsLoading,
    setOriginFromGps,
    calculateRoute,
    clearRoute,
  };
}
