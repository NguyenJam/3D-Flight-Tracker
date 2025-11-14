import { useFrame, useThree } from '@react-three/fiber';
import React from 'react';

const EARTH_RADIUS_KM = 6371;
const SCENE_EARTH_RADIUS_UNITS = 2;
const KM_PER_UNIT = EARTH_RADIUS_KM / SCENE_EARTH_RADIUS_UNITS;
const KM_PER_NM = 1.852;

export default function CameraDistanceRelay({ onChange }) {
  const { camera } = useThree();
  useFrame(() => {
    if (!camera || typeof onChange !== 'function') return;
    const distUnits = camera.position.length();
    const distToSurfaceUnits = Math.max(0, distUnits - SCENE_EARTH_RADIUS_UNITS);
    const km = distToSurfaceUnits * KM_PER_UNIT;
    const nmVal = km / KM_PER_NM;
    onChange(nmVal);
  });

  return null;
}