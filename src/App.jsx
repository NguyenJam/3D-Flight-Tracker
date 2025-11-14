import * as THREE from "three";
import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
const Starfield = React.lazy(() => import("./Starfield"));
const EarthMaterial = React.lazy(() => import("./EarthMaterial"));
const StylizedEarthMaterial = React.lazy(() => import("./StylizedEarthMaterial"));
const AtmosphereMesh = React.lazy(() => import("./AtmosphereMesh"));
const CountryBorders = React.lazy(() => import("./CountryBorders"));
const SimpleFlightTracker = React.lazy(() => import("./components/SimpleFlightTracker"));
const AircraftPopup = React.lazy(() => import("./components/AircraftPopup"));
const SearchSidebar = React.lazy(() => import("./components/SearchSidebar"));
const ControlsHelp = React.lazy(() => import('./components/ControlsHelp'));
const CameraDistanceRelay = React.lazy(() => import('./components/CameraDistanceRelay'));
import AltitudeLegend from "./components/AltitudeLegend";
const ScaleDistance = React.lazy(() => import('./components/ScaleDistance'));

const sunDirection = new THREE.Vector3(-2, 0.5, 1.5);

const CAMERA_MAX_DISTANCE = 20;

// Convert 3D coordinates to latitude/longitude
function vector3ToLatLon(localVector) {
  const v = localVector.clone().normalize();
  const lat = Math.asin(v.y) * 180 / Math.PI;
  const thetaDeg = Math.atan2(v.z, v.x) * 180 / Math.PI;
  let lon = 180 - thetaDeg;
  lon = ((lon + 180) % 360 + 360) % 360 - 180;
  return {
    lat: Math.max(-90, Math.min(90, lat)),
    lon: Math.max(-180, Math.min(180, lon))
  };
}

function Earth({ stylized = false, onHover, onHoverOut, trackerProps = {}, earthRef: externalEarthRef = null, initialRotation = 0 }) {
  const internalRef = React.useRef();
  const ref = externalEarthRef ?? internalRef;
  // A day in seconds
  const SIDEREAL_DAY = 86164;
  const axialTilt = 23.4 * Math.PI / 180;

  const sunDir = React.useMemo(() => new THREE.Vector3(1, 0, 0), []);

  // Handle pointer events for coordinates
  const handlePointerMove = React.useCallback((event) => {
    const intersections = event.intersections;
    if (!intersections || intersections.length === 0) return;
    const intersection = intersections[0];
    const worldPoint = intersection.point.clone();
    const localPoint = ref.current ? ref.current.worldToLocal(worldPoint.clone()) : worldPoint;
    const coords = vector3ToLatLon(localPoint);
    onHover(coords, event.clientX, event.clientY);
  }, [onHover]);

  const handlePointerOut = React.useCallback(() => {
    if (onHoverOut) onHoverOut();
  }, [onHoverOut]);

  useFrame(() => {
    // Get current UTC time in seconds
    const now = new Date();
    const utcHours = now.getUTCHours();
    const utcMinutes = now.getUTCMinutes();
    const utcSeconds = now.getUTCSeconds();
    const utcMilliseconds = now.getUTCMilliseconds();
    const totalSeconds = utcHours * 3600 + utcMinutes * 60 + utcSeconds + utcMilliseconds / 1000;
    const rotationY = (totalSeconds / SIDEREAL_DAY) * Math.PI * 2;
    if (ref.current) {
      ref.current.rotation.y = initialRotation + rotationY;
    }
  });
  return (
    <group rotation-z={axialTilt}>
      <mesh 
  ref={ref}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <icosahedronGeometry args={[2, 64]} />
        {stylized ? (
          <StylizedEarthMaterial sunDirection={sunDir} />
        ) : (
          <EarthMaterial sunDirection={sunDir} />
        )}
        <AtmosphereMesh stylized={stylized} />
      </mesh>
  {stylized && <CountryBorders visible={true} earthRef={ref} />}

      {stylized && (
        <>
          <React.Suspense fallback={null}>
            <SimpleFlightTracker
                {...trackerProps}
                earthRef={ref}
              />
          </React.Suspense>
          
        </>
      )}
    </group>
  );
}

