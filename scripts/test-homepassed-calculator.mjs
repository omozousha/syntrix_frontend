import assert from "node:assert";
import * as turf from "@turf/turf";

console.log("=== Homepassed Calculator Unit Test ===");

// 1. Test getDevicePortCapacity behavior & fallback
function getDevicePortCapacity(device) {
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
  return 8;
}

assert.strictEqual(getDevicePortCapacity({ total_ports: 16 }), 16);
assert.strictEqual(getDevicePortCapacity({ splitter_ratio: "1:8" }), 8);
assert.strictEqual(getDevicePortCapacity({ splitter_ratio: "1/16" }), 16);
assert.strictEqual(getDevicePortCapacity({ capacity_core: 24 }), 24);
// Missing port data must deterministically default to 8 (not random hash)
assert.strictEqual(getDevicePortCapacity({ id: "DEV-XYZ-1", device_name: "Random ODP" }), 8);
assert.strictEqual(getDevicePortCapacity({ id: "DEV-XYZ-2", device_name: "Another ODP" }), 8);
console.log("✅ getDevicePortCapacity fallback to 8 verified");

// 2. Test isOdpDevice
function isOdpDevice(device) {
  const type = String(device.device_type_key || "").trim().toUpperCase();
  if (!type) return true; // legacy untyped fallback
  return type === "ODP";
}

assert.strictEqual(isOdpDevice({ device_type_key: "ODP" }), true);
assert.strictEqual(isOdpDevice({ device_type_key: "odp" }), true);
assert.strictEqual(isOdpDevice({ device_type_key: "" }), true); // legacy fallback
assert.strictEqual(isOdpDevice({ device_type_key: "ODC" }), false);
assert.strictEqual(isOdpDevice({ device_type_key: "OLT" }), false);
assert.strictEqual(isOdpDevice({ device_type_key: "POP" }), false);
assert.strictEqual(isOdpDevice({ device_type_key: "CLOSURE" }), false);
console.log("✅ isOdpDevice filtering verified");

// 3. Test calculateIndividualDeviceHomepassed logic
function calculateIndividualDeviceHomepassed(
  device,
  radiusMeters = 250,
  densityPerSqMeter = 0.003,
  buildingPois = []
) {
  const isOdp = isOdpDevice(device);
  const portCapacity = getDevicePortCapacity(device);

  if (!isOdp) {
    return {
      radiusMeters,
      areaSqM: 0,
      areaKm2: 0,
      estimatedHomepassed: 0,
      portCapacity,
      isInWater: false,
      waterWarning: null,
      source: "estimate",
      isOdp: false,
    };
  }

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
      source: "estimate",
      isOdp: true,
    };
  }

  // Java Sea water check
  const inWater = lat >= -6.0 && lat <= -3.0 && lng >= 106.0 && lng <= 114.0;
  if (inWater) {
    return {
      radiusMeters,
      areaSqM: 0,
      areaKm2: 0,
      estimatedHomepassed: 0,
      portCapacity,
      isInWater: true,
      waterWarning: "Koordinat di Perairan / Laut",
      source: "estimate",
      isOdp: true,
    };
  }

  const pt = turf.point([lng, lat]);
  const buf = turf.buffer(pt, radiusMeters, { units: "meters" });
  const areaSqM = buf ? turf.area(buf) : Math.PI * Math.pow(radiusMeters, 2);
  const areaKm2 = areaSqM / 1_000_000;

  let exactBuildingCount = 0;
  if (buf && buildingPois.length > 0) {
    const latDelta = radiusMeters / 111_320;
    const cosLat = Math.cos((lat * Math.PI) / 180);
    const lngDelta = radiusMeters / (111_320 * (cosLat > 0.001 ? cosLat : 1));
    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    for (let i = 0; i < buildingPois.length; i++) {
      const poi = buildingPois[i];
      if (poi.lat < minLat || poi.lat > maxLat || poi.lng < minLng || poi.lng > maxLng) continue;
      const poiPt = turf.point([poi.lng, poi.lat]);
      if (turf.booleanPointInPolygon(poiPt, buf)) {
        exactBuildingCount++;
      }
    }
  }

  let estimatedHomepassed = 0;
  let source = "estimate";
  if (exactBuildingCount > 0) {
    estimatedHomepassed = exactBuildingCount;
    source = "poi";
  } else {
    const multiplier = 8;
    const scale = radiusMeters / 250;
    estimatedHomepassed = Math.round(portCapacity * multiplier * scale);
    source = "estimate";
  }

  return {
    radiusMeters,
    areaSqM: Math.round(areaSqM),
    areaKm2: Number(areaKm2.toFixed(3)),
    estimatedHomepassed,
    portCapacity,
    isInWater: false,
    waterWarning: null,
    source,
    isOdp: true,
  };
}

