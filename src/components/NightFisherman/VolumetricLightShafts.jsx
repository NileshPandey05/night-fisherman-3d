import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const shaftsVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const shaftsFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLanternPos;
  uniform vec3 uShaftColor;
  uniform float uIntensity;

  varying vec3 vWorldPosition;
  varying vec2 vUv;

  void main() {
    // Height gradient along the underwater light shaft (y from 0 to -4.5)
    float depth = clamp(-vWorldPosition.y / 4.2, 0.0, 1.0);
    
    // Soft radial fade from central axis
    float radial = sin(vUv.x * 3.14159265);

    // Animated shimmering light caustics modulation
    float shimmer = sin(vWorldPosition.x * 2.2 + uTime * 1.6) * 
                    cos(vWorldPosition.z * 2.2 - uTime * 1.4) * 0.35 + 0.65;

    // Fade near water surface and deep extinction
    float verticalFade = smoothstep(0.0, 0.12, depth) * (1.0 - pow(depth, 1.4));

    float alpha = radial * verticalFade * shimmer * uIntensity * 0.28;

    gl_FragColor = vec4(uShaftColor, alpha);
  }
`

export function VolumetricLightShafts({ lanternPos = [0, 1.8, 0] }) {
  const groupRef = useRef()
  const matRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLanternPos: { value: new THREE.Vector3(...lanternPos) },
    uShaftColor: { value: new THREE.Color('#ffaa38') },
    uIntensity: { value: 1.25 }
  }), [])

  useFrame((state) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value = state.clock.getElapsedTime()
    matRef.current.uniforms.uLanternPos.value.set(...lanternPos)
  })

  // Multiple angled light beam planes radiating downward
  const planeGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(3.6, 4.4, 1, 1)
    geo.translate(0, -2.2, 0)
    return geo
  }, [])

  return (
    <group ref={groupRef} position={[lanternPos[0] - 0.42, 0, lanternPos[2] + 0.15]}>
      {/* 4 Crossed Volumetric Light Shaft Planes */}
      {[0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4].map((angle, idx) => (
        <mesh key={idx} geometry={planeGeo} rotation={[0, angle, 0]}>
          <shaderMaterial
            ref={idx === 0 ? matRef : undefined}
            vertexShader={shaftsVertexShader}
            fragmentShader={shaftsFragmentShader}
            uniforms={uniforms}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}
