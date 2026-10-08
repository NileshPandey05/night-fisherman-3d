import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const MAX_DROPLETS = 240

export const SplashDroplets = forwardRef(function SplashDroplets(props, ref) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Particle state arrays
  const particles = useMemo(() => {
    const pos = new Float32Array(MAX_DROPLETS * 3)
    const vel = new Float32Array(MAX_DROPLETS * 3)
    const life = new Float32Array(MAX_DROPLETS) // remaining life in seconds
    return { pos, vel, life, nextIndex: 0 }
  }, [])

  useImperativeHandle(ref, () => ({
    spawnSplash(x, z, intensity = 1.0) {
      const { pos, vel, life } = particles
      const count = Math.min(24, Math.floor(14 * intensity))

      for (let i = 0; i < count; i++) {
        const idx = (particles.nextIndex + i) % MAX_DROPLETS
        const i3 = idx * 3

        pos[i3] = x + (Math.random() - 0.5) * 0.08
        pos[i3 + 1] = 0.02
        pos[i3 + 2] = z + (Math.random() - 0.5) * 0.08

        const angle = Math.random() * Math.PI * 2.0
        const speed = 0.8 + Math.random() * 1.6 * intensity
        vel[i3] = Math.cos(angle) * speed
        vel[i3 + 1] = 1.6 + Math.random() * 2.2 * intensity // upward burst
        vel[i3 + 2] = Math.sin(angle) * speed

        life[idx] = 0.6 + Math.random() * 0.4
      }

      particles.nextIndex = (particles.nextIndex + count) % MAX_DROPLETS
    }
  }))

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const dt = Math.min(delta, 0.05)
    const { pos, vel, life } = particles

    for (let i = 0; i < MAX_DROPLETS; i++) {
      const i3 = i * 3
      if (life[i] > 0) {
        life[i] -= dt
        vel[i3 + 1] -= 9.81 * dt // Gravity
        pos[i3] += vel[i3] * dt
        pos[i3 + 1] += vel[i3 + 1] * dt
        pos[i3 + 2] += vel[i3 + 2] * dt

        // Despawn on water surface
        if (pos[i3 + 1] < 0.0) {
          life[i] = 0
        }

        const scale = Math.max(0.001, (life[i] / 0.8) * 0.035)
        dummy.position.set(pos[i3], pos[i3 + 1], pos[i3 + 2])
        dummy.scale.set(scale, scale * 1.5, scale)
        dummy.updateMatrix()
      } else {
        dummy.position.set(0, -100, 0)
        dummy.scale.set(0.001, 0.001, 0.001)
        dummy.updateMatrix()
      }
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, MAX_DROPLETS]}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color="#d4f1ff" transparent opacity={0.85} />
    </instancedMesh>
  )
})
