import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const sprayVertexShader = /* glsl */ `
precision highp float;

attribute float aSeed;
attribute vec3 aVelocity;
attribute float aLifetime;

uniform float uTime;
uniform float uWaveSpeed;
uniform float uWaveHeight;
uniform float uSprayGravity;
uniform float uSprayLifetime;
uniform float uSprayRate;
uniform float uSlope;

varying float vAlpha;

float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  // Particle cycle time based on individual seed offset
  float cycleTime = mod(uTime * 1.5 + aSeed * 100.0, aLifetime);
  float progress = cycleTime / aLifetime;

  // Particle emission zone: along the active breaking wave line (z around -4.0 to 0.0)
  float xBase = (hash(aSeed * 12.3) - 0.5) * 26.0;

  // Wave phase determines wave crest location
  float waveZ = mod(uTime * uWaveSpeed * 1.8 + hash(aSeed * 45.6) * 12.0, 10.0) - 7.0;
  float yBase = uWaveHeight * 0.85;

  // Kinematic trajectory: p(t) = p0 + v0*t - 0.5*g*t^2
  vec3 pos = vec3(xBase, yBase, waveZ);
  pos += aVelocity * cycleTime;
  pos.y -= 0.5 * uSprayGravity * cycleTime * cycleTime;

  // Scale particle size over lifetime
  float pSize = mix(18.0, 32.0, progress) * (1.0 - smoothstep(0.7, 1.0, progress));

  // Dynamic alpha fade
  vAlpha = (1.0 - progress) * smoothstep(0.0, 0.15, progress) * uSprayRate;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = pSize * (15.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const sprayFragmentShader = /* glsl */ `
precision highp float;

varying float vAlpha;
uniform vec3 uSprayColor;

void main() {
  // Soft circular particle disc
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float softEdge = 1.0 - smoothstep(0.1, 0.5, dist);
  float alpha = softEdge * vAlpha * 0.75;

  gl_FragColor = vec4(uSprayColor, alpha);
}
`;

export function SprayParticles({
  count = 8000,
  waveSpeed = 0.85,
  waveHeight = 0.65,
  sprayGravity = 3.5,
  sprayLifetime = 1.0,
  sprayRate = 1.0,
  sprayColor = '#EAFDFC',
  slope = 0.18,
}) {
  const pointsRef = useRef()
  const materialRef = useRef()

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    const lifetimes = new Float32Array(count)

    // Deterministic pseudo-random sequence for pure rendering
    let s = 12345
    const nextRandom = () => {
      s = (s * 16807 + 0) % 2147483647
      return (s - 1) / 2147483646
    }

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (nextRandom() - 0.5) * 26
      positions[i * 3 + 1] = 0.5
      positions[i * 3 + 2] = (nextRandom() - 0.5) * 10 - 2

      // Upward and forward velocity from breaking crest
      velocities[i * 3 + 0] = (nextRandom() - 0.5) * 1.5
      velocities[i * 3 + 1] = 1.8 + nextRandom() * 2.2
      velocities[i * 3 + 2] = 0.8 + nextRandom() * 1.6

      seeds[i] = nextRandom()
      lifetimes[i] = 0.6 + nextRandom() * sprayLifetime
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aLifetime', new THREE.BufferAttribute(lifetimes, 1))

    return geo
  }, [count, sprayLifetime])

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: sprayVertexShader,
      fragmentShader: sprayFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uWaveSpeed: { value: waveSpeed },
        uWaveHeight: { value: waveHeight },
        uSprayGravity: { value: sprayGravity },
        uSprayLifetime: { value: sprayLifetime },
        uSprayRate: { value: sprayRate },
        uSlope: { value: slope },
        uSprayColor: { value: new THREE.Color(sprayColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [waveSpeed, waveHeight, sprayGravity, sprayLifetime, sprayRate, slope, sprayColor])

  useEffect(() => {
    if (!materialRef.current) return
    const u = materialRef.current.uniforms
    u.uWaveSpeed.value = waveSpeed
    u.uWaveHeight.value = waveHeight
    u.uSprayGravity.value = sprayGravity
    u.uSprayLifetime.value = sprayLifetime
    u.uSprayRate.value = sprayRate
    u.uSlope.value = slope
    u.uSprayColor.value.set(sprayColor)
  }, [waveSpeed, waveHeight, sprayGravity, sprayLifetime, sprayRate, slope, sprayColor])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  return (
    <points ref={pointsRef} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </points>
  )
}
