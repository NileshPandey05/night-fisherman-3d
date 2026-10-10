import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Numerically integrates null geodesics in Schwarzschild spacetime
 * Acceleration: a = -1.5 * Rs * L^2 * x / r^5
 * 
 * Generates an ensemble of representative light paths:
 * 1. Background wavefront (lensed planar light)
 * 2. Oblique incoming rays (lateral gravitational deflection)
 * 3. Accretion disk emissions (curving over/under the horizon)
 * 4. Critical photon sphere grazers (looping 1-2 orbits)
 * 5. Event horizon plungers (captures into singularity)
 */
function computeGeodesicPaths({
  rs = 1.0,
  rayPattern = 'all',
  density = 'medium',
  diskTilt = 0.10
}) {
  const countMultiplier = density === 'high' ? 1.75 : density === 'low' ? 0.6 : 1.0
  const rays = []

  const rHorizon = 1.015 * rs
  const rMax = 19.0 * rs

  // Helper to integrate a single null geodesic
  function integrateRay(pos0, dir0, typeId, category, intrinsicBrightness = 1.0) {
    const points = []
    const p = pos0.clone()
    const v = dir0.clone().normalize()

    // Conserved angular momentum L = x × v
    const Lvec = new THREE.Vector3().crossVectors(p, v)
    const L2 = Lvec.lengthSq()

    let captured = false
    let windingHalfOrbits = 0
    let totalAngle = 0
    let prevPhi = Math.atan2(p.z, p.x)

    points.push(p.clone())

    const maxSteps = 160
    for (let step = 0; step < maxSteps; step++) {
      const r = p.length()

      // Track angular progression for higher-order winding detection
      const currPhi = Math.atan2(p.z, p.x)
      let dPhi = currPhi - prevPhi
      if (dPhi > Math.PI) dPhi -= Math.PI * 2
      if (dPhi < -Math.PI) dPhi += Math.PI * 2
      totalAngle += Math.abs(dPhi)
      prevPhi = currPhi

      // Count half-orbits around the black hole
      windingHalfOrbits = Math.floor(totalAngle / Math.PI)

      // Captured by Event Horizon: causal boundary
      if (r <= rHorizon) {
        captured = true
        points.push(p.clone().normalize().multiplyScalar(rHorizon * 0.97))
        break
      }

      // Escaped outside bounding boundary while traveling away
      if (r > rMax && p.dot(v) > 0) {
        break
      }

      // Adaptive step size: ultra-fine near photon sphere (1.5 Rs - 3 Rs), larger far out
      const dt = THREE.MathUtils.clamp(0.10 * (r - rs * 0.95), 0.028, 0.36)

      // Schwarzschild Null Geodesic Acceleration
      const r5 = Math.pow(Math.max(r, 0.01), 5)
      const aCurr = p.clone().multiplyScalar(-1.5 * rs * L2 / r5)

      // Velocity-Verlet Integration
      const pNext = p.clone().addScaledVector(v, dt).addScaledVector(aCurr, 0.5 * dt * dt)
      const rNext = pNext.length()
      const rNext5 = Math.pow(Math.max(rNext, 0.01), 5)
      const aNext = pNext.clone().multiplyScalar(-1.5 * rs * L2 / rNext5)

      const vNext = v.clone().addScaledVector(aCurr.clone().add(aNext), 0.5 * dt)

      p.copy(pNext)
      v.copy(vNext)
      points.push(p.clone())
    }

    if (points.length >= 3) {
      // Physical higher-order demagnification: each winding half-orbit attenuates by e^(-0.85 * n)
      const demagnification = Math.exp(-0.85 * Math.min(windingHalfOrbits, 4))
      const finalBrightness = intrinsicBrightness * demagnification

      rays.push({
        points,
        captured,
        typeId,
        category,
        brightness: finalBrightness,
        windings: windingHalfOrbits
      })
    }
  }

  // 1. WAVEFRONT LENSING RAYS (Parallel light from behind the black hole)
  if (rayPattern === 'all' || rayPattern === 'wavefront') {
    const nRings = Math.round(7 * countMultiplier)
    const nPerRing = Math.round(14 * countMultiplier)
    const zStart = -13.5

    for (let ring = 0; ring < nRings; ring++) {
      const t = ring / Math.max(1, nRings - 1)
      const b = 1.35 * rs + Math.pow(t, 1.35) * 6.2 * rs

      for (let i = 0; i < nPerRing; i++) {
        const angle = (i / nPerRing) * Math.PI * 2
        const x = b * Math.cos(angle)
        const y = b * Math.sin(angle)
        const pos0 = new THREE.Vector3(x, y, zStart)
        const dir0 = new THREE.Vector3(0, 0, 1)

        integrateRay(pos0, dir0, 0, 'wavefront', 1.0)
      }
    }
  }

  // 2. OBLIQUE INCOMING RAYS (Light entering from lateral / 35-degree angle)
  if (rayPattern === 'all' || rayPattern === 'wavefront') {
    const nOblique = Math.round(18 * countMultiplier)
    for (let i = 0; i < nOblique; i++) {
      const frac = i / nOblique
      const b = 2.4 * rs + frac * 4.8 * rs
      const theta = 0.55 // ~32 degree incline
      const pos0 = new THREE.Vector3(
        -12.0 * Math.cos(theta),
        (i % 3 - 1) * 1.8 * rs,
        -12.0 * Math.sin(theta) + b
      )
      const dir0 = new THREE.Vector3(Math.cos(theta), 0.08 * (i % 2 === 0 ? 1 : -1), Math.sin(theta)).normalize()

      integrateRay(pos0, dir0, 0, 'oblique', 0.95)
    }
  }

  // 3. ACCRETION DISK EMISSION ARCH RAYS (Light emitted from disk bending over/under the horizon)
  if (rayPattern === 'all' || rayPattern === 'arches') {
    const nDiskRays = Math.round(52 * countMultiplier)
    const cosTilt = Math.cos(diskTilt)
    const sinTilt = Math.sin(diskTilt)

    for (let i = 0; i < nDiskRays; i++) {
      const frac = i / nDiskRays
      const r = 3.2 * rs + (i % 7) * 1.4 * rs
      // Concentrate on the far side (negative Z)
      const phi = Math.PI * 0.62 + frac * Math.PI * 0.76

      const xFlat = r * Math.sin(phi)
      const zFlat = -r * Math.cos(phi)
      const yFlat = 0.0

      const pos0 = new THREE.Vector3(
        xFlat,
        yFlat * cosTilt - zFlat * sinTilt,
        yFlat * sinTilt + zFlat * cosTilt
      )

      // Emit upward for upper arch, downward for lower arc
      const isUpper = i % 2 === 0
      const elevationAngle = (isUpper ? 1 : -1) * (0.32 + (i % 3) * 0.24)
      const dirFlat = new THREE.Vector3(
        -Math.cos(phi) * 0.32,
        Math.sin(elevationAngle),
        Math.cos(elevationAngle) * 0.88
      ).normalize()

      const dir0 = new THREE.Vector3(
        dirFlat.x,
        dirFlat.y * cosTilt - dirFlat.z * sinTilt,
        dirFlat.y * sinTilt + dirFlat.z * cosTilt
      ).normalize()

      integrateRay(pos0, dir0, 1, 'arch', 1.25)
    }
  }

  // 4. CRITICAL PHOTON SPHERE GRAZING RAYS (Critical rays looping around r = 1.5 Rs)
  if (rayPattern === 'all' || rayPattern === 'photon_ring') {
    const nGrazers = Math.round(40 * countMultiplier)
    const bCrit = 2.598076 * rs

    for (let i = 0; i < nGrazers; i++) {
      // Impact parameters around critical value
      const deltaB = (Math.random() - 0.49) * 0.06 * rs
      const b = bCrit + deltaB
      const angle = (i / nGrazers) * Math.PI * 2
      const phi = ((i % 5) / 5) * Math.PI

      const startDist = 8.2 * rs
      const pInit = new THREE.Vector3(
        Math.cos(angle) * startDist,
        Math.sin(angle) * startDist * 0.72,
        -Math.cos(phi) * startDist * 0.65
      )

      const toOrigin = pInit.clone().negate().normalize()
      const perp = new THREE.Vector3(-pInit.y, pInit.x, 0).normalize()
      const offsetFactor = b / startDist
      const dir0 = toOrigin.clone().addScaledVector(perp, offsetFactor).normalize()

      integrateRay(pInit, dir0, 2, 'photon_ring', 1.4)
    }
  }

  return rays
}

