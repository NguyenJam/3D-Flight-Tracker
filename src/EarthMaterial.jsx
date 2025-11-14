import * as THREE from "three";
import React from "react";
import { useLoader } from "@react-three/fiber";

const defaultSunDirection = new THREE.Vector3(-2, 0.5, 1.5).normalize();

function getEarthMat() {
  const texturePaths = [
    "./textures/earth_daymap.jpg",
    "./textures/earth_nightmap.jpg",
    "./textures/earth_clouds.jpg",
    "./textures/earth_bump_map.jpg",
    "./textures/earth_normal_map.jpg",
    "./textures/earth_specular_map.jpg"
  ];
  const textures = useLoader(THREE.TextureLoader, texturePaths);
  textures.forEach(tex => {
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.anisotropy = 8;
  });
  const [map, nightMap, cloudsMap, bumpMap, normalMap, specularMap] = textures;

  const uniforms = {
    dayTexture: { value: map },
    nightTexture: { value: nightMap },
    cloudsTexture: { value: cloudsMap },
    bumpTexture: { value: bumpMap },
    normalTexture: { value: normalMap },
    specularTexture: { value: specularMap },
    sunDirection: { value: defaultSunDirection.clone() },
  };

  const vs = `
    varying vec2 vUv;
    varying vec3 vNormalWorld;
    varying vec3 vPositionWorld;
    uniform sampler2D elevTexture;

    void main() {
      // Position
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewMatrix * modelPosition;

      // Compute world-space normal (no scale/skew assumed)
      vec3 worldNormal = normalize(mat3(modelMatrix) * normal);

      // Varyings
      vUv = uv;
      vNormalWorld = worldNormal;
      vPositionWorld = modelPosition.xyz;
    }
  `;

  const fs = `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D cloudsTexture;
    uniform sampler2D bumpTexture;
    uniform sampler2D normalTexture;
    uniform sampler2D specularTexture;
    uniform vec3 sunDirection;

    varying vec2 vUv;
    varying vec3 vNormalWorld;
    varying vec3 vPositionWorld;

    void main() {
      vec3 viewDirection = normalize(vPositionWorld - cameraPosition);
      
      // Sample normal map and convert from [0,1] to [-1,1]
      vec3 normalMapSample = texture(normalTexture, vUv).rgb * 2.0 - 1.0;
      // Reduce normal map strength for a softer effect
      float normalStrength = 0.5; // Lower = softer
      vec3 normal = normalize(vNormalWorld + normalMapSample * normalStrength);
        
      vec3 color = vec3(0.0);

      // Sun orientation
      vec3 L = normalize(sunDirection);
      float sunOrientation = dot(L, normal);

      // Day / night color with smoother transition
      float dayMix = smoothstep(-0.1, 0.2, sunOrientation);
      vec3 dayColor = texture(dayTexture, vUv).rgb;
      vec3 nightColor = texture(nightTexture, vUv).rgb;
      
      // Use bump map as intended without artificial scaling
      float bumpValue = texture(bumpTexture, vUv).r;
      dayColor *= (1.0 + (bumpValue - 0.5) * 0.2);
      
      // Use night texture at full intensity
      color = mix(nightColor, dayColor, dayMix);

      // Specular cloud color
      vec2 specularCloudsColor = texture(cloudsTexture, vUv).rg;

      // Clouds using original texture values
      float cloudsMix = smoothstep(0.0, 1.0, specularCloudsColor.g);
      cloudsMix *= dayMix;
      color = mix(color, vec3(1.0), cloudsMix);

      // Enhanced specular reflection using specular map
  vec3 reflection = reflect(-L, normal);
      float specular = - dot(reflection, viewDirection);
      specular = max(specular, 0.0);
      specular = pow(specular, 2.0);
      
      // Use specular map to control specular intensity
      float specularMask = texture(specularTexture, vUv).r;
      specular *= specularMask * specularCloudsColor.r;
      color += specular * 0.15 * dayMix;
      
      // Final color
      gl_FragColor = vec4(color, 1.0);
    }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vs,
    fragmentShader: fs,
  });
  return material;
}

function EarthMaterial({ sunDirection }) {
  const material = React.useMemo(() => getEarthMat(), []);
  React.useEffect(() => {
    if (material && sunDirection) {
      material.uniforms.sunDirection.value.copy(sunDirection);
    }
  }, [material, sunDirection]);
  return <primitive object={material} />;
}

export default EarthMaterial;