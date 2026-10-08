import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Delaunator from 'delaunator'

// Generate Voronoi / Delaunay shards radiating from impact point
function generateShards(impactX, impactY, count = 120, width = 3.2, height = 2, thickness = 0.05) {
  const hw = width / 2
  const hh = height / 2
  const seeds = []

  // Ring-based radial distribution around impact
  seeds.push([impactX, impactY])
  const rings = 8
  for (let r = 1; r <= rings; r++) {
    const radius = Math.pow(r / rings, 1.8) * Math.max(width, height) * 0.75
    const ptsInRing = Math.round(count * (r / (rings * (rings + 1) / 2)))
    for (let i = 0; i < ptsInRing; i++) {
      const angle = (i / ptsInRing) * Math.PI * 2 + (Math.random() - 0.5) * 0.4
      const dist = radius * (0.8 + Math.random() * 0.4)
      const x = Math.min(hw, Math.max(-hw, impactX + Math.cos(angle) * dist))
      const y = Math.min(hh, Math.max(-hh, impactY + Math.sin(angle) * dist))
      seeds.push([x, y])
    }
  }

  // Add bounding corners
  seeds.push([-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh])
  for (let i = 1; i <= 6; i++) {
    const t = (i / 7) * width - hw
    seeds.push([t, -hh], [t, hh])
  }
  for (let i = 1; i <= 4; i++) {
    const t = (i / 5) * height - hh
    seeds.push([-hw, t], [hw, t])
  }

  const coords = seeds.flat()
  const delaunay = new Delaunator(coords)
  const triangles = delaunay.triangles

  const shards = []
  for (let i = 0; i < triangles.length; i += 3) {
    const p0 = seeds[triangles[i]]
    const p1 = seeds[triangles[i + 1]]
    const p2 = seeds[triangles[i + 2]]

    const cx = (p0[0] + p1[0] + p2[0]) / 3
    const cy = (p0[1] + p1[1] + p2[1]) / 3

    // Create 2D triangle shape relative to its centroid
    const shape = new THREE.Shape()
    shape.moveTo(p0[0] - cx, p0[1] - cy)
    shape.lineTo(p1[0] - cx, p1[1] - cy)
    shape.lineTo(p2[0] - cx, p2[1] - cy)
    shape.closePath()

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.003,
      bevelThickness: 0.003
    })
    geo.center()

    const distFromImpact = Math.hypot(cx - impactX, cy - impactY)
    const angle = Math.atan2(cy - impactY, cx - impactX)
    const speed = 1.8 + Math.max(0, 3.2 - distFromImpact * 2.0) + Math.random() * 1.5
    const forwardSpeed = (0.5 + Math.random() * 1.8) * (distFromImpact < 0.6 ? 2.2 : 1.0)

    shards.push({
      geo,
      initialPos: new THREE.Vector3(cx, cy + 1.25, 0),
      pos: new THREE.Vector3(cx, cy + 1.25, 0),
      rot: new THREE.Euler(0, 0, 0),
      vel: new THREE.Vector3(
        Math.cos(angle) * speed * 0.7 + (Math.random() - 0.5) * 0.5,
        Math.sin(angle) * speed * 0.7 + 0.8 + Math.random() * 0.8,
        forwardSpeed * (Math.random() > 0.4 ? 1 : -0.5)
      ),
      angVel: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      ),
      glow: Math.max(0, 1.0 - distFromImpact / 0.8)
    })
  }

  return { shards, seeds }
}

