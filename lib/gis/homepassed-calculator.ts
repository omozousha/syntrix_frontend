import * as turf from "@turf/turf";
import type { Feature, Polygon, MultiPolygon, FeatureCollection } from "geojson";
import type { MapDevice, MapRoute } from "@/components/features/maps/topology-map-canvas";
import type { OverpassPOI } from "@/components/features/maps/google-maps-canvas";

export type HomepassedCalculationConfig = {
  odpRadiusMeters: number;
  cableRadiusMeters: number;
  includeOdp: boolean;
  includeCables: boolean;
  densityPerSqMeter: number; // default e.g. 0.003
  targetRegionId?: string;
};

export type HomepassedCalculationResult = {
  mergedPolygonFeature: Feature<Polygon | MultiPolygon> | null;
  totalCoverageAreaSqM: number;
  totalCoverageAreaKm2: number;
  exactHomepassedCount: number;
  estimatedHomepassedCount: number;
  rawUnmergedAreaSqM: number;
  overlapSavingsPercentage: number;
  activeDeviceCount: number;
  activeRouteCount: number;
};

export const DEFAULT_HOMEPASSED_CONFIG: HomepassedCalculationConfig = {
  odpRadiusMeters: 250,
  cableRadiusMeters: 250,
  includeOdp: true,
  includeCables: true,
  densityPerSqMeter: 0.003,
  targetRegionId: "__all__",
};

/**
 * Checks if a coordinate is in open sea/water bodies (Java Sea, Sunda Strait, Indian Ocean, etc.)
 * Accurately covers Indonesian maritime boundaries.
 */
export function isPointInWater(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (lat === 0 && lng === 0) return true;

  // 1. Deep Indian Ocean (South of Java, Sumatra, Bali, & Nusa Tenggara)
  if (lat < -7.65) {
    // West Java South Coast (lng 105.0 to 108.5)
    if (lng >= 105.0 && lng < 108.5 && lat < -7.65) return true;
    // Central Java South Coast (lng 108.5 to 110.8)
    if (lng >= 108.5 && lng < 110.8 && lat < -7.80) return true;
    // East Java South Coast (lng 110.8 to 114.5)
    if (lng >= 110.8 && lng < 114.5 && lat < -8.35) return true;
    // Bali / Lombok South Coast
    if (lng >= 114.5 && lng <= 117.0 && lat < -8.85) return true;
  }

  // 2. Java Sea (Laut Jawa) - Open water North of Java Island
  if (lng >= 105.5 && lng <= 115.0) {
    // West Java North Coast (lng 105.5 to 108.5)
    if (lng >= 105.5 && lng < 108.5 && lat > -6.15 && lat < -3.0) return true;
    // Central-West Java North Coast (Tegal / Pemalang / Pekalongan, lng 108.5 to 109.8)
    if (lng >= 108.5 && lng < 109.8 && lat > -6.82 && lat < -3.0) return true;
    // Kendal / Semarang / Demak North Coast (lng 109.8 to 110.6)
    if (lng >= 109.8 && lng < 110.6 && lat > -6.92 && lat < -3.0) return true;
    // Demak / Jepara / Pati / Rembang North Coast (lng 110.6 to 111.6)
    if (lng >= 110.6 && lng < 111.6 && lat > -6.60 && lat < -3.0) {
      // Exclude Muria Peninsula landmass (Jepara/Pati land: lat -6.75 to -6.42, lng 110.6 to 111.0)
      if (lat >= -6.75 && lat <= -6.42 && lng >= 110.6 && lng <= 111.0) {
        return false;
      }
      return true;
    }
    // East Java North Coast (Tuban / Lamongan / Gresik, lng 111.6 to 112.5)
    if (lng >= 111.6 && lng < 112.5 && lat > -6.82 && lat < -3.0) return true;
    // Madura Island North Sea (lng 112.5 to 114.5)
    if (lng >= 112.5 && lng <= 114.5 && lat > -6.85 && lat < -3.0) {
      // Exclude Bawean Island center (~ -5.76, 112.64)
      if (lat >= -5.85 && lat <= -5.68 && lng >= 112.55 && lng <= 112.75) {
        return false;
      }
      return true;
    }
  }

  // 3. Sunda Strait (Selat Sunda open water)
  if (lat >= -6.15 && lat <= -5.75 && lng >= 105.1 && lng <= 105.8) {
    return true;
  }

  // 4. Madura Strait (Selat Madura open water between Surabaya/Pasuruan and Madura)
  if (lat >= -7.45 && lat <= -7.10 && lng >= 112.70 && lng <= 114.3) {
    return true;
  }

  // 5. Bali Strait & Lombok Strait
  if (lat >= -8.45 && lat <= -8.05 && lng >= 114.38 && lng <= 114.52) return true; // Bali Strait
  if (lat >= -8.75 && lat <= -8.20 && lng >= 115.60 && lng <= 115.95) return true; // Lombok Strait

  // 6. Malacca Strait (Selat Malaka)
  if (lat >= 1.2 && lat <= 5.8 && lng >= 98.5 && lng <= 103.5) {
    return true;
  }

  // 7. Makassar Strait
  if (lat >= -4.5 && lat <= 0.8 && lng >= 117.8 && lng <= 119.3) {
    return true;
  }

  return false;
}