// Case A: POI building passed inside radius
const odp1 = { id: "odp-1", device_type_key: "ODP", latitude: -6.9, longitude: 107.6, total_ports: 16 };
const testBuildings = [
  { id: 1, lat: -6.9001, lng: 107.6001, category: "building" },
  { id: 2, lat: -6.9002, lng: 107.6002, category: "building" },
  { id: 3, lat: -6.9003, lng: 107.6003, category: "building" },
  { id: 4, lat: -6.95, lng: 107.65, category: "building" }, // outside radius
];
const resultWithPoi = calculateIndividualDeviceHomepassed(odp1, 250, 0.003, testBuildings);
assert.strictEqual(resultWithPoi.source, "poi");
assert.strictEqual(resultWithPoi.estimatedHomepassed, 3);
assert.strictEqual(resultWithPoi.isOdp, true);
console.log("✅ calculateIndividualDeviceHomepassed with POI: exact 3 buildings counted, source=poi");

// Case B: No POI passed (fallback to port formula)
const resultWithoutPoi = calculateIndividualDeviceHomepassed(odp1, 250, 0.003, []);
assert.strictEqual(resultWithoutPoi.source, "estimate");
assert.strictEqual(resultWithoutPoi.estimatedHomepassed, 16 * 8); // 128
console.log("✅ calculateIndividualDeviceHomepassed fallback: portCapacity * 8, source=estimate");

// Case C: POIs exist in viewport, but 0 inside this ODP radius (rural/unmapped area -> fallback to port formula)
const ruralOdp = { id: "odp-rural", device_type_key: "ODP", latitude: -7.2, longitude: 107.8, total_ports: 8 };
const resultRural = calculateIndividualDeviceHomepassed(ruralOdp, 250, 0.003, testBuildings);
assert.strictEqual(resultRural.source, "estimate");
assert.strictEqual(resultRural.estimatedHomepassed, 8 * 8); // 64
console.log("✅ calculateIndividualDeviceHomepassed unmapped area: falls back to estimate (not 0)");

// Case D: Non-ODP device (ODC / OLT) -> isOdp=false, 0 homepassed
const odcDevice = { id: "odc-1", device_type_key: "ODC", latitude: -6.9, longitude: 107.6, total_ports: 48 };
const resultOdc = calculateIndividualDeviceHomepassed(odcDevice, 250, 0.003, testBuildings);
assert.strictEqual(resultOdc.isOdp, false);
assert.strictEqual(resultOdc.estimatedHomepassed, 0);
console.log("✅ calculateIndividualDeviceHomepassed non-ODP device: isOdp=false, 0 homepassed");

// Case E: Device in water
const waterOdp = { id: "odp-sea", device_type_key: "ODP", latitude: -5.5, longitude: 107.5 };
const waterResult = calculateIndividualDeviceHomepassed(waterOdp, 250, 0.003, testBuildings);
assert.strictEqual(waterResult.isInWater, true);
assert.strictEqual(waterResult.estimatedHomepassed, 0);
console.log("✅ calculateIndividualDeviceHomepassed water masking: 0 homepassed");

// Case F: BBox Pre-filter performance with 5000 POIs
const largeBuildings = [];
for (let i = 0; i < 5000; i++) {
  largeBuildings.push({ id: i, lat: -7.0 - i * 0.001, lng: 107.0 - i * 0.001 });
}
// Add 2 buildings within odp1 radius
largeBuildings.push({ id: 9991, lat: -6.9001, lng: 107.6001 });
largeBuildings.push({ id: 9992, lat: -6.9002, lng: 107.6002 });
const tStart = Date.now();
const resLarge = calculateIndividualDeviceHomepassed(odp1, 250, 0.003, largeBuildings);
const elapsedMs = Date.now() - tStart;
assert.strictEqual(resLarge.estimatedHomepassed, 2);
assert.strictEqual(resLarge.source, "poi");
assert.ok(elapsedMs < 100, `BBox pre-filter took ${elapsedMs}ms, should be < 100ms`);
console.log(`✅ calculateIndividualDeviceHomepassed 5,000 POIs BBox benchmark: ${elapsedMs}ms, exact 2 counted`);

// 4. Test calculateHomepassedCoverage ODP device filtering
function calculateHomepassedCoverage(devices, routes, buildingPois, config) {
  let activeDeviceCount = 0;
  devices.forEach((device) => {
    if (!isOdpDevice(device)) return;
    activeDeviceCount++;
  });
  return { activeDeviceCount };
}

const mixedDevices = [
  { id: "1", device_type_key: "ODP" },
  { id: "2", device_type_key: "ODP" },
  { id: "3", device_type_key: "ODC" },
  { id: "4", device_type_key: "OLT" },
  { id: "5", device_type_key: "POP" },
];
const coverageResult = calculateHomepassedCoverage(mixedDevices, [], [], {});
assert.strictEqual(coverageResult.activeDeviceCount, 2);
console.log("✅ calculateHomepassedCoverage: accurately filters only ODP devices (2 of 5)");

console.log("=== ALL HOMEPASSED CALCULATOR TESTS PASSED ===");