function App() {
  const [sunDir, setSunDir] = React.useState(new THREE.Vector3(1, 0, 0));
  const [stylized, setStylized] = React.useState(false);
  const [flipLongitude, setFlipLongitude] = React.useState(false);
  
  // Aircraft limit control
  const [maxAircraft, setMaxAircraft] = React.useState(500);
  // Filters and settings
  const [filterAirborne, setFilterAirborne] = React.useState(true);
  const [filterOnGround, setFilterOnGround] = React.useState(true);
  const [enableDeclutter, setEnableDeclutter] = React.useState(true);
  const [altMinFt, setAltMinFt] = React.useState(null);
  const [altMaxFt, setAltMaxFt] = React.useState(null);
  const [callsignFilter, setCallsignFilter] = React.useState('');
  const [icaoFilter, setIcaoFilter] = React.useState('');
  const [countryFilter, setCountryFilter] = React.useState('');
  const [sourceFilters, setSourceFilters] = React.useState({ ADSB: true, ASTERIX: true, MLAT: true, OTHER: true });
  // Current flight count
  const [currentFlightCount, setCurrentFlightCount] = React.useState(0);
  const [totalAvailableCount, setTotalAvailableCount] = React.useState(0);
  // Latest visible flights
  const flightsRef = React.useRef([]);
  const [visibleFlights, setVisibleFlights] = React.useState([]);
  // Aircraft sidebar state
  const [selectedAircraft, setSelectedAircraft] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = React.useState(false);
  const [controlsHelpOpen, setControlsHelpOpen] = React.useState(false);
  const [rightSidebarWidth, setRightSidebarWidth] = React.useState(0);

  const [sidebarWidth, setSidebarWidth] = React.useState(360);
  const runtimeToken = typeof window !== 'undefined' ? window.__OPENSKY_TOKEN__ : null;
  // Mobile/tablet layouts
  const [viewportWidth, setViewportWidth] = React.useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1920));
  const isCompactLayout = viewportWidth <= 1024;
  const isMobileViewport = viewportWidth <= 640;
  const rightSidebarOffset = React.useMemo(() => {
    if (isCompactLayout || !rightSidebarOpen) return 0;
    return Math.max(rightSidebarWidth - 8, 0);
  }, [isCompactLayout, rightSidebarOpen, rightSidebarWidth]);
  
  // Coordinate tooltip state
  const [tooltipData, setTooltipData] = React.useState(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });  
  // Clock display mode
  const [clockMode, setClockMode] = React.useState('UTC'); // 'UTC' | 'LOCAL'
  const [timeOffsetMs, setTimeOffsetMs] = React.useState(0);
  const [clockText, setClockText] = React.useState(() => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;
  });
  const localTimeZoneLabel = React.useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz ? tz : 'Local';
    } catch (e) {
      return 'Local';
    }
  }, []);
  // Clock visibility
  const [clockVisible, setClockVisible] = React.useState(true);
  const hideTimerRef = React.useRef(null);

  const [cameraNm, setCameraNm] = React.useState(null);
  window.setSunDir = setSunDir;

  const pressedKeysRef = React.useRef(new Set());

  // Add keyboard event listeners for both immediate actions and movement keys
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      const k = event.key;
      const kl = k.toLowerCase();
      if (['w','a','s','d','q','e'].includes(kl)) {
        try {
          const ae = document.activeElement;
          if (ae) {
            const tag = (ae.tagName || '').toUpperCase();
            const isEditable = ae.isContentEditable;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) {
              return;
            }
          }
        } catch (e) {}
        event.preventDefault();
        pressedKeysRef.current.add(kl);
        return;
      }
      if (k === 'Tab') {
        event.preventDefault();
        setStylized(prev => !prev);
      } else if (event.shiftKey && event.code === 'Digit1') {
        event.preventDefault();
        setMaxAircraft(100);
      } else if (event.shiftKey && event.code === 'Digit2') {
        event.preventDefault();
        setMaxAircraft(200);
      } else if (event.shiftKey && event.code === 'Digit3') {
        event.preventDefault();
        setMaxAircraft(500);
      } else if (event.shiftKey && event.code === 'Digit4') {
        event.preventDefault();
        setMaxAircraft(null); // All
      } else if (k === 'l' || k === 'L') {
        event.preventDefault();
        setFlipLongitude(prev => !prev);
      } else if (k === 'r' || k === 'R') {
        event.preventDefault();
        if (controlsRef.current && typeof controlsRef.current.reset === 'function') {
          controlsRef.current.reset();
          controlsRef.current.update();
        }
      }
    };

    const handleKeyUp = (event) => {
      const kl = event.key.toLowerCase();
      if (['w','a','s','d','q','e'].includes(kl)) {
        try {
          const ae = document.activeElement;
          if (ae) {
            const tag = (ae.tagName || '').toUpperCase();
            const isEditable = ae.isContentEditable;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || isEditable) {
              return;
            }
          }
        } catch (e) {}
        event.preventDefault();
        pressedKeysRef.current.delete(kl);
      }
    };

    const handleBlur = () => {
      pressedKeysRef.current.clear();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const controlsRef = React.useRef(null);
  const earthRef = React.useRef(null);
  const clockRef = React.useRef(null);
  const timeRef = React.useRef(null);

  // Save initial controls state
  React.useEffect(() => {
    if (controlsRef.current && typeof controlsRef.current.saveState === 'function') {
      controlsRef.current.saveState();
    }
  }, []);

  React.useEffect(() => {
    let rafId = null;
    function measure() {
      try {
        const el = document.querySelector('.aircraft-sidebar');
        if (el) {
          const rect = el.getBoundingClientRect();
          const w = Math.max(0, Math.min(rect.width || 300, window.innerWidth));
          const rounded = Math.round(w);
          setSidebarWidth(rounded);
          document.documentElement.style.setProperty('--aircraft-sidebar-width', `${rounded}px`);
        }
      } catch (e) {}
    }
    function scheduleMeasure() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    }
    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure);
    return () => {
      window.removeEventListener('resize', scheduleMeasure);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  React.useEffect(() => {
    let rafId = null;
    function measure() {
      try {
        const el = document.querySelector('.search-sidebar');
        if (el) {
          const rect = el.getBoundingClientRect();
          const w = Math.max(0, Math.min((rect.width || 320), window.innerWidth));
          const rounded = Math.round(w);
          setRightSidebarWidth(rounded);
          document.documentElement.style.setProperty('--search-sidebar-width', `${rounded}px`);
        }
      } catch (e) {}
    }
    function scheduleMeasure() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measure);
    }
    scheduleMeasure();
    window.addEventListener('resize', scheduleMeasure);
    return () => {
      window.removeEventListener('resize', scheduleMeasure);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [rightSidebarOpen]);

  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Collapse the dedicated aircraft sidebar when switching into compact layout
  React.useEffect(() => {
    if (isCompactLayout) {
      setSidebarOpen(false);
    }
  }, [isCompactLayout]);

  // Ensure the right sidebar opens automatically when a flight is selected on compact layout
  React.useEffect(() => {
    if (isCompactLayout && selectedAircraft) {
      setRightSidebarOpen(true);
    }
  }, [isCompactLayout, selectedAircraft]);

  // Handle coordinate tooltip
  const handleEarthHover = React.useCallback((coords, clientX, clientY) => {
    setTooltipData(coords);
    setMousePosition({ x: clientX, y: clientY });
  }, []);

  const handleEarthHoverOut = React.useCallback(() => {
    setTooltipData(null);
  }, []);

  const leftOverlayShift = sidebarOpen ? sidebarWidth + 20 : 0;
  const leftOverlayTransform = `translateX(${leftOverlayShift}px)`;

  // Handle aircraft click
  const handleAircraftClick = React.useCallback((aircraft, event) => {
    // Toggle selection
    setSelectedAircraft(prev => {
      if (prev && aircraft && prev.id === aircraft.id) {
        setSidebarOpen(true);
        return null;
      }
      if (isCompactLayout) {
        setRightSidebarOpen(true);
      } else {
        setSidebarOpen(true);
      }
      return aircraft;
    });
  }, [isCompactLayout]);

  const updateClock = React.useCallback(() => {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date(Date.now() + (clockMode === 'LOCAL' ? timeOffsetMs : 0));
    let hh;
    let mm;
    let ss;
    if (clockMode === 'UTC') {
      hh = pad(now.getUTCHours());
      mm = pad(now.getUTCMinutes());
      ss = pad(now.getUTCSeconds());
    } else {
      hh = pad(now.getHours());
      mm = pad(now.getMinutes());
      ss = pad(now.getSeconds());
    }
    setClockText(`${hh}:${mm}:${ss}`);
  }, [clockMode, timeOffsetMs]);

  // Tick the clock every second
  React.useEffect(() => {
    updateClock();
    const t = setInterval(updateClock, 1000);
    return () => clearInterval(t);
  }, [updateClock]);

  // Periodically sync local time
  React.useEffect(() => {
    if (clockMode !== 'LOCAL') {
      setTimeOffsetMs(0);
      return undefined;
    }

    let isCancelled = false;
    let intervalId = null;

    const syncTime = async () => {
      try {
        const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const response = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC', {
          cache: 'no-store',
          headers: { 'Accept': 'application/json' }
        });
        const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (!response.ok) throw new Error(`Time API responded ${response.status}`);
        const data = await response.json();
        let serverMs = null;
        if (typeof data.unixtime === 'number') {
          serverMs = data.unixtime * 1000;
        } else if (typeof data.utc_datetime === 'string') {
          serverMs = Date.parse(data.utc_datetime);
        } else if (typeof data.datetime === 'string') {
          serverMs = Date.parse(data.datetime);
        }
        if (serverMs == null || Number.isNaN(serverMs)) throw new Error('Invalid time payload');
        const rtt = end - start;
        const estimatedServerNow = serverMs + rtt / 2;
        const offset = estimatedServerNow - Date.now();
        if (!isCancelled) {
          setTimeOffsetMs(offset);
        }
      } catch (err) {
        console.warn('Clock sync failed:', err);
      }
    };

    syncTime();
    intervalId = window.setInterval(syncTime, 5 * 60 * 1000);

    return () => {
      isCancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [clockMode]);

  React.useEffect(() => {
    hideTimerRef.current = setTimeout(() => setClockVisible(false), 3000);

    function handleMouseMove(e) {
      const el = clockRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (inside) {
        if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
        setClockVisible(true);
      } else {
        if (!hideTimerRef.current) {
          hideTimerRef.current = setTimeout(() => { setClockVisible(false); hideTimerRef.current = null; }, 3000);
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove);
    const measure = async () => {
      try {
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
      } catch (e) {}
      if (!timeRef.current || !clockRef.current) return;
      const rect = timeRef.current.getBoundingClientRect();
      clockRef.current.style.width = Math.ceil(rect.width + 6) + 'px';
    };
    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', measure);
      if (hideTimerRef.current) { clearTimeout(hideTimerRef.current); hideTimerRef.current = null; }
    };
  }, []);

  React.useEffect(() => {
    if (!clockRef.current || !timeRef.current) return;
    const rect = timeRef.current.getBoundingClientRect();
    if (!rect) return;
    clockRef.current.style.width = `${Math.ceil((rect.width || 0) + 6)}px`;
  }, [clockText, clockMode]);

  // Close popup handler
  const handleClosePopup = React.useCallback(() => {
    setSelectedAircraft(null);
    setSidebarOpen(false);
  }, []);

  function KeyControls() {
    useFrame(() => {
      const keys = pressedKeysRef.current;
      if (!controlsRef.current || !controlsRef.current.object) return;
      const cam = controlsRef.current.object;
      const target = controlsRef.current.target || new THREE.Vector3(0,0,0);
      const pos = cam.position.clone().sub(target);
      let moved = false;
      const rot = 0.02;
      const zoomOutFactor = 1.01;
      const zoomInFactor = 0.99;
      if (keys.has('a')) {
        // Rotate left (A)
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -rot);
        pos.applyQuaternion(q);
        moved = true;
      }
      if (keys.has('d')) {
        // Rotate right (D)
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), rot);
        pos.applyQuaternion(q);
        moved = true;
      }
      if (keys.has('w')) {
        // Tilt up (W)
        const dir = pos.clone().normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), dir).normalize();
        const q = new THREE.Quaternion().setFromAxisAngle(right, -rot);
        pos.applyQuaternion(q);
        moved = true;
      }
      if (keys.has('s')) {
        // Tilt down (S)
        const dir = pos.clone().normalize();
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), dir).normalize();
        const q = new THREE.Quaternion().setFromAxisAngle(right, rot);
        pos.applyQuaternion(q);
        moved = true;
      }
      if (keys.has('q')) {
        pos.multiplyScalar(zoomOutFactor);
        moved = true;
      }
      if (keys.has('e')) {
        pos.multiplyScalar(zoomInFactor);
        moved = true;
      }
      if (moved) {
        // Clamp polar angle to avoid flipping at the poles
        const sph = new THREE.Spherical().setFromVector3(pos);
        const MIN_POLAR = 0.15; // ~8.6 degrees
        const MAX_POLAR = Math.PI - 0.15;
        sph.phi = Math.max(MIN_POLAR, Math.min(MAX_POLAR, sph.phi));
        pos.setFromSpherical(sph);

        const d = pos.length();
        const min = controlsRef.current.minDistance ?? 0.1;
        const max = controlsRef.current.maxDistance ?? CAMERA_MAX_DISTANCE;
        if (d > max) pos.setLength(max);
        if (d < min) pos.setLength(min);

        cam.position.copy(pos.add(target));
        cam.lookAt(target);
        cam.updateProjectionMatrix && cam.updateProjectionMatrix();
        controlsRef.current.update();
      }
    });
    return null;
  }
  
  return (
    <>
      <Canvas 
        camera={{ position: [0, 0.2, 5.5]}}
        dpr={[1, Math.min(2, window.devicePixelRatio || 1)]}
        gl={{ 
          toneMapping: THREE.NoToneMapping,
          antialias: false,
          powerPreference: 'high-performance'
        }}>
        <React.Suspense fallback={null}>
          <Earth 
            stylized={stylized}
            onHover={handleEarthHover}
            onHoverOut={handleEarthHoverOut}
            earthRef={earthRef}
            initialRotation={-Math.PI / 6}
            trackerProps={{
              enabled: stylized,
              maxAircraft,
              onFlightCountChange: setCurrentFlightCount,
              onAircraftClick: handleAircraftClick,
              flipLongitude,
              selectedAircraftId: selectedAircraft ? selectedAircraft.id : null,
              trackerToken: runtimeToken,
              filterAirborne,
              filterOnGround,
              enableDeclutter,
              altMinFt,
              altMaxFt,
              callsignFilter,
              icaoFilter,
              countryFilter,
              sourceFilters,
              onTotalAvailableChange: setTotalAvailableCount,
              onFlightsUpdate: (flights) => { flightsRef.current = flights; setVisibleFlights(flights); }
            }}
          />
  </React.Suspense>
        <hemisphereLight args={[0xffffff, 0x000000, 3.0]} />
        <directionalLight position={[sunDir.x, sunDir.y, sunDir.z]} />
        <React.Suspense fallback={null}>
          <Starfield />
        </React.Suspense>
        <OrbitControls 
          ref={controlsRef}
          minDistance={2.2} 
          maxDistance={CAMERA_MAX_DISTANCE}
          enablePan={false}
        />
        <React.Suspense fallback={null}>
          <CameraDistanceRelay onChange={setCameraNm} />
        </React.Suspense>
        <KeyControls />
      </Canvas>

      {!isCompactLayout && (
        <>
          <AltitudeLegend />

          <React.Suspense fallback={null}>
            <div
              style={{
                position: 'fixed',
                bottom: 25,
                left: 20,
                zIndex: 100000,
                pointerEvents: 'none',
                transform: leftOverlayTransform,
                transition: 'transform 260ms cubic-bezier(.2,.9,.2,1)',
                willChange: 'transform'
              }}
            >
              <div style={{ pointerEvents: 'auto' }}>
                <ScaleDistance nm={cameraNm} inline={true} />
              </div>
            </div>
          </React.Suspense>
        </>
      )}

      {/* Sidebar toggle button */}
      <button
        onClick={() => {
          setSidebarOpen(prev => {
            const next = !prev;
            if (!next) handleClosePopup();
            return next;
          });
        }}
        aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        className={`sidebar-toggle ${sidebarOpen ? 'open' : ''}`}
        style={isCompactLayout ? { display: 'none' } : undefined}
      >
        <svg className="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M6 6 L14 12 L6 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Coordinate tooltip */}
      {tooltipData && (
        <div
          style={{
            position: 'fixed',
            left: 20,
            bottom: isMobileViewport ? 25 : 48,
            zIndex: 100000,
            pointerEvents: 'none',
            transform: leftOverlayTransform,
            transition: 'transform 260ms cubic-bezier(.2,.9,.2,1)',
            willChange: 'transform'
          }}
        >
          <div
            style={{
              pointerEvents: 'none',
              background: 'transparent',
              color: '#e6ecef',
              padding: isMobileViewport ? '3px 8px' : '4px 10px',
              borderRadius: 6,
              border: 'none',
              fontFamily:
                'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
              fontSize: isMobileViewport ? '0.75rem' : '1rem',
              letterSpacing: isMobileViewport ? '0.45px' : '0.55px',
              fontWeight: 700,
              boxShadow: 'none',
              backdropFilter: 'blur(1px)',
              userSelect: 'none',
              cursor: 'default'
            }}
          >
            {`${tooltipData.lat.toFixed(5)}°, ${tooltipData.lon.toFixed(5)}°`}
          </div>
        </div>
      )}

      {/* UTC Clock */}
      <div style={{
        position: 'fixed',
        top: 12,
        left: 12,
        zIndex: 100000,
        pointerEvents: 'none',
        transform: sidebarOpen ? `translateX(${sidebarWidth + 8}px)` : 'translateX(0)',
        transition: 'transform 260ms cubic-bezier(.2,.9,.2,1)',
        willChange: 'transform'
      }}>
        <div ref={clockRef}
          style={{
            pointerEvents: 'none',
            background: 'transparent',
            color: '#ffffff',
            padding: isMobileViewport ? '6px 8px' : '8px 12px',
            borderRadius: 8,
            border: 'none',
            fontFamily: 'Orbitron, "Roboto", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            fontSize: isMobileViewport ? '1.05rem' : '1.4rem',
            letterSpacing: isMobileViewport ? '1.2px' : '2px',
            fontWeight: 700,
            textShadow: '0 0 6px rgba(255,255,255,0.12)',
            boxShadow: 'none',
            backdropFilter: 'none',
            userSelect: 'none',
            cursor: 'default',
            transition: 'opacity 300ms ease, transform 160ms ease',
            opacity: clockVisible ? 1 : 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
          <div ref={timeRef} style={{ lineHeight: 1, display: 'block' }}>{clockText}</div>
          <div
            style={{ fontSize: isMobileViewport ? '0.7rem' : '0.85rem', marginTop: isMobileViewport ? '3px' : '4px', opacity: 0.92, justifySelf: 'center', letterSpacing: isMobileViewport ? '0.6px' : '0.8px' }}
            title={clockMode === 'UTC' ? 'Coordinated Universal Time' : localTimeZoneLabel}
          >
            {clockMode === 'UTC' ? 'UTC' : 'LOCAL'}
          </div>
        </div>
      </div>

      {!isCompactLayout && (
        <button
          onClick={() => setControlsHelpOpen(prev => !prev)}
          aria-label={controlsHelpOpen ? 'Hide controls' : 'Show controls'}
          title={controlsHelpOpen ? 'Hide controls' : 'Show controls'}
          className={`controls-button right ${controlsHelpOpen ? 'open' : ''}`}
          style={{ transform: `translateX(-${rightSidebarOffset}px)` }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>
      )}
      {(!isCompactLayout || !rightSidebarOpen) && (
        <button
          onClick={() => setRightSidebarOpen(prev => !prev)}
          aria-label={rightSidebarOpen ? 'Close controls' : 'Open controls'}
          title={rightSidebarOpen ? 'Close controls' : 'Open controls'}
          className={`sidebar-toggle right ${rightSidebarOpen ? 'open' : ''}`}
          style={!isCompactLayout ? { transform: `translateY(-50%) translateX(-${rightSidebarOffset}px)` } : undefined}
        >
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6 L14 12 L6 18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <React.Suspense fallback={null}>
        <ControlsHelp
          open={controlsHelpOpen}
          onClose={() => setControlsHelpOpen(false)}
          rightSidebarOpen={rightSidebarOpen}
          isCompactLayout={isCompactLayout}
          rightSidebarOffset={rightSidebarOffset}
        />
      </React.Suspense>

      <React.Suspense fallback={null}>
        <SearchSidebar
          open={rightSidebarOpen}
          onClose={() => setRightSidebarOpen(false)}
          maxAircraft={maxAircraft}
          currentFlightCount={currentFlightCount}
          stylized={stylized}
          onToggleStylized={() => setStylized(s => !s)}
          onSetMaxAircraft={(v) => setMaxAircraft(v)}
          onSearch={(q) => {
            if (!q) return;
            const lower = q.toLowerCase();
            const list = flightsRef.current || [];
            const match = list.find(f =>
              (f.callsign && f.callsign.toLowerCase().includes(lower)) ||
              (f.icao24 && f.icao24.toLowerCase() === lower)
            );
            if (match) {
              setSelectedAircraft(match);
              if (isCompactLayout) {
                setRightSidebarOpen(true);
              } else {
                setSidebarOpen(true);
              }
              console.log('Search matched flight:', match.callsign || match.icao24);
            } else {
              console.log('No matching flight for query:', q);
            }
          }}
          flights={visibleFlights}
          onSelectFlight={(flight) => {
            if (!flight) return;
            setSelectedAircraft(flight);
            if (isCompactLayout) {
              setRightSidebarOpen(true);
            } else {
              setSidebarOpen(true);
            }
          }}
          filterAirborne={filterAirborne}
          filterOnGround={filterOnGround}
          onSetFilterAirborne={setFilterAirborne}
          onSetFilterOnGround={setFilterOnGround}
          enableDeclutter={enableDeclutter}
          onToggleDeclutter={() => setEnableDeclutter(v => !v)}
          onRefresh={() => window.dispatchEvent(new Event('refreshFlights'))}
          flipLongitude={flipLongitude}
          onToggleFlipLongitude={() => setFlipLongitude(v => !v)}
          totalAvailableCount={totalAvailableCount}
          clockMode={clockMode}
          onSetClockMode={(mode) => {
            const normalized = mode === 'LOCAL' ? 'LOCAL' : 'UTC';
            setClockMode(prev => (prev === normalized ? prev : normalized));
          }}
          altMinFt={altMinFt}
          altMaxFt={altMaxFt}
          callsignFilter={callsignFilter}
          onSetCallsignFilter={setCallsignFilter}
          icaoFilter={icaoFilter}
          onSetIcaoFilter={setIcaoFilter}
          countryFilter={countryFilter}
          onSetCountryFilter={setCountryFilter}
          onSetAltMinFt={setAltMinFt}
          onSetAltMaxFt={setAltMaxFt}
          sourceFilters={sourceFilters}
          onToggleSource={(key) => setSourceFilters(prev => ({ ...prev, [key]: !prev[key] }))}
          isCompactLayout={isCompactLayout}
          selectedFlight={selectedAircraft}
          onClearSelected={() => {
            setSelectedAircraft(null);
          }}
          cameraNm={cameraNm}
          controlsHelpOpen={controlsHelpOpen}
          onToggleControlsHelp={() => setControlsHelpOpen(prev => !prev)}
        />
      </React.Suspense>

      {/* Aircraft Sidebar */}
      {!isCompactLayout && (
        <React.Suspense fallback={null}>
          <AircraftPopup
            aircraft={selectedAircraft}
            onClose={handleClosePopup}
            open={sidebarOpen}
          />
        </React.Suspense>
      )}
    </>
  );
}

export default App;