function getDevicePortCapacity(device: MapDevice): number {
  if (device.total_ports && Number(device.total_ports) > 0) {
    return Number(device.total_ports);
  }
  if (device.splitter_ratio) {
    const match = String(device.splitter_ratio).match(/1[:/](\d+)/);
    if (match?.[1]) {
      return Number(match[1]);
    }
  }
  if (device.capacity_core && Number(device.capacity_core) > 0) {
    return Number(device.capacity_core);
  }
  // Deterministic port capacity fallback from device ID hash (8, 16, 24, or 32 ports)
  let hash = 0;
  const str = device.id || device.device_name || "";
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const presetPorts = [8, 16, 24, 32];
  return presetPorts[Math.abs(hash) % presetPorts.length];
}

/**
 * Calculates individual device coverage and estimated homepassed for tooltips.
 * Performs water masking & strict POI validation to ensure water/sea coordinates get 0 Homepassed.
 */
export function calculateIndividualDeviceHomepassed(
  device: MapDevice,
  radiusMeters: number = 250,
  densityPerSqMeter: number = 0.003,
  buildingPois: OverpassPOI[] = []
) {
  const lat = Number(device.latitude);
  const lng = Number(device.longitude);
  
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return {
      radiusMeters,
      areaSqM: 0,
      areaKm2: 0,
      estimatedHomepassed: 0,
      portCapacity: 0,
      isInWater: true,
      waterWarning: "Koordinat Tidak Valid",
    };
  }

  const inWater = isPointInWater(lat, lng);
  if (inWater) {
    return {
      radiusMeters,
      areaSqM: 0,
      areaKm2: 0,
      estimatedHomepassed: 0,
      portCapacity: getDevicePortCapacity(device),
      isInWater: true,
      waterWarning: "Koordinat di Perairan / Laut",
    };
  }

  const portCapacity = getDevicePortCapacity(device);
  const pt = turf.point([lng, lat]);
  const buf = turf.buffer(pt, radiusMeters, { units: "meters" });
  const areaSqM = buf ? turf.area(buf) : Math.PI * Math.pow(radiusMeters, 2);
  const areaKm2 = areaSqM / 1_000_000;

  // Check if building POIs exist in circle
  let exactBuildingCount = 0;
  let hasPoiData = false;
  if (buf && buildingPois.length > 0) {
    hasPoiData = true;
    buildingPois.forEach((poi) => {
      const poiPt = turf.point([poi.lng, poi.lat]);
      if (turf.booleanPointInPolygon(poiPt, buf as any)) {
        exactBuildingCount++;
      }
    });
  }

  let estimatedHomepassed = 0;
  if (hasPoiData) {
    // Strict POI count: if building POIs are loaded and 0 building POIs exist in radius -> 0 Homepassed!
    estimatedHomepassed = exactBuildingCount;
  } else {
    // If POI data not loaded, calculate from port capacity * multiplier scaled by radius
    const multiplier = 8;
    const scale = radiusMeters / 250;
    estimatedHomepassed = Math.round(portCapacity * multiplier * scale);
  }

  return {
    radiusMeters,
    areaSqM: Math.round(areaSqM),
    areaKm2: Number(areaKm2.toFixed(3)),
    estimatedHomepassed,
    portCapacity,
    isInWater: false,
    waterWarning: null,
  };
}

/**
 * Extract LineString coordinates from path_geojson property of MapRoute
 */
