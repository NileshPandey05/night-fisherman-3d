import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const lensingVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  void main() {
    vNormal = normal;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const lensingFragmentShader = `
  uniform float uTime;
  uniform float uMass;
  uniform float uLensingStrength;
  uniform float uDiskTilt;
  uniform vec3 uCameraPos;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;

  #define PI 3.14159265359

  // Hash and noise for star generation
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float starNoise(vec3 dir) {
    vec3 p = dir * 180.0;
    vec3 ip = floor(p);
    vec3 fp = fract(p);
    float h = hash(ip);
    if (h > 0.985) {
      float d = length(fp - 0.5);
      return smoothstep(0.18, 0.02, d) * (h - 0.985) * 60.0;
    }
    return 0.0;
  }

  void main() {
    vec3 rayDir = normalize(vWorldPosition - uCameraPos);
    vec3 bhPos = vec3(0.0, 0.0, 0.0);
    vec3 toBh = bhPos - uCameraPos;

    // Project ray onto plane through black hole perpendicular to viewing vector
    float dAlong = dot(toBh, rayDir);
    vec3 closestPoint = uCameraPos + rayDir * dAlong;
    float impactParam = length(closestPoint - bhPos);

    float rs = 1.0 * uMass;
    float rShadow = 2.598 * rs; // Apparent shadow radius

    // 1. Relativistic Deflection Function
    // Weak field: alpha ≈ 2 Rs / b; Strong field: diverges at photon sphere
    float deflFactor = 0.0;
    if (impactParam > rShadow * 0.98) {
      float excess = max(0.01, impactParam - rShadow);
      deflFactor = (rs * 2.2 / (impactParam + 0.5)) + (rs * 0.85 / (excess + 0.2));
      deflFactor *= uLensingStrength;
    }

    // Deflect ray direction away from black hole center
    vec3 radialDir = normalize(closestPoint - bhPos);
    vec3 deflectedRay = normalize(rayDir + radialDir * (deflFactor * 0.45));

    // 2. Procedural Deep-Space Nebula & Starfield
    float starBrightness = starNoise(deflectedRay);
    float fineStars = starNoise(deflectedRay * 2.2) * 0.6;
    vec3 starColor = vec3(0.9, 0.95, 1.0) * (starBrightness + fineStars);

    // Deep cosmic dust cloud / nebula background
    float nebulaA = sin(deflectedRay.x * 3.0 + uTime * 0.02) * cos(deflectedRay.y * 3.0);
    float nebulaB = cos(deflectedRay.z * 4.0) * sin(deflectedRay.x * 2.5);
    vec3 nebulaCol = mix(vec3(0.01, 0.02, 0.05), vec3(0.06, 0.02, 0.09), clamp(nebulaA * 0.5 + 0.5, 0.0, 1.0));
    nebulaCol += vec3(0.01, 0.04, 0.08) * clamp(nebulaB * 0.5 + 0.5, 0.0, 1.0);

    // 3. Secondary Lensed Accretion Disk Image (Arcing above and below the shadow)
    // Project deflected ray onto the tilted accretion disk plane
    float cosTilt = cos(uDiskTilt);
    float sinTilt = sin(uDiskTilt);
    vec3 diskNormal = vec3(0.0, cosTilt, sinTilt);

    float diskInter = 0.0;
    if (impactParam > rShadow && impactParam < rShadow * 4.2) {
      // Disk plane intersection proximity
      float planeDist = abs(dot(deflectedRay, diskNormal));
      float proximity = smoothstep(0.18, 0.01, planeDist);
      float radialMask = smoothstep(rShadow, rShadow + 0.8, impactParam) * smoothstep(rShadow * 4.2, rShadow * 2.5, impactParam);
      diskInter = proximity * radialMask * 0.75;
    }

    vec3 lensedDiskCol = vec3(1.0, 0.65, 0.15) * diskInter * 2.0;

    vec3 finalBg = nebulaCol + starColor + lensedDiskCol;

    gl_FragColor = vec4(finalBg, 1.0);
  }
`

export function GravitationalLensingBackdrop({
  mass = 1.0,
  lensingStrength = 1.0,
  diskTilt = 0.32,
  enabled = true
}) {
  const meshRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMass: { value: mass },
    uLensingStrength: { value: lensingStrength },
    uDiskTilt: { value: diskTilt },
    uCameraPos: { value: new THREE.Vector3(0, 4.5, 9.5) }
  }), [mass, lensingStrength, diskTilt])

  useFrame((state, delta) => {
    if (meshRef.current) {
      uniforms.uTime.value += delta
      uniforms.uMass.value = mass
      uniforms.uLensingStrength.value = lensingStrength
      uniforms.uDiskTilt.value = diskTilt
      uniforms.uCameraPos.value.copy(state.camera.position)
    }
  })

  if (!enabled) return null

  return (
    <mesh ref={meshRef}>
      {/* Large Inverted Celestial Sphere */}
      <sphereGeometry args={[75, 48, 48]} />
      <shaderMaterial
        vertexShader={lensingVertexShader}
        fragmentShader={lensingFragmentShader}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  )
}
