import React, { useMemo } from 'react'
import * as THREE from 'three'

const photonRingVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const photonRingFragmentShader = `
  uniform float uRadius;
  uniform float uRingWidth;
  uniform float uIntensity;
  uniform float uDopplerGain;
  uniform vec3 uColor;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    // Distance from center in UV space [-1, 1]
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);

    // Ultra-sharp exponential peak around r = 1.0 (normalized radius)
    float dist = abs(r - 0.72);
    float ringIntensity = exp(-dist * dist / (2.0 * uRingWidth * uRingWidth));

    // Relativistic Doppler beaming asymmetry across azimuthal angle
    // Approaching matter on one side has higher intensity
    float angle = atan(p.y, p.x);
    float dopplerFactor = 1.0 + uDopplerGain * cos(angle);

    // Gravitational lensing sub-ring (n=1 secondary photon loop)
    float subDist = abs(r - 0.69);
    float subRing = exp(-subDist * subDist / (1.2 * uRingWidth * uRingWidth)) * 0.45;

    float totalAlpha = (ringIntensity + subRing) * uIntensity * dopplerFactor;

    if (totalAlpha < 0.005) discard;

    vec3 col = uColor * (ringIntensity * 2.2 + subRing * 1.5) * dopplerFactor;

    gl_FragColor = vec4(col, clamp(totalAlpha, 0.0, 1.0));
  }
`

export function PhotonRing({
  mass = 1.0,
  intensity = 2.4,
  dopplerIntensity = 1.2,
  enabled = true
}) {
  const rs = 1.0 * mass
  // Apparent shadow radius b_crit = 3*sqrt(3)/2 * Rs ≈ 2.598 * Rs
  const ringOuterRadius = 3.6 * rs

  const uniforms = useMemo(() => ({
    uRadius: { value: 2.598 * rs },
    uRingWidth: { value: 0.024 },
    uIntensity: { value: intensity },
    uDopplerGain: { value: dopplerIntensity * 0.65 },
    uColor: { value: new THREE.Color('#ffe6b8') }
  }), [rs, intensity, dopplerIntensity])

  if (!enabled) return null

  return (
    <mesh rotation={[-Math.PI * 0.12, 0, 0]}>
      <planeGeometry args={[ringOuterRadius * 2, ringOuterRadius * 2]} />
      <shaderMaterial
        vertexShader={photonRingVertexShader}
        fragmentShader={photonRingFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
