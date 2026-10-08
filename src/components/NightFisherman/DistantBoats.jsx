import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleGerstnerWater } from './OceanWater'

const BOATS = [
  { id: 1, basePos: [-22, 0, -36], scale: 0.65, phase: 1.2 },
  { id: 2, basePos: [24, 0, -46], scale: 0.55, phase: 2.8 },
  { id: 3, basePos: [-8, 0, -54], scale: 0.45, phase: 4.5 }
]

export function DistantBoats() {
  const groupsRef = useRef([])

  useFrame((state) => {
    const time = state.clock.getElapsedTime()

    BOATS.forEach((b, idx) => {
      const grp = groupsRef.current[idx]
      if (!grp) return

      // Float on the Gerstner swell
      const water = sampleGerstnerWater(b.basePos[0], b.basePos[2], time)
      grp.position.y = water.elevation + 0.04

      // Gentle rocking
      grp.rotation.z = Math.sin(time * 0.9 + b.phase) * 0.045
      grp.rotation.x = Math.sin(time * 0.7 + b.phase * 1.3) * 0.035
    })
  })

  return (
    <group>
      {BOATS.map((b, idx) => (
        <group
          key={b.id}
          ref={(el) => (groupsRef.current[idx] = el)}
          position={b.basePos}
          scale={b.scale}
        >
          {/* Small Hull */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.08, 0.09, 3.2, 6]} />
            <meshStandardMaterial color="#1c1611" roughness={0.9} />
          </mesh>

          {/* Fisherman Silhouette */}
          <mesh position={[0, 0.45, -0.2]}>
            <cylinderGeometry args={[0.08, 0.12, 0.7, 6]} />
            <meshStandardMaterial color="#0c121c" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.85, -0.2]}>
            <coneGeometry args={[0.26, 0.12, 10]} />
            <meshStandardMaterial color="#1a140d" roughness={0.9} />
          </mesh>

          {/* Distant Lantern Pole & Flame */}
          <mesh position={[0.2, 0.7, 0.4]}>
            <cylinderGeometry args={[0.02, 0.02, 1.4, 4]} />
            <meshStandardMaterial color="#1c1611" roughness={0.9} />
          </mesh>
          
          {/* Glowing Distant Lantern Point */}
          <group position={[0.2, 1.25, 0.5]}>
            <mesh>
              <sphereGeometry args={[0.065, 8, 8]} />
              <meshBasicMaterial color="#ffb44a" />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.22, 8, 8]} />
              <meshBasicMaterial color="#ff9020" transparent opacity={0.25} />
            </mesh>
            <pointLight color="#ffaa33" intensity={6.0} distance={12.0} decay={2.0} />
          </group>
        </group>
      ))}
    </group>
  )
}
