import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const diskParticleVertexShader = `
  uniform float uTime;
  uniform float uMass;
  uniform float uDriftSpeed;
  uniform float uDiskTilt;
  uniform float uDopplerStrength;
  uniform float uSizeScale;

  attribute float aInitialRadius;
  attribute float aInitialAngle;
  attribute float aHeightOffset;
  attribute float aDriftSeed;
  attribute float aSize;
  attribute float aTurbulence;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vRadius;

  #define PI 3.14159265359

  // Blackbody radiation color palette approximation
  vec3 getBlackbodyColor(float tempNorm) {
    // tempNorm in [0, 1]: 0 = cool crimson, 0.4 = amber/gold, 0.7 = yellow-white, 1.0 = blue-white
    vec3 cCool = vec3(0.85, 0.15, 0.05);   // Deep red / crimson
    vec3 cMid = vec3(1.0, 0.65, 0.12);     // Radiant gold / amber
    vec3 cWarm = vec3(1.0, 0.95, 0.75);    // White-hot
    vec3 cHot = vec3(0.55, 0.85, 1.0);     // Relativistic cyan / blue-white

    if (tempNorm < 0.35) {
      return mix(cCool, cMid, tempNorm / 0.35);
    } else if (tempNorm < 0.75) {
      return mix(cMid, cWarm, (tempNorm - 0.35) / 0.4);
    } else {
      return mix(cWarm, cHot, (tempNorm - 0.75) / 0.25);
    }
  }

  void main() {
    float rs = 1.0 * uMass;
    float rIsco = 3.0 * rs;
    float rMin = 1.0 * rs; // Event horizon
    float rMax = 16.0 * rs;
    float span = rMax - rIsco;

    // 1. Viscous inward radial migration
    // Total cycle time for a particle to spiral from rMax to rIsco
    float driftCycle = span / (uDriftSpeed * 0.45);
    float tShifted = mod(uTime + aDriftSeed * driftCycle, driftCycle);
    float rLinear = rMax - (tShifted / driftCycle) * span;

    // Relativistic plunge acceleration inside ISCO (r < rIsco)
    float r = rLinear;
    float plungeFactor = 0.0;
    if (rLinear <= rIsco + 0.2) {
      // Accelerate rapidly across the plunge zone towards Rs
      plungeFactor = clamp((rIsco - rLinear) / (rIsco - rMin), 0.0, 1.0);
      r = mix(rIsco, rMin, pow(plungeFactor, 1.8));
    }

    // 2. Relativistic Keplerian angular velocity Omega = sqrt(GM / r^3)
    // Angular velocity scales as r^(-1.5)
    float omega = sqrt(uMass / max(pow(r, 3.0), 0.05)) * 2.8;
    // Add subtle turbulence variation
    float angle = aInitialAngle + omega * uTime * (1.0 + aTurbulence * 0.08);

    // 3. Geometrically thin disk scale height h(r) / r ≈ 0.04
    float diskHeight = aHeightOffset * (0.035 * r + 0.04);

    // 3D position in disk plane
    vec3 diskPos = vec3(
      r * cos(angle),
      diskHeight,
      r * sin(angle)
    );

    // Rotate disk by inclination tilt
    float cosTilt = cos(uDiskTilt);
    float sinTilt = sin(uDiskTilt);
    vec3 tiltedPos = vec3(
      diskPos.x,
      diskPos.y * cosTilt - diskPos.z * sinTilt,
      diskPos.y * sinTilt + diskPos.z * cosTilt
    );

    // 4. Relativistic Doppler Beaming & Gravitational Redshift
    // Line-of-sight velocity: disk orbital velocity projected toward camera
    vec3 orbitalVelDir = vec3(-sin(angle), 0.0, cos(angle));
    vec3 cameraDir = normalize(cameraPosition - tiltedPos);
    float vLos = dot(orbitalVelDir, cameraDir); // [-1, 1]

    // Relativistic beta = v/c ≈ sqrt(Rs / (2r))
    float beta = clamp(sqrt(rs / (2.0 * max(r, rs))), 0.0, 0.72);
    // Relativistic Doppler factor delta = 1 / (gamma * (1 - beta * cosTheta))
    float gamma = 1.0 / sqrt(1.0 - beta * beta);
    float cosTheta = vLos;
    float deltaDoppler = 1.0 / (gamma * (1.0 - beta * cosTheta));
    float dopplerBoost = pow(clamp(deltaDoppler, 0.2, 4.0), 2.2);

    // Gravitational redshift factor sqrt(1 - Rs / r)
    float gravRedshift = clamp(sqrt(max(0.01, 1.0 - rs / r)), 0.1, 1.0);

    // 5. Shakura-Sunyaev / Novikov-Thorne Temperature Profile
    // T(r) ∝ r^(-3/4) * (1 - sqrt(rIsco / r))^(1/4)
    float rRatio = rIsco / max(r, rIsco);
    float boundaryStress = pow(max(0.01, 1.0 - sqrt(rRatio)), 0.25);
    float tempProfile = pow(rRatio, 0.75) * boundaryStress * 2.5;
    float tempNorm = clamp(tempProfile * gravRedshift, 0.0, 1.0);

    // Apply color and Doppler intensity modulation
    vec3 baseCol = getBlackbodyColor(tempNorm);
    vColor = baseCol * mix(1.0, dopplerBoost, uDopplerStrength * 0.75);

    // 6. Alpha attenuation at boundaries
    // Fade in smoothly at outer edge rMax, fade out completely at event horizon Rs
    float alphaIn = smoothstep(rMax, rMax - 1.2, r);
    float alphaOut = smoothstep(rMin, rMin + 0.35, r);
    vAlpha = alphaIn * alphaOut;

    vRadius = r;

    // Viewport position
    vec4 mvPosition = modelViewMatrix * vec4(tiltedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Size attenuation with distance
    gl_PointSize = (aSize * uSizeScale * (380.0 / -mvPosition.z)) * (0.8 + 0.5 * tempNorm);
  }
`

const diskParticleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRadius;

  void main() {
    // Soft Gaussian point sprite circle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard;

    // Smooth radial intensity profile
    float radial = exp(-distSq * 10.0);
    float finalAlpha = vAlpha * radial;

    if (finalAlpha < 0.01) discard;

    gl_FragColor = vec4(vColor, finalAlpha);
  }
`

export function AccretionDiskParticles({
  particleCount = 50000,
  mass = 1.0,
  driftSpeed = 0.85,
  diskTilt = 0.32,
  dopplerStrength = 1.0,
  sizeScale = 1.0
}) {
  const pointsRef = useRef()

  const [geometry, count] = useMemo(() => {
    const rs = 1.0 * mass
    const rIsco = 3.0 * rs
    const rMax = 16.0 * rs

    const positions = new Float32Array(particleCount * 3)
    const initialRadii = new Float32Array(particleCount)
    const initialAngles = new Float32Array(particleCount)
    const heightOffsets = new Float32Array(particleCount)
    const driftSeeds = new Float32Array(particleCount)
    const sizes = new Float32Array(particleCount)
    const turbulences = new Float32Array(particleCount)

    // Deterministic pseudo-random seed generator
    let seed = 1337
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }

    for (let i = 0; i < particleCount; i++) {
      // Power-law density distribution: denser towards ISCO
      // r = rIsco + (rMax - rIsco) * u^1.4
      const u = random()
      const radius = rIsco + (rMax - rIsco) * Math.pow(u, 1.35)
      const angle = random() * Math.PI * 2.0

      // Gaussian-distributed scale height
      const zBoxMuller = Math.sqrt(-2.0 * Math.log(Math.max(1e-5, random()))) * Math.cos(2.0 * Math.PI * random())
      const height = zBoxMuller * 0.45

      positions[i * 3 + 0] = radius * Math.cos(angle)
      positions[i * 3 + 1] = height
      positions[i * 3 + 2] = radius * Math.sin(angle)

      initialRadii[i] = radius
      initialAngles[i] = angle
      heightOffsets[i] = height
      driftSeeds[i] = random()
      sizes[i] = 0.85 + random() * 0.85
      turbulences[i] = (random() - 0.5) * 2.0
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aInitialRadius', new THREE.BufferAttribute(initialRadii, 1))
    geo.setAttribute('aInitialAngle', new THREE.BufferAttribute(initialAngles, 1))
    geo.setAttribute('aHeightOffset', new THREE.BufferAttribute(heightOffsets, 1))
    geo.setAttribute('aDriftSeed', new THREE.BufferAttribute(driftSeeds, 1))
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
    geo.setAttribute('aTurbulence', new THREE.BufferAttribute(turbulences, 1))

    return [geo, particleCount]
  }, [particleCount, mass])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uMass: { value: mass },
    uDriftSpeed: { value: driftSpeed },
    uDiskTilt: { value: diskTilt },
    uDopplerStrength: { value: dopplerStrength },
    uSizeScale: { value: sizeScale }
  }), [mass, driftSpeed, diskTilt, dopplerStrength, sizeScale])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      uniforms.uTime.value += delta
      uniforms.uMass.value = mass
      uniforms.uDriftSpeed.value = driftSpeed
      uniforms.uDiskTilt.value = diskTilt
      uniforms.uDopplerStrength.value = dopplerStrength
      uniforms.uSizeScale.value = sizeScale
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={diskParticleVertexShader}
        fragmentShader={diskParticleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
