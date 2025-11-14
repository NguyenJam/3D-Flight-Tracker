import * as THREE from "three";
import React from "react";
import { useLoader } from "@react-three/fiber";

const StylizedEarthMaterial = React.forwardRef(({ sunDirection }, ref) => {
  // Load textures
  const dayTexture = useLoader(THREE.TextureLoader, "/textures/earth_daymap.jpg");
  const gradientTexture = useLoader(THREE.TextureLoader, "/rad-grad.png");

  // Configure textures
  React.useEffect(() => {
    dayTexture.wrapS = dayTexture.wrapT = THREE.RepeatWrapping;
    dayTexture.anisotropy = 16;
    
    // Configure gradient texture for toon shading
    gradientTexture.minFilter = THREE.NearestFilter;
    gradientTexture.magFilter = THREE.NearestFilter;
    gradientTexture.wrapS = gradientTexture.wrapT = THREE.ClampToEdgeWrapping;
  }, [dayTexture, gradientTexture]);

  // Create shader material with toon shading
  const material = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        dayTexture: { value: dayTexture },
        gradientTexture: { value: gradientTexture },
        sunDirection: { value: sunDirection || new THREE.Vector3(1, 0, 0) },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vUv = uv;
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D dayTexture;
        uniform sampler2D gradientTexture;
        uniform vec3 sunDirection;
        uniform float time;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 lightDir = normalize(sunDirection);
          
          // Calculate lighting
          float NdotL = dot(normal, lightDir);
          
          // Toon shading with multiple light levels
          float lightIntensity = max(0.0, NdotL);
          
          // Quantize lighting into discrete bands using gradient texture
          float gradientU = lightIntensity * 0.8 + 0.1; // Map to gradient range
          vec3 toonColor = texture2D(gradientTexture, vec2(gradientU, 0.5)).rgb;
          
          // Sample day texture
          vec3 earthColor = texture2D(dayTexture, vUv).rgb;
          
          // Apply stylized coloring
          vec3 stylizedColor = earthColor * toonColor;
          
          // Add rim lighting for cartoon effect
          float rimIntensity = 1.0 - max(0.0, dot(normal, normalize(cameraPosition - vWorldPosition)));
          rimIntensity = pow(rimIntensity, 2.0);
          vec3 rimColor = vec3(0.3, 0.6, 1.0) * rimIntensity * 0.3;
          
          // Night side glow
          float nightSide = 1.0 - max(0.0, NdotL);
          vec3 nightGlow = vec3(0.1, 0.2, 0.4) * nightSide * 0.2;
          
          gl_FragColor = vec4(stylizedColor + rimColor + nightGlow, 1.0);
        }
      `,
      side: THREE.FrontSide,
    });
  }, [dayTexture, gradientTexture]);

  React.useEffect(() => {
    if (material && sunDirection) {
      material.uniforms.sunDirection.value.copy(sunDirection);
    }
  }, [material, sunDirection]);

  React.useImperativeHandle(ref, () => material, [material]);

  return <primitive object={material} attach="material" />;
});

StylizedEarthMaterial.displayName = "StylizedEarthMaterial";

export default StylizedEarthMaterial;