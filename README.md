# 3D Flight Tracker

[![Stack](https://img.shields.io/badge/stack-React%20%7C%20Three.js%20%7C%20Vite-lightgrey)](https://threejs.org/)
[![Status](https://img.shields.io/badge/status-experimental-yellow)]()

> [!NOTE]
> **Project Info:** This is a personal/demo project that visualizes live air traffic on a 3D globe using browser-based WebGL.

**3D Flight Tracker is an interactive visualization of real-world flights on a 3D globe.** It uses React, React Three Fiber, and Three.js to render aircraft in real time from the OpenSky Network API.

## Features

- **Live flight data** pulled from the OpenSky Network API
- **3D globe visualization** using Three.js and React Three Fiber
- **Altitude-based coloring** for flight levels
- **Interactive camera controls** (orbit, zoom, pan)
- **Search & filters** (callsign, ICAO hex, country, altitude, and status)
- **Source filters** (ADS-B, ASTERIX, MLAT, other)
- **On-screen stats** showing total and visible aircraft

## Getting Started

Prerequisites:

- Node.js (LTS recommended)
- npm (or pnpm / yarn)

Install and run:

```powershell
npm install
npm run dev
```

Build and preview:

```powershell
npm run build
npm run preview
```

## How It Works (Brief)

- `SimpleFlightTracker` fetches and filters live flight data.
- Globe meshes render Earth, atmosphere, starfield, and country borders.
- Sidebars handle search, filters, settings, and flight details.

## API & Data Sources

- OpenSky states API (proxied): `/opensky/api/states/all`
- OpenSky OAuth2 token: `https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token`
- WorldTime API: `https://worldtimeapi.org/api/timezone/Etc/UTC`
- Country borders GeoJSON: `/countries.geojson` (`Natural Earth` – https://github.com/nvkelso/natural-earth-vector)