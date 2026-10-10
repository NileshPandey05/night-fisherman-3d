import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Numerical integration of null geodesics in Schwarzschild spacetime
// a = -1.5 * Rs * L^2 * x / r^5
function computeGeodesicPaths({
  rs = 1.0,
  rayPattern = 'all',
  density = 'medium',
  diskTilt = 0.1
}) {
  const countMultiplier = density === 'high' ? 1.8 : density === 'low' ? 0.6 : 1.0
  const rays = []

  const rHorizon = 1.01 * rs
  const rMax = 18.0 * rs

  // Helper: integrate a single null geodesic
  function integrateRay(pos0, dir0, typeId, category) {
    const points = []
    const p = pos0.clone()
    const v = dir0.clone().normalize()

    // Conserved angular momentum L = x × v
    const Lvec = new THREE.Vector3().crossVectors(p, v)
    const L2 = Lvec.lengthSq()

    let captured = false
    points.push(p.clone())

    const maxSteps = 140
    for (let step = 0; step < maxSteps; step++) {
      const r = p.length()

      // Captured by Event Horizon
      if (r <= rHorizon) {
        captured = true
        // Add final plunge point
        points.push(p.clone().normalize().multiplyScalar(rHorizon * 0.96))
        break
      }

      // Escaped outside bounding boundary while traveling away
      if (r > rMax && p.dot(v) > 0) {
        break
      }

      // Adaptive step size: tight near photon sphere (1.5 Rs - 3 Rs), larger far out
      const dt = THREE.MathUtils.clamp(0.11 * (r - rs * 0.95), 0.032, 0.38)

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

    if (points.length >= 2) {
      rays.push({
        points,
        captured,
        typeId,
        category
      })
    }
  }

  // 1. WAVEFRONT LENSING RAYS (Distant background light bending around the black hole)
  if (rayPattern === 'all' || rayPattern === 'wavefront') {
    const nRings = Math.round(7 * countMultiplier)
    const nPerRing = Math.round(14 * countMultiplier)
    const zStart = -13.5

    for (let ring = 0; ring < nRings; ring++) {
      // Cluster impact parameters around the critical shadow radius (2.6 Rs)
      const t = ring / Math.max(1, nRings - 1)
      const b = 1.3 * rs + Math.pow(t, 1.4) * 6.5 * rs

      for (let i = 0; i < nPerRing; i++) {
        const angle = (i / nPerRing) * Math.PI * 2
        const x = b * Math.cos(angle)
        const y = b * Math.sin(angle)
        const pos0 = new THREE.Vector3(x, y, zStart)
        const dir0 = new THREE.Vector3(0, 0, 1)

        integrateRay(pos0, dir0, 0, 'wavefront')
      }
    }
  }

  // 2. DISK EMISSION ARCH RAYS (Light emitted from far accretion disk bending OVER/UNDER the horizon)
  if (rayPattern === 'all' || rayPattern === 'arches') {
    const nDiskRays = Math.round(48 * countMultiplier)
    const cosTilt = Math.cos(diskTilt)
    const sinTilt = Math.sin(diskTilt)

    for (let i = 0; i < nDiskRays; i++) {
      const frac = i / nDiskRays
      // Radius across the accretion disk (3.2 Rs to 12.0 Rs)
      const r = 3.2 * rs + (i % 6) * 1.5 * rs
      // Concentrate on the far side (angles around π, i.e. negative Z)
      const phi = Math.PI * 0.65 + frac * Math.PI * 0.70

      // Position in flat disk plane
      const xFlat = r * Math.sin(phi)
      const zFlat = -r * Math.cos(phi) // Far side (negative z)
      const yFlat = 0.0

      // Rotate by disk tilt around X
      const pos0 = new THREE.Vector3(
        xFlat,
        yFlat * cosTilt - zFlat * sinTilt,
        yFlat * sinTilt + zFlat * cosTilt
      )

      // Emit upwards for upper arch, downwards for lower arc
      const isUpper = i % 2 === 0
      const elevationAngle = (isUpper ? 1 : -1) * (0.35 + (i % 3) * 0.22)
      const dirFlat = new THREE.Vector3(
        -Math.cos(phi) * 0.3,
        Math.sin(elevationAngle),
        Math.cos(elevationAngle) * 0.85
      ).normalize()

      const dir0 = new THREE.Vector3(
        dirFlat.x,
        dirFlat.y * cosTilt - dirFlat.z * sinTilt,
        dirFlat.y * sinTilt + dirFlat.z * cosTilt
      ).normalize()

      integrateRay(pos0, dir0, 1, 'arch')
    }
  }

  // 3. PHOTON SPHERE GRAZING RAYS (Critical rays looping around r = 1.5 Rs)
  if (rayPattern === 'all' || rayPattern === 'photon_ring') {
    const nGrazers = Math.round(36 * countMultiplier)
    const bCrit = 2.598076 * rs

    for (let i = 0; i < nGrazers; i++) {
      // Impact parameters ultra-close to critical value (bCrit ± 0.04)
      const deltaB = (Math.random() - 0.48) * 0.08 * rs
      const b = bCrit + deltaB
      const angle = (i / nGrazers) * Math.PI * 2
      const phi = ((i % 4) / 4) * Math.PI

      // Start outside and shoot tangentially
      const startDist = 7.5 * rs
      const pInit = new THREE.Vector3(
        Math.cos(angle) * startDist,
        Math.sin(angle) * startDist * 0.7,
        -Math.cos(phi) * startDist * 0.6
      )

      // Direction aimed with impact parameter b
      const toOrigin = pInit.clone().negate().normalize()
      const perp = new THREE.Vector3(-pInit.y, pInit.x, 0).normalize()
      const offsetFactor = b / startDist
      const dir0 = toOrigin.clone().addScaledVector(perp, offsetFactor).normalize()

      integrateRay(pInit, dir0, 2, 'photon_ring')
    }
  }

  return rays
}

// Custom shader for animated glowing laser photon beams
const rayVertexShader = `
  attribute float aProgress;
  attribute float aRayId;
  attribute float aCaptured;
  attribute float aRayType;

  varying float vProgress;
  varying float vRayId;
  varying float vCaptured;
  varying float vRayType;
  varying vec3 vWorldPos;

  void main() {
    vProgress = aProgress;
    vRayId = aRayId;
    vCaptured = aCaptured;
    vRayType = aRayType;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const rayFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uSpeed;
  uniform float uPulseRate;
  uniform float uPulseLength;
  uniform float uStreamlineGlow;
  uniform float uGlowIntensity;
  uniform int uColorPreset; // 0 = Cyan, 1 = Gold, 2 = Violet, 3 = Spectral
  uniform float uRs;

  varying float vProgress;
  varying float vRayId;
  varying float vCaptured;
  varying float vRayType;
  varying vec3 vWorldPos;

  // Simple pseudo-random hash
  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  void main() {
    float rayOffset = hash(vRayId * 13.371);
    float distToHole = length(vWorldPos);

    // Fade rays as they plunge through the event horizon into the singularity
    float horizonFade = smoothstep(1.02 * uRs, 1.65 * uRs, distToHole);

    // Moving Laser Pulse calculation
    // Pulse travels along the ray with progress coordinate [0, 1]
    float phase = fract(vProgress * uPulseRate - uTime * uSpeed + rayOffset);

    // Glowing head + trailing tail
    float tail = pow(phase, uPulseLength);
    float head = smoothstep(0.94, 1.0, phase) * 2.2;
    float pulseIntensity = tail + head;

    // Combined intensity (continuous streamline path + moving laser pulse)
    float totalIntensity = uStreamlineGlow + pulseIntensity * uGlowIntensity;

    // Palette Selection
    vec3 baseColor;
    vec3 headColor;

    if (uColorPreset == 0) {
      // Laser Electric Cyan / Aquamarine (Stunning high contrast with orange disk)
      baseColor = vec3(0.08, 0.45, 0.95);
      headColor = vec3(0.55, 0.95, 1.0);
    } else if (uColorPreset == 1) {
      // Solar Incandescent Gold (Matches hot disk fire)
      baseColor = vec3(1.0, 0.35, 0.05);
      headColor = vec3(1.0, 0.92, 0.45);
    } else if (uColorPreset == 2) {
      // Quantum Hyper-Violet
      baseColor = vec3(0.65, 0.15, 0.98);
      headColor = vec3(0.95, 0.65, 1.0);
    } else {
      // Relativistic Spectral Dispersion (Gravitational Redshift)
      // Light shifts from blue far away to fiery red as it enters strong gravity
      float gravFactor = clamp((distToHole - uRs) / (8.0 * uRs), 0.0, 1.0);
      baseColor = mix(vec3(0.95, 0.12, 0.04), vec3(0.12, 0.65, 1.0), gravFactor);
      headColor = mix(vec3(1.0, 0.75, 0.25), vec3(0.85, 0.95, 1.0), gravFactor);
    }

    vec3 finalColor = mix(baseColor, headColor, clamp(head * 0.7, 0.0, 1.0));
    finalColor *= totalIntensity * horizonFade;

    // Add extra brightness boost at photon ring loops (rayType == 2)
    if (vRayType > 1.5) {
      finalColor *= 1.35;
    }

    float alpha = clamp(totalIntensity * horizonFade, 0.0, 1.0);
    if (alpha < 0.005) discard;

    gl_FragColor = vec4(finalColor, alpha);
  }
`

export function GeodesicRayTracers({
  mass = 1.0,
  enabled = true,
  rayPattern = 'all',
  density = 'medium',
  colorPreset = 'cyan', // 'cyan', 'gold', 'violet', 'spectral'
  speed = 1.0,
  streamlineGlow = 0.18,
  glowIntensity = 2.4,
  pulseRate = 3.0,
  diskTilt = 0.10,
  isPaused = false
}) {
  const linesRef = useRef()
  const timeRef = useRef(0)

  // Color preset mapping
  const colorPresetId = useMemo(() => {
    if (colorPreset === 'gold') return 1
    if (colorPreset === 'violet') return 2
    if (colorPreset === 'spectral') return 3
    return 0 // cyan
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

        // Point 2
        positions.push(p2.x, p2.y, p2.z)
        progresses.push(prog2)
        rayIds.push(rayId)
        captureds.push(ray.captured ? 1.0 : 0.0)
        rayTypes.push(ray.typeId)
      }
    })

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(progresses, 1))
    geometry.setAttribute('aRayId', new THREE.Float32BufferAttribute(rayIds, 1))
    geometry.setAttribute('aCaptured', new THREE.Float32BufferAttribute(captureds, 1))
    geometry.setAttribute('aRayType', new THREE.Float32BufferAttribute(rayTypes, 1))

    return geometry
  }, [mass, enabled, rayPattern, density, diskTilt])

  // Uniforms for the animated laser pulses
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: speed * 0.85 },
    uPulseRate: { value: pulseRate },
    uPulseLength: { value: 16.0 },
    uStreamlineGlow: { value: streamlineGlow },
    uGlowIntensity: { value: glowIntensity },
    uColorPreset: { value: colorPresetId },
    uRs: { value: 1.0 * mass }
  }), [speed, pulseRate, streamlineGlow, glowIntensity, colorPresetId, mass])

  useFrame((_, delta) => {
    if (linesRef.current && enabled) {
      if (!isPaused) {
        timeRef.current += delta
      }
      uniforms.uTime.value = timeRef.current
      uniforms.uSpeed.value = speed * 0.85
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
