import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export function PredatorCreature({ onPositionUpdate, isAttacking }) {
  const groupRef = useRef()
  const tailRef = useRef()

  // Procedural sleek predator silhouette geometry
  const bodyGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(0.18, 1.25, 8, 2)
    geo.rotateX(Math.PI / 2)
    geo.scale(0.65, 1.2, 1.0)
    return geo
  }, [])

  const currentPos = useMemo(() => new THREE.Vector3(0, -2, 0), [])
  const forwardVec = useMemo(() => new THREE.Vector3(), [])

  useFrame((state, delta) => {
    if (!groupRef.current) return
    const time = state.clock.getElapsedTime()
    const dt = Math.min(delta, 0.05)

    // Orbital path when circling vs swift direct dash when attacking
    let targetX, targetY, targetZ, speed
    if (isAttacking) {
      // Direct high-speed sprint across the center under the raft
      speed = 4.2
      const dashProgress = (time * 0.8) % 4.0
      targetX = (dashProgress - 2.0) * 4.5
      targetY = -1.4 + Math.sin(time * 3.0) * 0.3
      targetZ = Math.sin(dashProgress * Math.PI) * 1.5
    } else {
      // Wide circular prowl around the school
      speed = 1.6
      const angle = time * 0.45
      const radius = 4.8 + Math.sin(time * 0.3) * 0.6
      targetX = Math.cos(angle) * radius
      targetY = -2.2 + Math.sin(time * 0.6) * 0.4
      targetZ = Math.sin(angle) * radius
    }

    // Smooth movement
    currentPos.x = THREE.MathUtils.lerp(currentPos.x, targetX, dt * speed * 1.5)
    currentPos.y = THREE.MathUtils.lerp(currentPos.y, targetY, dt * speed)
    currentPos.z = THREE.MathUtils.lerp(currentPos.z, targetZ, dt * speed * 1.5)

    // Calculate heading direction
    forwardVec.set(targetX - currentPos.x, targetY - currentPos.y, targetZ - currentPos.z).normalize()
    if (forwardVec.lengthSq() > 0.001) {
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), forwardVec)
      groupRef.current.quaternion.slerp(targetQuat, 0.08)
    }

    groupRef.current.position.copy(currentPos)

    // Tail oscillation
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(time * 8.0) * 0.35
    }

    // Report position to parent for fish evasion
    if (onPositionUpdate) {
      onPositionUpdate([currentPos.x, currentPos.y, currentPos.z])
    }
  })

  return (
    <group ref={groupRef} position={[0, -2, 0]}>
      {/* Torpedo-shaped predator body */}
      <mesh geometry={bodyGeo}>
        <meshStandardMaterial
          color="#0d1b2a"
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Dorsal Fin */}
      <mesh position={[0, 0.18, 0.05]} rotation={[-0.4, 0, 0]}>
        <coneGeometry args={[0.04, 0.32, 4]} />
        <meshStandardMaterial color="#0b1622" roughness={0.4} />
      </mesh>

      {/* Pectoral Fins */}
      <mesh position={[0.18, -0.05, 0.2]} rotation={[0, 0.3, -0.7]}>
        <coneGeometry args={[0.03, 0.35, 4]} />
        <meshStandardMaterial color="#0b1622" roughness={0.4} />
      </mesh>
      <mesh position={[-0.18, -0.05, 0.2]} rotation={[0, -0.3, 0.7]}>
        <coneGeometry args={[0.03, 0.35, 4]} />
        <meshStandardMaterial color="#0b1622" roughness={0.4} />
      </mesh>

      {/* Caudal Tail Fin */}
      <group ref={tailRef} position={[0, 0, -0.6]}>
        <mesh position={[0, 0, -0.15]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.22, 0.18, 4]} />
          <meshStandardMaterial color="#08101a" roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}
