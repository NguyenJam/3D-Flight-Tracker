import * as THREE from "three";
import React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import axios from "axios";
import { altitudeToColor } from "./AltitudeLegend";
import airports from "../data/airports-lite.json";

const POSITION_SOURCE_LABELS = {
  0: "ADS-B",
  1: "ASTERIX Radar",
  2: "Multilateration (MLAT)",
};

const getPositionSourceLabel = (source) => {
  if (source === null || source === undefined) return "Unknown";
  return POSITION_SOURCE_LABELS[source] || "Unknown";
};

const deriveOpenSkySource = (positionSourceValue) => {
  const sensorLabel = getPositionSourceLabel(positionSourceValue);
  if (!sensorLabel || sensorLabel === "Unknown") {
    return "OpenSky Network";
  }
  return sensorLabel;
};

const EARTH_RADIUS_METERS = 6371000;
const MAX_DESTINATION_RANGE_KM = 2000;
const MAX_DESTINATION_HEADING_DIFF = 35;
const MAX_REASONABLE_ETA_SECONDS = 18 * 3600;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

const haversineMeters = (lat1, lon1, lat2, lon2) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

const bearingDeg = (lat1, lon1, lat2, lon2) => {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const lambda1 = toRad(lon1);
  const lambda2 = toRad(lon2);
  const y = Math.sin(lambda2 - lambda1) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambda2 - lambda1);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
};

const headingDifference = (a, b) => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
};

const formatEta = (seconds) => {
  if (!Number.isFinite(seconds)) return null;
  if (seconds <= 0) return "Arriving";
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) {
    return remMins === 0 ? `in ${hours}h` : `in ${hours}h ${remMins}m`;
  }
  const etaDate = new Date(Date.now() + seconds * 1000);
  return etaDate.toLocaleString();
};

const estimateDestinationForFlight = (lat, lon, headingDeg, speedMps) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (!Number.isFinite(speedMps) || speedMps <= 1) return null;

  let best = null;
  for (let i = 0; i < airports.length; i++) {
    const airport = airports[i];
    if (!airport) continue;
    const aLat = airport.latitude;
    const aLon = airport.longitude;
    if (!Number.isFinite(aLat) || !Number.isFinite(aLon)) continue;

    const distanceMeters = haversineMeters(lat, lon, aLat, aLon);
    if (!Number.isFinite(distanceMeters)) continue;
    if (distanceMeters > MAX_DESTINATION_RANGE_KM * 1000) continue;

    let headingPenalty = 1;
    let diff = null;
    if (Number.isFinite(headingDeg)) {
      const bearing = bearingDeg(lat, lon, aLat, aLon);
      diff = headingDifference(headingDeg, bearing);
      if (diff !== null && diff > MAX_DESTINATION_HEADING_DIFF) {
        continue;
      }
      if (diff !== null) {
        headingPenalty = 1 + diff / MAX_DESTINATION_HEADING_DIFF;
      }
    }

    const score = distanceMeters * headingPenalty;
    if (!best || score < best.score) {
      best = {
        airport,
        distanceMeters,
        score,
        headingDiff: diff,
      };
    }
  }

  if (!best) return null;
  const etaSeconds = best.distanceMeters / speedMps;
  if (!Number.isFinite(etaSeconds) || etaSeconds <= 0 || etaSeconds > MAX_REASONABLE_ETA_SECONDS) {
    return null;
  }

  return {
    etaSeconds,
    etaReadable: formatEta(etaSeconds),
    destination: {
      ident: best.airport.ident || null,
      name: best.airport.name || null,
      latitude: best.airport.latitude,
      longitude: best.airport.longitude,
    },
    source: best.headingDiff !== null ? "heuristic-heading" : "heuristic-distance",
  };
};