// GLSL Vertex Shader: passes smooth progress, ray properties, and world coordinates
const rayVertexShader = `
  attribute float aProgress;
  attribute float aRayId;
  attribute float aCaptured;
  attribute float aRayType;
  attribute float aBrightness;

  varying float vProgress;
  varying float vRayId;
  varying float vCaptured;
  varying float vRayType;
  varying float vBrightness;
  varying vec3 vWorldPos;

  void main() {
    vProgress = aProgress;
    vRayId = aRayId;
    vCaptured = aCaptured;
    vRayType = aRayType;
    vBrightness = aBrightness;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// GLSL Fragment Shader: smooth continuous traveling wavelets, refined warm palettes, restrained bloom
const rayFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uPulseRate;
  uniform float uPulseLength;
  uniform float uStreamlineGlow;
  uniform float uGlowIntensity;
  uniform int uColorPreset; // 0 = Cinematic Amber, 1 = Cyan, 2 = Violet, 3 = Spectral
  uniform float uRs;

  varying float vProgress;
  varying float vRayId;
  varying float vCaptured;
  varying float vRayType;
  varying float vBrightness;
  varying vec3 vWorldPos;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  void main() {
    float rayOffset = hash(vRayId * 17.139);
    float distToHole = length(vWorldPos);

    // Fade rays as they plunge through the event horizon into the singularity
    float horizonFade = smoothstep(1.015 * uRs, 1.55 * uRs, distToHole);

    // Continuous Hermite boundary fade at path start and end (ZERO popping or teleportation)
    float pathEnvelope = smoothstep(0.0, 0.06, vProgress) * smoothstep(1.0, 0.94, vProgress);

    // Continuous traveling wave pulse calculation
    float travelCoord = vProgress * uPulseRate - uTime * uSpeed + rayOffset;
    float localPhase = fract(travelCoord);

    // Smooth sinusoidal/power wavelet pulse: soft head and gradual trailing tail
    float pulseShape = pow(localPhase, uPulseLength);
    float pulseHead = smoothstep(0.92, 1.0, localPhase) * 2.0;
    float pulseIntensity = (pulseShape + pulseHead) * pathEnvelope;

    // Combined intensity (subtle streamline visibility + energetic moving photon packet)
    float totalIntensity = (uStreamlineGlow * pathEnvelope + pulseIntensity * uGlowIntensity) * vBrightness;

    // Palette Selection
    vec3 baseColor;
    vec3 headColor;

    if (uColorPreset == 0) {
      // Cinematic Amber-Gold (Primary reference matching the incandescent hot disk)
      baseColor = vec3(0.85, 0.28, 0.05);   // Soft deep amber / orange
      headColor = vec3(1.0, 0.94, 0.65);    // Radiant yellow-white highlight
    } else if (uColorPreset == 1) {
      // Laser Electric Cyan / Aquamarine (High-contrast scientific overlay)
      baseColor = vec3(0.06, 0.42, 0.92);
      headColor = vec3(0.55, 0.95, 1.0);
    } else if (uColorPreset == 2) {
      // Quantum Hyper-Violet
      baseColor = vec3(0.60, 0.12, 0.95);
      headColor = vec3(0.95, 0.70, 1.0);
    } else {
      // Relativistic Spectral Dispersion (Gravitational Redshift)
      float gravFactor = clamp((distToHole - uRs) / (7.5 * uRs), 0.0, 1.0);
      baseColor = mix(vec3(0.95, 0.15, 0.02), vec3(0.12, 0.65, 1.0), gravFactor);
      headColor = mix(vec3(1.0, 0.80, 0.35), vec3(0.85, 0.95, 1.0), gravFactor);
    }

    // Blend base and head colors based on pulse head intensity
    vec3 finalColor = mix(baseColor, headColor, clamp(pulseHead * 0.65, 0.0, 1.0));
    finalColor *= totalIntensity * horizonFade;

    // Restrained highlight boost for photon ring looping rays (rayType == 2)
    if (vRayType > 1.5) {
      finalColor *= 1.25;
    }

    float alpha = clamp(totalIntensity * horizonFade, 0.0, 1.0);
    if (alpha < 0.004) discard;

    gl_FragColor = vec4(finalColor, alpha);
  }
`

