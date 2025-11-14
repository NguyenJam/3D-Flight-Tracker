import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import React from "react";

function Starfield() {
  const milkyWayRef = React.useRef();

  // Create the milky way sphere
  const starSpheres = React.useMemo(() => {
    const loader = new THREE.TextureLoader();

    const milkyWayTexture = loader.load("./textures/stars_milky_way.jpg");

    // Create sphere geometry
    const geometry = new THREE.SphereGeometry(50, 32, 32);

    const milkyWayMaterial = new THREE.MeshBasicMaterial({
      map: milkyWayTexture,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85
    });

    const milkyWayMesh = new THREE.Mesh(geometry, milkyWayMaterial);
    milkyWayMesh.scale.setScalar(1.02);

    return { milkyWayMesh };
  }, []);

  useFrame(() => {
    if (milkyWayRef.current) {
      milkyWayRef.current.rotation.y -= 0.00008;
      milkyWayRef.current.rotation.z += 0.00003;
    }
  });

  return (
    <>
      <primitive object={starSpheres.milkyWayMesh} ref={milkyWayRef} />
    </>
  );
}

export default Starfield;