const SimpleAircraft = ({ flight, position, color = 0xffff00, onClick, selected = false }) => {
  const meshRef = React.useRef();
  const haloRef = React.useRef();
  const [isHovered, setIsHovered] = React.useState(false);
  
  useFrame(({ clock }) => {
      if (meshRef.current) {
      const pulse = Math.sin(clock.elapsedTime * 1.2) * 0.15 + 1.0;
      const mainScale = pulse * 0.010;
      meshRef.current.scale.setScalar(mainScale);
      if (haloRef.current) {
        haloRef.current.scale.setScalar(mainScale * 1.5);
      }
    }
  });
  
  if (!position) return null;
  
  return (
    <group
      position={[position.x, position.y, position.z]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setIsHovered(true);
        if (document && document.body) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setIsHovered(false);
        if (document && document.body) document.body.style.cursor = 'default';
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (onClick && flight) {
          onClick(flight, event);
        }
      }}
    >
      {/* Halo to help differentiate overlapping markers */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[1, 12, 10]} />
        {/* If selected, halo becomes more visible */}
        <meshBasicMaterial
          color={isHovered || selected ? color : 0x000000}
          transparent
          opacity={isHovered || selected ? 0.5 : 0.18}
          depthWrite={false}
          blending={isHovered || selected ? THREE.AdditiveBlending : THREE.NormalBlending}
        />
      </mesh>
      {/* Main marker */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1, 12, 10]} />
        {/* If selected, highlight becomes brighter */}
        <meshBasicMaterial
          color={isHovered || selected ? 0xffffff : color}
          transparent={true}
          opacity={isHovered || selected ? 1.0 : 0.9}
        />
      </mesh>
    </group>
  );
};

