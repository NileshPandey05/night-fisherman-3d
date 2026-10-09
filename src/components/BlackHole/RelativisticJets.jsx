import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const jetVertexShader = `
  uniform float uTime;
  uniform float uSpeed;

  attribute float aProgress;
  attribute float aAngle;
  attribute float aRadius;
  attribute float aPolarity; // +1 = North jet, -1 = South jet

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Helical motion traveling outwards along polar Y axis
    float cycle = mod(uTime * uSpeed + aProgress * 12.0, 12.0);
    float y = cycle * aPolarity * 1.8;

    // Helical expansion angle
    float currentAngle = aAngle + cycle * 1.5;
    float currentRadius = aRadius * (0.12 + 0.08 * cycle);

    vec3 pos = vec3(
      currentRadius * cos(currentAngle),
      y,
      currentRadius * sin(currentAngle)
    );

    // Color gradient: brilliant blue-white near base, fading to deep violet-cyan
    vec3 cBase = vec3(0.65, 0.9, 1.0);
    vec3 cTip = vec3(0.3, 0.2, 0.95);
    float progressNorm = cycle / 12.0;
    vColor = mix(cBase, cTip, progressNorm);

    // Fade out as it extends away from black hole
    vAlpha = (1.0 - progressNorm) * smoothstep(0.0, 0.8, cycle);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = (18.0 / -mvPosition.z) * (1.0 - progressNorm * 0.4);
  }
`

const jetFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float distSq = dot(coord, coord);
    if (distSq > 0.25) discard;

    float radial = exp(-distSq * 12.0);
    gl_FragColor = vec4(vColor, vAlpha * radial * 0.8);
  }
`

export function RelativisticJets({ enabled = true, count = 2500 }) {
  const pointsRef = useRef()

  const [geometry, particleCount] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const progresses = new Float32Array(count)
    const angles = new Float32Array(count)
    const radii = new Float32Array(count)
    const polarities = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = 0
      positions[i * 3 + 1] = 0
      positions[i * 3 + 2] = 0

      progresses[i] = Math.random()
      angles[i] = Math.random() * Math.PI * 2.0
      radii[i] = 0.2 + Math.random() * 0.6
      polarities[i] = i % 2 === 0 ? 1.0 : -1.0
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aProgress', new THREE.BufferAttribute(progresses, 1))
    geo.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1))
    geo.setAttribute('aRadius', new THREE.BufferAttribute(radii, 1))
    geo.setAttribute('aPolarity', new THREE.BufferAttribute(polarities, 1))

    return [geo, count]
  }, [count])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: 2.2 }
  }), [])

  useFrame((_, delta) => {
    if (pointsRef.current) {
      uniforms.uTime.value += delta
    }
  })

  if (!enabled) return null

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        vertexShader={jetVertexShader}
        fragmentShader={jetFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