export function GeodesicRayTracers({
  mass = 1.0,
  enabled = true,
  rayPattern = 'all',
  density = 'medium',
  colorPreset = 'amber', // 'amber' (default), 'cyan', 'violet', 'spectral'
  speed = 1.0,
  streamlineGlow = 0.16,
  glowIntensity = 2.2,
  pulseRate = 3.2,
  diskTilt = 0.10,
  isPaused = false
}) {
  const linesRef = useRef()
  const timeRef = useRef(0)

  // Color preset mapping: 0 = Amber, 1 = Cyan, 2 = Violet, 3 = Spectral
  const colorPresetId = useMemo(() => {
    if (colorPreset === 'cyan') return 1
    if (colorPreset === 'violet') return 2
    if (colorPreset === 'spectral') return 3
    return 0 // 'amber' default
  }, [colorPreset])

  // Build the line segment buffer geometry with pre-computed null geodesics
  const lineGeometry = useMemo(() => {
    if (!enabled) return null

    const rays = computeGeodesicPaths({
      rs: 1.0 * mass,
      rayPattern,
      density,
      diskTilt
    })

    const positions = []
    const progresses = []
    const rayIds = []
    const captureds = []
    const rayTypes = []
    const brightnesses = []

    rays.forEach((ray, rayIndex) => {
      const nPts = ray.points.length
      const rayId = rayIndex

      for (let i = 0; i < nPts - 1; i++) {
        const p1 = ray.points[i]
        const p2 = ray.points[i + 1]
        const prog1 = i / (nPts - 1)
        const prog2 = (i + 1) / (nPts - 1)

        // Point 1
        positions.push(p1.x, p1.y, p1.z)
        progresses.push(prog1)
        rayIds.push(rayId)
        captureds.push(ray.captured ? 1.0 : 0.0)
        rayTypes.push(ray.typeId)
        brightnesses.push(ray.brightness)

        // Point 2
        positions.push(p2.x, p2.y, p2.z)
        progresses.push(prog2)
        rayIds.push(rayId)
        captureds.push(ray.captured ? 1.0 : 0.0)
        rayTypes.push(ray.typeId)
        brightnesses.push(ray.brightness)
      }
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progresses, 1))
    geometry.setAttribute('aRayId', new THREE.Float32BufferAttribute(rayIds, 1))
    geometry.setAttribute('aCaptured', new THREE.Float32BufferAttribute(captureds, 1))
    geometry.setAttribute('aRayType', new THREE.Float32BufferAttribute(rayTypes, 1))
    geometry.setAttribute('aBrightness', new THREE.Float32BufferAttribute(brightnesses, 1))

    return geometry
  }, [mass, enabled, rayPattern, density, diskTilt])

  // Uniforms for the animated laser pulses
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: speed * 0.82 },
    uPulseRate: { value: pulseRate },
    uPulseLength: { value: 14.0 },
    uStreamlineGlow: { value: streamlineGlow },
    uGlowIntensity: { value: glowIntensity },
    uColorPreset: { value: colorPresetId },
    uRs: { value: 1.0 * mass }
  }), [speed, pulseRate, streamlineGlow, glowIntensity, colorPresetId, mass])

  useFrame((_, delta) => {
    if (linesRef.current && enabled) {
      if (!isPaused) {
        timeRef.current += Math.min(delta, 0.1)
      }
      uniforms.uTime.value = timeRef.current
      uniforms.uSpeed.value = speed * 0.82
      uniforms.uPulseRate.value = pulseRate
      uniforms.uStreamlineGlow.value = streamlineGlow
      uniforms.uGlowIntensity.value = glowIntensity
      uniforms.uColorPreset.value = colorPresetId
      uniforms.uRs.value = 1.0 * mass
    }
  })

  if (!enabled || !lineGeometry) return null

  return (
    <lineSegments ref={linesRef} geometry={lineGeometry} renderOrder={2}>
      <shaderMaterial
        vertexShader={rayVertexShader}
        fragmentShader={rayFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}
