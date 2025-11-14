import * as THREE from "three";
import React, { useMemo, useEffect, useState } from "react";
import { useFrame } from "@react-three/fiber";

// Convert longitude/latitude to 3D coordinates
function latLonToVector3(lat, lon, radius = 2.003) {
  lat = Math.max(-90, Math.min(90, lat));
  
  // Convert to radians
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (-lon + 180) * (Math.PI / 180);
  
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
}

// Create line geometry from coordinate arrays
function createBorderGeometry(coordinates, radius = 2.003) {
  const points = [];
  
  // Handle different GeoJSON geometry types
  function processCoordinateRing(ring) {
    if (!Array.isArray(ring) || ring.length < 3) return; // Need at least 3 points for a valid ring
    
    // Convert coordinates to 3D points and create connected line segments
    const ringPoints = [];
    
    for (let i = 0; i < ring.length; i++) {
      const coord = ring[i];
      if (coord.length >= 2) {
        // GeoJSON format
        const lon = coord[0];
        const lat = coord[1];
        
        // Skip invalid coordinates
        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
          continue;
        }
        
        const point = latLonToVector3(lat, lon, radius);
        ringPoints.push(point);
      }
    }
    
    for (let i = 0; i < ringPoints.length - 1; i++) {
      const point1 = ringPoints[i];
      const point2 = ringPoints[i + 1];
      
      const distance = point1.distanceTo(point2);
      if (distance < 1.0 && distance > 0.001) {
        points.push(point1, point2);
      }
    }
  }
  
  function processCoordinates(coords) {
    if (Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
      coords.forEach(ring => {
        if (Array.isArray(ring[0]) && typeof ring[0][0] === 'number') {
          processCoordinateRing(ring);
        } else {
          processCoordinates(ring);
        }
      });
    } else if (Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
      processCoordinateRing(coords);
    }
  }
  
  processCoordinates(coordinates);
  
  if (points.length === 0) return null;
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  return geometry;
}

const CountryBorders = ({ visible = true, earthRef }) => {
  const [geoData, setGeoData] = useState(null);
  const [borderGeometries, setBorderGeometries] = useState([]);
  const groupRef = React.useRef();
  
  // Sync rotation with Earth
  useFrame(() => {
    if (earthRef?.current && groupRef.current) {
      groupRef.current.rotation.y = earthRef.current.rotation.y;
    }
  });
  
  // Load GeoJSON data
  useEffect(() => {
    const loadGeoData = async () => {
      const paths = ['/countries.geojson'];
      for (const p of paths) {
        try {
          const response = await fetch(p);
          if (!response.ok) {
            console.warn(`Failed to fetch ${p}: ${response.status}`);
            continue;
          }
          const data = await response.json();
          console.log('Loaded GeoJSON data from', p, data.features?.length, 'features');
          setGeoData(data);
          return;
        } catch (error) {
          console.warn(`Error fetching ${p}:`, error);
        }
      }
      console.error('Failed to load countries.geojson from any known path');
    };
    
    loadGeoData();
  }, []);
  
  // Process GeoJSON data into line geometries
  const processedBorders = useMemo(() => {
    if (!geoData || !visible) return [];
    
    const geometries = [];
    let totalPoints = 0;
    
    geoData.features?.forEach((feature, index) => {
      if (!feature.geometry) return;
      if (feature.properties && feature.properties.SCALERANK > 6) return;
      
      const { type, coordinates } = feature.geometry;
      
      try {
        let geometry = null;
        
        switch (type) {
          case 'Polygon':
            geometry = createBorderGeometry(coordinates);
            break;
          case 'MultiPolygon':
            // Create separate geometries for each polygon
            coordinates.forEach(polygon => {
              const polyGeometry = createBorderGeometry(polygon);
              if (polyGeometry) {
                geometries.push({
                  geometry: polyGeometry,
                  key: `${index}-${geometries.length}`
                });
              }
            });
            break;
          default:
            console.warn(`Unsupported geometry type: ${type}`);
        }
        
        if (geometry) {
          geometries.push({
            geometry,
            key: `${index}`
          });
          totalPoints += geometry.attributes.position.count;
        }
      } catch (error) {
        console.warn(`Error processing feature ${index}:`, error);
      }
    });
    
    console.log(`Processed ${geometries.length} countries with ${totalPoints} total points`);
    return geometries;
  }, [geoData, visible]);
  
  // Create line material
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: 0x444466,
      transparent: true,
      opacity: 0.7,
      linewidth: 1,
      depthTest: true,
      depthWrite: false
    });
  }, []);
  
  if (!visible || processedBorders.length === 0) {
    return null;
  }
  
  return (
    <group ref={groupRef}>
      {processedBorders.map(({ geometry, key }) => (
        <lineSegments key={key}>
          <primitive object={geometry} attach="geometry" />
          <primitive object={lineMaterial} attach="material" />
        </lineSegments>
      ))}
    </group>
  );
};

export default CountryBorders;