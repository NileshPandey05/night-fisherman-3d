import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleGerstnerWater } from './OceanWater'

export function FishingLure({ rodTipPos = [0.12, 1.4, 1.6], lurePos = [0.4, 0, 2.2], onLureBite }) {
  const bobberRef = useRef()
  const lineRef = useRef()

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry()
  }, [])

  const linePositions = useMemo(() => new Float32Array(30 * 3), [])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (!bobberRef.current) return

    // Float on the ocean swell
    const water = sampleGerstnerWater(lurePos[0], lurePos[2], time)
    bobberRef.current.position.set(lurePos[0], water.elevation + 0.03, lurePos[2])

    // Gentle bobbing rotation
    bobberRef.current.rotation.x = Math.sin(time * 3.0) * 0.15
    bobberRef.current.rotation.z = Math.cos(time * 2.5) * 0.15

    // Update catenary fishing line from rod tip to bobber
    const start = new THREE.Vector3(...rodTipPos)
    const end = new THREE.Vector3(lurePos[0], water.elevation + 0.03, lurePos[2])

    const curve = new THREE.QuadraticBezierCurve3(
      start,
      new THREE.Vector3(
        (start.x + end.x) * 0.5,
        Math.min(start.y, end.y) - 0.25, // natural gravitational catenary sag
        (start.z + end.z) * 0.5
      ),
      end
    )

    const points = curve.getPoints(29)
    for (let i = 0; i < 30; i++) {
      linePositions[i * 3] = points[i].x
      linePositions[i * 3 + 1] = points[i].y
      linePositions[i * 3 + 2] = points[i].z
    }

    if (lineRef.current) {
      lineRef.current.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(linePositions, 3)
      )
      lineRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <group>
      {/* Floating Red & White Bobber */}
      <group ref={bobberRef} position={lurePos}>
        {/* Upper red hemisphere */}
        <mesh position={[0, 0.025, 0]}>
          <sphereGeometry args={[0.035, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#ef4444" roughness={0.3} />
        </mesh>
        {/* Lower white hemisphere */}
        <mesh position={[0, 0.025, 0]} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.035, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        {/* Bobber Stem */}
        <mesh position={[0, 0.055, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.08, 6]} />
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
      </group>

      {/* Monofilament Fishing Line */}
      <line ref={lineRef}>
        <bufferGeometry ref={lineGeo} />
        <lineBasicMaterial color="#e2e8f0" transparent opacity={0.65} linewidth={1} />
      </line>
    </group>
  )
}