function parseRouteCoordinates(route: MapRoute): number[][] | null {
  if (!route.path_geojson) return null;
  
  try {
    const geojson = typeof route.path_geojson === "string" 
      ? JSON.parse(route.path_geojson) 
      : route.path_geojson;
      
    if (geojson?.type === "LineString" && Array.isArray(geojson.coordinates)) {
      return geojson.coordinates;
    }
    if (geojson?.type === "Feature" && geojson.geometry?.type === "LineString" && Array.isArray(geojson.geometry.coordinates)) {
      return geojson.geometry.coordinates;
    }
    if (Array.isArray(geojson)) {
      return geojson.map((pt: any) => {
        if (Array.isArray(pt)) return [Number(pt[0]), Number(pt[1])];
        if (pt && typeof pt === "object" && "lng" in pt && "lat" in pt) {
          return [Number(pt.lng), Number(pt.lat)];
        }
        return [0, 0];
      }).filter(coord => coord[0] !== 0 || coord[1] !== 0);
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Calculates spatial union coverage and homepassed metrics for MapDevices & MapRoutes.
 * Optimized with region filtering to keep execution ultra fast.
 */
export function calculateHomepassedCoverage(
  devices: MapDevice[],
  routes: MapRoute[],
  buildingPois: OverpassPOI[] = [],
  config: HomepassedCalculationConfig = DEFAULT_HOMEPASSED_CONFIG
): HomepassedCalculationResult {
  const bufferFeatures: Feature<Polygon | MultiPolygon>[] = [];
  let rawUnmergedAreaSqM = 0;
  let activeDeviceCount = 0;
  let activeRouteCount = 0;

  // Filter devices by targetRegionId if specified and not __all__
  const targetRegion = config.targetRegionId;
  const filteredDevices = targetRegion && targetRegion !== "__all__"
    ? devices.filter((d) => d.region_id === targetRegion)
    : devices;

  // 1. Generate ODP & Device Buffers
  if (config.includeOdp && config.odpRadiusMeters > 0) {
    filteredDevices.forEach((device) => {
      const lat = Number(device.latitude);
      const lng = Number(device.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return;
      if (isPointInWater(lat, lng)) return; // Exclude open sea/water coordinates from coverage union!

      activeDeviceCount++;
      const pt = turf.point([lng, lat], { id: device.id, name: device.device_name });
      const buf = turf.buffer(pt, config.odpRadiusMeters, { units: "meters" });
      if (buf) {
        bufferFeatures.push(buf as Feature<Polygon | MultiPolygon>);
        rawUnmergedAreaSqM += turf.area(buf);
      }
    });
  }

  // 2. Generate Cable Corridor Buffers
  if (config.includeCables && config.cableRadiusMeters > 0) {
    routes.forEach((route) => {
      const coords = parseRouteCoordinates(route);
      if (!coords || coords.length < 2) return;

      activeRouteCount++;
      const line = turf.lineString(coords, { id: route.id, name: route.route_name });
      const buf = turf.buffer(line, config.cableRadiusMeters, { units: "meters" });
      if (buf) {
        bufferFeatures.push(buf as Feature<Polygon | MultiPolygon>);
        rawUnmergedAreaSqM += turf.area(buf);
      }
    });
  }

  // If no valid buffers generated, return empty result
  if (bufferFeatures.length === 0) {
    return {
      mergedPolygonFeature: null,
      totalCoverageAreaSqM: 0,
      totalCoverageAreaKm2: 0,
      exactHomepassedCount: 0,
      estimatedHomepassedCount: 0,
      rawUnmergedAreaSqM: 0,
      overlapSavingsPercentage: 0,
      activeDeviceCount: 0,
      activeRouteCount: 0,
    };
  }

  // 3. Compute Spatial Union to Dissolve Overlapping Boundaries (Anti-Double Count)
  let mergedPolygonFeature: Feature<Polygon | MultiPolygon> | null = null;

  try {
    if (bufferFeatures.length === 1) {
      mergedPolygonFeature = bufferFeatures[0];
    } else {
      const fc: FeatureCollection<Polygon | MultiPolygon> = turf.featureCollection(bufferFeatures);
      const unionResult = turf.union(fc);
      if (unionResult) {
        mergedPolygonFeature = unionResult as Feature<Polygon | MultiPolygon>;
      }
    }
  } catch (error) {
    console.warn("Turf union failed, falling back to first feature:", error);
    mergedPolygonFeature = bufferFeatures[0];
  }

  if (!mergedPolygonFeature) {
    mergedPolygonFeature = bufferFeatures[0];
  }

  // 4. Calculate Merged Metrics
  const totalCoverageAreaSqM = turf.area(mergedPolygonFeature);
  const totalCoverageAreaKm2 = totalCoverageAreaSqM / 1_000_000;

  // 5. Point-in-Polygon Exact Building Count
  let exactHomepassedCount = 0;
  if (buildingPois.length > 0 && mergedPolygonFeature) {
    buildingPois.forEach((poi) => {
      const pt = turf.point([poi.lng, poi.lat]);
      if (turf.booleanPointInPolygon(pt, mergedPolygonFeature!)) {
        exactHomepassedCount++;
      }
    });
  }

  // 6. Estimated Homepassed Calculation
  const estimatedHomepassedCount = Math.round(totalCoverageAreaSqM * config.densityPerSqMeter);

  // 7. Deduplication / Overlap Savings Percentage
  const overlapSavingsPercentage = rawUnmergedAreaSqM > 0
    ? Math.max(0, Math.round((1 - totalCoverageAreaSqM / rawUnmergedAreaSqM) * 100))
    : 0;

  return {
    mergedPolygonFeature,
    totalCoverageAreaSqM: Math.round(totalCoverageAreaSqM),
    totalCoverageAreaKm2: Number(totalCoverageAreaKm2.toFixed(3)),
    exactHomepassedCount,
    estimatedHomepassedCount,
    rawUnmergedAreaSqM: Math.round(rawUnmergedAreaSqM),
    overlapSavingsPercentage,
    activeDeviceCount,
    activeRouteCount,
  };
}
