import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'

function SingleFish({ offset, speed, color, scale = 1 }) {
  const groupRef = useRef()
  const tailRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * speed + offset

    if (groupRef.current) {
      // Swarm swim trajectory: elliptical figure-8 in 3D
      const x = Math.sin(t * 0.5) * 5.5 + Math.cos(t * 0.3) * 1.5
      const y = Math.sin(t * 0.8) * 1.2 + 1.8
      const z = Math.cos(t * 0.5) * 4.5 + Math.sin(t * 0.4) * 1.2

      groupRef.current.position.set(x, y, z)

      // Calculate swimming direction tangent for smooth heading rotation
      const nextX = Math.sin((t + 0.05) * 0.5) * 5.5 + Math.cos((t + 0.05) * 0.3) * 1.5
      const nextZ = Math.cos((t + 0.05) * 0.5) * 4.5 + Math.sin((t + 0.05) * 0.4) * 1.2
      const angle = Math.atan2(nextX - x, nextZ - z)
      groupRef.current.rotation.y = angle + Math.PI / 2
      groupRef.current.rotation.z = Math.sin(t * 4.0) * 0.1
    }

    if (tailRef.current) {
      // Sinusoidal tail wiggle
      tailRef.current.rotation.y = Math.sin(t * 7.0) * 0.45
    }
  })

  return (
    <group ref={groupRef} scale={[scale, scale, scale]}>
      {/* Fish Body */}
      <mesh castShadow>
        <coneGeometry args={[0.22, 0.9, 16]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>

      {/* Fish Eye */}
      <mesh position={[-0.08, 0.06, 0.3]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.08, 0.06, 0.3]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Wiggling Tail */}
      <group ref={tailRef} position={[0, 0, -0.45]}>
        <mesh position={[0, 0, -0.2]}>
          <coneGeometry args={[0.18, 0.4, 4]} />
          <meshStandardMaterial color={color} roughness={0.3} />
        </mesh>
      </group>
    </group>
  )
}

export function FishSwarm() {
  const fishes = useMemo(() => [
    { id: 1, offset: 0.0, speed: 0.9, color: '#ff7b00', scale: 0.8 },
    { id: 2, offset: 1.4, speed: 1.0, color: '#ffb703', scale: 0.7 },
    { id: 3, offset: 2.8, speed: 0.85, color: '#fb8500', scale: 0.9 },
    { id: 4, offset: 4.2, speed: 1.1, color: '#023e8a', scale: 0.75 },
    { id: 5, offset: 5.6, speed: 0.95, color: '#0077b6', scale: 0.85 },
    { id: 6, offset: 7.0, speed: 1.05, color: '#ff006e', scale: 0.65 },
  ], [])

  return (
    <group>
      {fishes.map(f => (
        <SingleFish
          key={f.id}
          offset={f.offset}
          speed={f.speed}
          color={f.color}
          scale={f.scale}
        />
      ))}
    </group>
  )
}