// Real-time flight tracker
const SimpleFlightTracker = ({
  enabled = true,
  maxAircraft = 500,
  onFlightCountChange,
  onTotalAvailableChange = null,
  onAircraftClick,
  earthRef,
  flipLongitude = false,
  selectedAircraftId = null,
  trackerToken = null,
  filterAirborne = true,
  filterOnGround = true,
  enableDeclutter = true,
  onFlightsUpdate = null,
  altMinFt = null,
  altMaxFt = null,
  callsignFilter = '',
  icaoFilter = '',
  countryFilter = '',
  sourceFilters = { ADSB: true, ASTERIX: true, MLAT: true, OTHER: true },
}) => {
  const [flights, setFlights] = React.useState([]);
  const [rawFlights, setRawFlights] = React.useState([]); // Store all flights from API
  const [loading, setLoading] = React.useState(false);
  const [lastUpdate, setLastUpdate] = React.useState(0);
  const [error, setError] = React.useState(null);
  const mToFt = (m) => (m == null ? null : m * 3.28084);

  const totalAvailableRef = React.useRef(-1);
  const visibleCountRef = React.useRef(-1);

  const reportTotalAvailable = React.useCallback((count) => {
    if (!onTotalAvailableChange) return;
    if (totalAvailableRef.current === count) return;
    totalAvailableRef.current = count;
    onTotalAvailableChange(count);
  }, [onTotalAvailableChange]);

  const reportVisibleCount = React.useCallback((count) => {
    if (!onFlightCountChange) return;
    if (visibleCountRef.current === count) return;
    visibleCountRef.current = count;
    onFlightCountChange(count);
  }, [onFlightCountChange]);

  const { camera } = useThree();
  const frustumRef = React.useRef(new THREE.Frustum());
  const projMatrixRef = React.useRef(new THREE.Matrix4());
  const cameraPosRef = React.useRef(new THREE.Vector3());
  const worldPosRef = React.useRef(new THREE.Vector3());
  const rayDirRef = React.useRef(new THREE.Vector3());
  const flightsForVisibilityRef = React.useRef([]);

  // Stabilise the on-screen counter to avoid rapid flicker
  const stableVisibleRef = React.useRef(-1);
  const pendingVisibleRef = React.useRef(null);
  const pendingSinceRef = React.useRef(0);
  const VISIBLE_STABILIZE_MS = 120;

  const resetVisibleTracking = React.useCallback(() => {
    stableVisibleRef.current = -1;
    pendingVisibleRef.current = null;
    pendingSinceRef.current = 0;
    visibleCountRef.current = -1;
  }, []);

  const flushVisibleCount = React.useCallback((count) => {
    const safeCount = Number.isFinite(count) ? count : 0;
    stableVisibleRef.current = safeCount;
    pendingVisibleRef.current = null;
    pendingSinceRef.current = 0;
    reportVisibleCount(safeCount);
  }, [reportVisibleCount]);

  const queueVisibleCount = React.useCallback((count) => {
    const safeCount = Number.isFinite(count) ? count : 0;
    const stable = stableVisibleRef.current;
    if (stable === -1) {
      flushVisibleCount(safeCount);
      return;
    }
    if (safeCount === stable) {
      pendingVisibleRef.current = null;
      pendingSinceRef.current = 0;
      return;
    }
    const now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
    if (pendingVisibleRef.current === safeCount) {
      if (now - pendingSinceRef.current >= VISIBLE_STABILIZE_MS) {
        flushVisibleCount(safeCount);
      }
      return;
    }
    pendingVisibleRef.current = safeCount;
    pendingSinceRef.current = now;
  }, [flushVisibleCount]);

  const EARTH_RADIUS = 2.05;

  const normalizedCallsign = React.useMemo(() => (callsignFilter || '').trim().toLowerCase(), [callsignFilter]);
  const normalizedIcao = React.useMemo(() => (icaoFilter || '').trim().toLowerCase(), [icaoFilter]);
  const normalizedCountry = React.useMemo(() => (countryFilter || '').trim().toLowerCase(), [countryFilter]);

  const filterFlights = React.useCallback((list) => {
    if (!list || list.length === 0) return [];
    const { ADSB = true, ASTERIX = true, MLAT = true, OTHER = true } = sourceFilters || {};
    return list.filter(f => {
      const isAirborne = !f.onGround;
      const keepAirborne = filterAirborne && isAirborne;
      const keepGround = filterOnGround && f.onGround;
      if (!(keepAirborne || keepGround)) return false;
      const altFt = mToFt(f.baroAltitude ?? f.geoAltitude);
      if (typeof altMinFt === 'number' && (altFt == null || altFt < altMinFt)) return false;
      if (typeof altMaxFt === 'number' && (altFt == null || altFt > altMaxFt)) return false;
      const src = f.positionSource;
      const isKnownSource = src === 'ADS-B' || src === 'ASTERIX' || src === 'MLAT';
      const allowed = (src === 'ADS-B' && ADSB) || (src === 'ASTERIX' && ASTERIX) || (src === 'MLAT' && MLAT) || (!isKnownSource && OTHER);
      if (!allowed) return false;
      if (normalizedCallsign) {
        const callsign = (f.callsign || '').toLowerCase();
        if (!callsign.includes(normalizedCallsign)) return false;
      }
      if (normalizedIcao) {
        const icao = (f.icao24 || '').toLowerCase();
        if (!icao.includes(normalizedIcao)) return false;
      }
      if (normalizedCountry) {
        const country = (f.country || '').toLowerCase();
        if (!country.includes(normalizedCountry)) return false;
      }
      return true;
    });
  }, [sourceFilters, filterAirborne, filterOnGround, altMinFt, altMaxFt, normalizedCallsign, normalizedIcao, normalizedCountry]);

  const filterFlightsRef = React.useRef(filterFlights);
  React.useEffect(() => {
    filterFlightsRef.current = filterFlights;
  }, [filterFlights]);

  const maxAircraftRef = React.useRef(maxAircraft);
  React.useEffect(() => {
    maxAircraftRef.current = maxAircraft;
  }, [maxAircraft]);
  
  // Convert lat/lon to 3D coordinates on globe
  const latLonToPosition = React.useCallback((lat, lon, radius = 2.05) => {
    const useLon = flipLongitude ? -lon : lon;
    const phi = (90 - lat) * Math.PI / 180;
    const theta = (-useLon + 180) * Math.PI / 180;

    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta)
    };
  }, [flipLongitude]);

  // Convert 3D coordinate back to lat/lon
  const positionToLatLon = React.useCallback((pos) => {
    const r = Math.sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z);
    const v = { x: pos.x/r, y: pos.y/r, z: pos.z/r };
    const lat = Math.asin(v.y) * 180 / Math.PI;
    const thetaDeg = Math.atan2(v.z, v.x) * 180 / Math.PI; // [-180,180]
    let lon = 180 - thetaDeg;
    lon = ((lon + 180) % 360 + 360) % 360 - 180;
    return { lat, lon };
  }, []);

  const maxJitterMeters = 3000;
  const seededHash = (str) => {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  };
  const jitterLatLon = (lat, lon, id) => {
    if (!enableDeclutter) return { lat, lon };
    const seed = seededHash(String(id || '0'));
    const rand = mulberry32(seed);
    const u1 = rand();
    const u2 = rand();
    const angle = 2 * Math.PI * u1;
    const radius = maxJitterMeters * Math.sqrt(u2);
    const latRad = (lat * Math.PI) / 180;
    const metersPerDegLat = 111320;
    const metersPerDegLon = Math.max(111320 * Math.cos(latRad), 1000); 
    const dLat = (Math.cos(angle) * radius) / metersPerDegLat;
    const dLon = (Math.sin(angle) * radius) / metersPerDegLon;
    let jLat = lat + dLat;
    let jLon = lon + dLon;
    // Clamp ranges
    jLat = Math.max(-90, Math.min(90, jLat));
    jLon = ((jLon + 180) % 360 + 360) % 360 - 180;
    return { lat: jLat, lon: jLon };
  };

  // Fetch flight data
  const fetchRealFlights = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching flight data...');
      
      const headers = { 'Accept': 'application/json' };
      if (trackerToken) headers['Authorization'] = `Bearer ${trackerToken}`;
      const response = await axios.get('/opensky/api/states/all', {
        timeout: 15000,
        headers
      });
      if (!response || typeof response.data === 'string') {
        const preview = String(response?.data || '').slice(0, 200);
        throw new Error('Unexpected non-JSON response from OpenSky' + (preview ? `: ${preview}` : ''));
      }

  const extractStates = (data) => (data && Array.isArray(data.states)) ? data.states : (data && data.states === null ? [] : null);

  let statesArray = extractStates(response.data);
  if (statesArray === null) {
        console.warn('OpenSky response keys:', Object.keys(response.data || {}));
        console.warn('No usable states array from /api/states/all; attempting bbox fallback...');
        try {
          const bboxUrl = '/opensky/api/states/all?lamin=-85&lomin=-180&lamax=85&lomax=180';
          const respBbox = await axios.get(bboxUrl, { timeout: 20000, headers });
          if (!respBbox || typeof respBbox.data === 'string') {
            const preview2 = String(respBbox?.data || '').slice(0,200);
            throw new Error('Fallback bbox returned non-JSON' + (preview2 ? `: ${preview2}` : ''));
          }
          statesArray = extractStates(respBbox.data);
        } catch (e) {
          console.warn('BBox fallback failed:', e?.message || e);
        }
  }

  if (!Array.isArray(statesArray) || statesArray.length === 0) {
    console.warn('OpenSky returned no usable flights.');
    setRawFlights([]);
    setFlights([]);
    flightsForVisibilityRef.current = [];
    resetVisibleTracking();
    setLastUpdate(Date.now());
    reportTotalAvailable(0);
    if (onFlightsUpdate) onFlightsUpdate([]);
    return;
  }

  if (Array.isArray(statesArray)) {
  const realFlights = statesArray
          .filter(state => {
            // Filter out flights without position data and validate lat/lon ranges
            const lon = state[5];
            const lat = state[6];
            return lon !== null && lat !== null && 
                   lon !== undefined && lat !== undefined &&
                   lat >= -90 && lat <= 90 &&
                   lon >= -180 && lon <= 180;
          })

          .map((state, index) => {
            // Extract all OpenSky API fields
            const icao24 = state[0];
            const rawCallsign = typeof state[1] === 'string' ? state[1].trim() : '';
            const callsign = rawCallsign.length > 0 ? rawCallsign : `Flight${index}`;
            const countryRaw = typeof state[2] === 'string' ? state[2].trim() : state[2];
            const country = countryRaw || 'Unknown';
            const timePosition = state[3];
            const lastContact = state[4];
            const longitude = state[5];
            const latitude = state[6];
            let finalLongitude = longitude;
            const baroAltitude = state[7]; // meters
            const onGround = state[8]; // boolean
            const velocity = state[9]; // m/s (ground speed)
            const trueTrack = state[10]; // degrees (heading)
            const verticalRate = state[11]; // m/s (rate of climb/descent)
            const sensors = state[12]; // array of sensor serial numbers
            const geoAltitude = state[13]; // meters (geometric altitude)
            const squawk = state[14]; // transponder code
            const spi = state[15]; // special purpose indicator
            const positionSourceValue = state[16]; // 0=ADS-B, 1=ASTERIX, 2=MLAT
            
            // Clean up data
            const cleanVelocity = (velocity !== null && velocity !== undefined && velocity > 0) ? velocity : null;
            const cleanHeading = (trueTrack !== null && trueTrack !== undefined && trueTrack >= 0 && trueTrack <= 360) ? trueTrack : null;
            const cleanVerticalRate = (verticalRate !== null && verticalRate !== undefined) ? verticalRate : null;
            const cleanBaroAltitude = (baroAltitude !== null && baroAltitude !== undefined) ? baroAltitude : null;
            const cleanGeoAltitude = (geoAltitude !== null && geoAltitude !== undefined) ? geoAltitude : null;
            
            // Determine aircraft status
            const status = onGround ? 'On Ground' : 'Airborne';

            // Map position source and derive description
            const positionSourceLabel = getPositionSourceLabel(positionSourceValue);
            const derivedSource = deriveOpenSkySource(positionSourceValue);
            
            // Color based on altitude
            let color = 0x00ff00; // Default
            const displayAltitude = cleanBaroAltitude || cleanGeoAltitude || 0; // meters
            const hexStr = altitudeToColor(displayAltitude);
            color = new THREE.Color(hexStr).getHex();
            
            const { lat: jLat, lon: jLon } = jitterLatLon(latitude, longitude, icao24 || callsign);
            const position = latLonToPosition(jLat, jLon);

            try {
              const inv = positionToLatLon(position);
              const sourceLon = jLon;
              const diff = Math.abs(((inv.lon - sourceLon + 540) % 360) - 180);
              if (diff > 170 && diff < 190) {
                console.info(`Longitude inversion detected for ${callsign || icao24} — auto-flipping longitude ${sourceLon.toFixed(4)} → ${(-sourceLon).toFixed(4)}`);
                const flippedLon = -sourceLon;
                const fixedPos = latLonToPosition(jLat, flippedLon);
                position.x = fixedPos.x;
                position.y = fixedPos.y;
                position.z = fixedPos.z;
                finalLongitude = flippedLon;
              }
            } catch (e) {}
            
            const distanceFromCenter = Math.sqrt(position.x*position.x + position.y*position.y + position.z*position.z);

            const etaEstimate = estimateDestinationForFlight(latitude, finalLongitude, cleanHeading, cleanVelocity);
            
            return {
              id: icao24 || `flight-${index}`, // ICAO24 identifier
              callsign,
              country,
              icao24,
              type: null,
              timePosition,
              lastContact,
              position,
              altitude: displayAltitude,
              baroAltitude: cleanBaroAltitude,
              geoAltitude: cleanGeoAltitude,
              onGround,
              status,
              velocity: cleanVelocity,
              heading: cleanHeading,
              verticalRate: cleanVerticalRate,
              sensors,
              squawk,
              spi,
              positionSource: positionSourceLabel,
              rawPositionSource: positionSourceValue,
              source: derivedSource,
              etaSeconds: etaEstimate?.etaSeconds ?? null,
              etaReadable: etaEstimate?.etaReadable ?? null,
              etaDestination: etaEstimate?.destination ?? null,
              etaSource: etaEstimate?.source ?? null,
              longitude: finalLongitude,
              latitude,
              color,
              distanceFromCenter
            };
          })
          .filter(flight => {
            // Filter out flights with invalid positions
            const distance = flight.distanceFromCenter;
            const isValid = distance > 2.0 && distance < 2.3;
            
            if (!isValid) {
              console.log(`Filtering out flight ${flight.callsign} - distance: ${distance.toFixed(3)}, position: [${flight.position.x.toFixed(2)}, ${flight.position.y.toFixed(2)}, ${flight.position.z.toFixed(2)}]`);
            }
            
            return isValid;
          });

        // Apply filters
        const applyFilters = typeof filterFlightsRef.current === 'function'
          ? filterFlightsRef.current
          : (list) => list || [];
        const statusFiltered = applyFilters(realFlights);
        
        // Log a few positions for debugging
        realFlights.slice(0, 3).forEach(flight => {
          console.log(`Flight ${flight.callsign}: lat=${flight.latitude}, lon=${flight.longitude}, distance=${flight.distanceFromCenter.toFixed(3)}, position=[${flight.position.x.toFixed(2)}, ${flight.position.y.toFixed(2)}, ${flight.position.z.toFixed(2)}]`);
        });
        
        // Store raw flights and apply limit
        setRawFlights(realFlights);
        const working = statusFiltered;
        const limit = maxAircraftRef.current;
        const limitedFlights = (limit === null || limit === undefined)
          ? working
          : working.slice(0, limit);
        setFlights(limitedFlights);
        flightsForVisibilityRef.current = limitedFlights;
        resetVisibleTracking();
        setLastUpdate(Date.now());
        console.log(`Loaded ${realFlights.length} flights, showing ${limitedFlights.length} (limit: ${limit ?? 'All'})`);
        reportTotalAvailable(working.length);
        if (onFlightsUpdate) {
          onFlightsUpdate(limitedFlights);
        }
        
      } else {
        console.warn('OpenSky response keys:', Object.keys(response.data || {}));
        throw new Error('No flight data received from OpenSky');
      }
      
    } catch (err) {
      console.error('Error fetching flight data:', err.message);
      setError(err.message);
      const hasFlights = flightsForVisibilityRef.current && flightsForVisibilityRef.current.length > 0;
      if (!hasFlights) {
        setFlights([]);
        setRawFlights([]);
        flightsForVisibilityRef.current = [];
        resetVisibleTracking();
        setLastUpdate(Date.now());
        reportTotalAvailable(0);
        flushVisibleCount(0);
        if (onFlightsUpdate) onFlightsUpdate([]);
      } else {
        setLastUpdate(Date.now());
      }
    } finally {
      setLoading(false);
    }
  }, [latLonToPosition, trackerToken, onFlightsUpdate, reportTotalAvailable, resetVisibleTracking, flushVisibleCount]);
  
  // Effect to redisplay flights when maxAircraft limit changes
  React.useEffect(() => {
    if (enabled) {
      const working = filterFlights(rawFlights);
      const limitedFlights = (maxAircraft === null || maxAircraft === undefined)
        ? working
        : working.slice(0, maxAircraft);
      setFlights(limitedFlights);
      flightsForVisibilityRef.current = limitedFlights;
      resetVisibleTracking();
      console.log(`Settings changed (limit:${maxAircraft ?? 'All'}), showing ${limitedFlights.length} of ${working.length}`);
      reportTotalAvailable(working.length);
      if (onFlightsUpdate) onFlightsUpdate(limitedFlights);
    }
  }, [maxAircraft, rawFlights, enabled, filterFlights, onFlightsUpdate, reportTotalAvailable, resetVisibleTracking]);
  
  // Main effect to load flight data
  React.useEffect(() => {
    if (!enabled) {
      setFlights([]);
      setRawFlights([]);
      flightsForVisibilityRef.current = [];
      flushVisibleCount(0);
      resetVisibleTracking();
      reportTotalAvailable(0);
      if (onFlightsUpdate) onFlightsUpdate([]);
      return;
    }
    
    fetchRealFlights();
  }, [enabled, fetchRealFlights, flushVisibleCount, reportTotalAvailable, onFlightsUpdate, resetVisibleTracking]);
  
  // Auto-refresh data every 30 seconds
  React.useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      fetchRealFlights();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [enabled, fetchRealFlights]);

  // Manual refresh via global event
  React.useEffect(() => {
    const handler = () => {
      if (enabled) fetchRealFlights();
    };
    window.addEventListener('refreshFlights', handler);
    return () => window.removeEventListener('refreshFlights', handler);
  }, [enabled, fetchRealFlights]);

  // Handle aircraft click
  const handleAircraftClick = React.useCallback((flight, event) => {
    if (onAircraftClick) {
      // Pass complete aircraft object with all data
      const aircraftData = {
        id: flight.id,
        callsign: flight.callsign,
        country: flight.country,
        icao24: flight.icao24,
        timePosition: flight.timePosition,
        lastContact: flight.lastContact,
        longitude: flight.longitude,
        latitude: flight.latitude,
        altitude: flight.altitude,
        baroAltitude: flight.baroAltitude,
        geoAltitude: flight.geoAltitude,
        onGround: flight.onGround,
        status: flight.status,
        velocity: flight.velocity,
        heading: flight.heading,
        verticalRate: flight.verticalRate,
        sensors: flight.sensors,
        squawk: flight.squawk,
        spi: flight.spi,
        positionSource: flight.positionSource,
        rawPositionSource: flight.rawPositionSource,
        position: flight.position,
        source: flight.source || flight.positionSource || 'OpenSky Network',
        etaSeconds: flight.etaSeconds ?? null,
        etaReadable: flight.etaReadable ?? null,
        etaDestination: flight.etaDestination ?? null,
        etaSource: flight.etaSource ?? null,
        timestamp: Date.now() / 1000
      };
      
      onAircraftClick(aircraftData, event);
    }
  }, [onAircraftClick]);
  
  const groupRef = React.useRef();
  React.useEffect(() => {
    flightsForVisibilityRef.current = flights;
  }, [flights]);

  useFrame(() => {
    if (!enabled) {
      queueVisibleCount(0);
      return;
    }

    if (earthRef?.current && groupRef.current) {
      groupRef.current.rotation.y = earthRef.current.rotation.y;
    }

    if (!camera) return;

    const currentFlights = flightsForVisibilityRef.current || [];
    if (currentFlights.length === 0) {
      queueVisibleCount(0);
      return;
    }

    camera.updateMatrixWorld();
    projMatrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustumRef.current.setFromProjectionMatrix(projMatrixRef.current);
    cameraPosRef.current.copy(camera.position);

    let visible = 0;
    for (let i = 0; i < currentFlights.length; i++) {
      const flight = currentFlights[i];
      if (!flight || !flight.position) continue;

      const worldPos = worldPosRef.current;
      worldPos.copy(flight.position);
      if (groupRef.current) {
        groupRef.current.localToWorld(worldPos);
      }

      if (!frustumRef.current.containsPoint(worldPos)) {
        continue;
      }

      let occluded = false;
      if (earthRef?.current) {
        rayDirRef.current.copy(worldPos).sub(cameraPosRef.current);
        const distance = rayDirRef.current.length();
        if (distance > 0.0001) {
          rayDirRef.current.divideScalar(distance);
          const camPos = cameraPosRef.current;
          const b = 2 * rayDirRef.current.dot(camPos);
          const c = camPos.lengthSq() - (EARTH_RADIUS * EARTH_RADIUS);
          const discriminant = (b * b) - (4 * c);
          if (discriminant > 0) {
            const sqrtDisc = Math.sqrt(discriminant);
            const t1 = (-b - sqrtDisc) / 2;
            const t2 = (-b + sqrtDisc) / 2;
            const tHit = Math.min(t1, t2);
            if (tHit > 0 && tHit < distance - 0.05) {
              occluded = true;
            }
          }
        }
      }

      if (!occluded) {
        visible += 1;
      }
    }

    queueVisibleCount(visible);
  });

  if (!enabled) return null;

  return (
    <group ref={groupRef}>
      {/* Loading indicator */}
      {loading && flights.length === 0 && (
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color={0x00ffff} transparent opacity={0.8} />
        </mesh>
      )}
      
      {/* Aircraft */}
      {flights.map(flight => (
        <SimpleAircraft
          key={flight.id}
          flight={flight}
          position={flight.position}
          color={flight.color}
            onClick={handleAircraftClick}
            selected={selectedAircraftId === flight.id}
        />
      ))}
    </group>
  );
};

export default SimpleFlightTracker;