export function ShatterStage({ level = 3, params = {} }) {
  const [shattered, setShattered] = useState(false)
  const [impactPt, setImpactPt] = useState([0, 0])
  const glassRef = useRef()
  const shardsDataRef = useRef([])
  const shardMeshesRef = useRef([])

  const count = params.count ?? 180
  const freeze = !!params.freeze
  const slowMotion = !!params.slowMotion
  const showSeeds = !!params.seeds

  const glassMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#e8fffc',
      transmission: 0.98,
      thickness: 0.08,
      roughness: 0.04,
      ior: 1.52,
      attenuationColor: new THREE.Color('#b3e2d7'),
      attenuationDistance: 2.8,
      reflectivity: 0.5,
      transparent: true,
      opacity: 1.0
    })
  }, [])

  const shardMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: '#e8fffc',
      transmission: 0.96,
      thickness: 0.06,
      roughness: 0.05,
      ior: 1.5,
      attenuationColor: new THREE.Color('#b3e2d7'),
      attenuationDistance: 2.5,
      emissive: new THREE.Color('#cbefff'),
      emissiveIntensity: 0.4,
      transparent: true
    })
  }, [])

  const handlePointerDown = (e) => {
    if (shattered) return
    e.stopPropagation()
    const hitPoint = e.point
    // Local coords on the glass pane at y = 1.25, z = 0
    const localX = Math.min(1.55, Math.max(-1.55, hitPoint.x))
    const localY = Math.min(0.95, Math.max(-0.95, hitPoint.y - 1.25))

    const { shards } = generateShards(localX, localY, count, 3.2, 2, 0.05)
    shardsDataRef.current = shards
    setImpactPt([localX, localY])
    setShattered(true)
  }

  const handleReset = useCallback(() => {
    setShattered(false)
    shardsDataRef.current = []
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        handleReset()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleReset])

  useFrame((_, delta) => {
    if (!shattered || freeze) return

    const dt = Math.min(delta, 0.033) * (slowMotion ? 0.15 : 1.0)
    const gravity = -9.8
    const shards = shardsDataRef.current

    for (let i = 0; i < shards.length; i++) {
      const s = shards[i]
      const mesh = shardMeshesRef.current[i]
      if (!mesh) continue

      s.vel.y += gravity * dt
      s.pos.addScaledVector(s.vel, dt)

      // Floor collision
      if (s.pos.y < 0.03) {
        s.pos.y = 0.03
        s.vel.y = -s.vel.y * 0.25
        s.vel.x *= 0.8
        s.vel.z *= 0.8
        s.angVel.multiplyScalar(0.7)
      }

      mesh.position.copy(s.pos)
      mesh.rotation.x += s.angVel.x * dt
      mesh.rotation.y += s.angVel.y * dt
      mesh.rotation.z += s.angVel.z * dt
    }
  })

  return (
    <group>
      {/* Lighting */}
      <directionalLight
        position={[-8, 16, 9]}
        intensity={3.0}
        color="#e6f2ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#d6eaff', '#102a48', 1.0]} />

      {/* 3 Colorful Backdrop Spheres */}
      <mesh position={[-1.25, 1.1, -1.1]} castShadow>
        <sphereGeometry args={[0.75, 40, 24]} />
        <meshStandardMaterial color="#dd9474" roughness={0.33} metalness={0.15} />
      </mesh>
      <mesh position={[0.4, 0.85, -1.45]} castShadow>
        <sphereGeometry args={[0.72, 40, 24]} />
        <meshStandardMaterial color="#5cacaa" roughness={0.33} metalness={0.15} />
      </mesh>
      <mesh position={[1.4, 1.6, -1.7]} castShadow>
        <sphereGeometry args={[0.6, 40, 24]} />
        <meshStandardMaterial color="#aeacd3" roughness={0.33} metalness={0.15} />
      </mesh>

      {/* Support Stand Base */}
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[3.55, 0.22, 0.55]} />
        <meshStandardMaterial color="#123550" roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Intact Glass Pane */}
      {!shattered && (
        <mesh
          ref={glassRef}
          position={[0, 1.25, 0]}
          material={glassMaterial}
          onPointerDown={handlePointerDown}
          castShadow
        >
          <boxGeometry args={[3.2, 2, 0.05]} />
        </mesh>
      )}

      {/* Shattered Shards */}
      {shattered && (
        <group>
          {shardsDataRef.current.map((s, idx) => (
            <mesh
              key={idx}
              ref={(el) => (shardMeshesRef.current[idx] = el)}
              geometry={s.geo}
              material={shardMaterial}
              position={[s.pos.x, s.pos.y, s.pos.z]}
              castShadow
            />
          ))}
        </group>
      )}

      {/* Reset Hint Button in 3D scene if shattered */}
      {shattered && (
        <mesh position={[0, 2.45, 0]} onClick={handleReset}>
          <planeGeometry args={[1.4, 0.35]} />
          <meshBasicMaterial color="#00e5ff" transparent opacity={0.8} />
        </mesh>
      )}

      {/* Ground Floor */}
      <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#062e48" roughness={0.65} metalness={0.15} />
      </mesh>
    </group>
  )
}
