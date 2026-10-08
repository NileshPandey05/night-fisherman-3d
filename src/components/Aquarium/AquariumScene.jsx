import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Float } from '@react-three/drei'
import { AquariumCausticsMaterial } from './AquariumCausticsMaterial'
import { FishSwarm } from './FishSwarm'

// Submerged decorative sea rock with mossy/coralline tone
function CoralRock({ position, scale = 1, rotation = [0, 0, 0], color = '#2b4c59' }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color={color} roughness={0.8} metalness={0.1} />
    </mesh>
  )
}

// Submerged sea plant/coral branch
function SeaCoral({ position, color = '#e76f51' }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, 1.2, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[0.2, 1.1, 0]} rotation={[0, 0, -0.4]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.8, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      <mesh position={[-0.2, 0.9, 0]} rotation={[0, 0, 0.4]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.7, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    </group>
  )
}

// Semi-transparent aquarium glass container
function AquariumGlass() {
  return (
    <group position={[0, 2.5, 0]}>
      {/* Back Glass */}
      <mesh position={[0, 0, -8]}>
        <planeGeometry args={[16, 5]} />
        <meshPhysicalMaterial
          color="#a2d2ff"
          transparent
          opacity={0.15}
          roughness={0.1}
          transmission={0.8}
          thickness={0.5}
        />
      </mesh>
      {/* Left Glass */}
      <mesh position={[-8, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[16, 5]} />
        <meshPhysicalMaterial
          color="#a2d2ff"
          transparent
          opacity={0.15}
          roughness={0.1}
          transmission={0.8}
          thickness={0.5}
        />
      </mesh>
      {/* Right Glass */}
      <mesh position={[8, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[16, 5]} />
        <meshPhysicalMaterial
          color="#a2d2ff"
          transparent
          opacity={0.15}
          roughness={0.1}
          transmission={0.8}
          thickness={0.5}
        />
      </mesh>
    </group>
  )
}

export function AquariumScene({ config }) {
  const materialRef = useRef()

  const [material] = useState(() => {
    return new AquariumCausticsMaterial({
      level: config.causticLevel ?? 3,
      scale: config.causticScale ?? 4.0,
      speed: config.causticSpeed ?? 0.75,
      intensity: config.causticIntensity ?? 2.2,
      sharpness: config.sharpness ?? 3.5,
      dispersion: config.dispersion ?? 0.015,
      color: config.causticColor ?? '#99e6ff',
      baseColor: config.sandWetColor ?? '#0b2b3d',
      deepColor: config.waterDeepColor ?? '#04121c',
      lightShafts: 0.6,
    })
  })

  useEffect(() => {
    if (!materialRef.current) return
    const mat = materialRef.current
    mat.level = config.causticLevel ?? 3
    mat.scale = config.causticScale ?? 4.0
    mat.speed = config.causticSpeed ?? 0.75
    mat.intensity = config.causticIntensity ?? 2.2
    mat.sharpness = config.sharpness ?? 3.5
    mat.dispersion = config.dispersion ?? 0.015
    mat.color = config.causticColor ?? '#99e6ff'
    mat.baseColor = config.sandWetColor ?? '#0b2b3d'
    mat.deepColor = config.waterDeepColor ?? '#04121c'
  }, [
    config.causticLevel,
    config.causticScale,
    config.causticSpeed,
    config.causticIntensity,
    config.sharpness,
    config.dispersion,
    config.causticColor,
    config.sandWetColor,
    config.waterDeepColor,
  ])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.time = clock.getElapsedTime()
    }
  })

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <>
      {/* Deep Sea Aquarium Atmosphere */}
      <color attach="background" args={['#03101b']} />
      <fog attach="fog" args={['#03101b', 8, 30]} />

      {/* Underwater Lighting */}
      <ambientLight intensity={0.4} color="#56cfe1" />
      <directionalLight position={[0, 12, 0]} intensity={2.0} color="#caf0f8" castShadow />
      <pointLight position={[5, 4, 3]} intensity={1.2} color="#48cae4" />
      <pointLight position={[-5, 3, -3]} intensity={0.8} color="#0077b6" />

      {/* Caustic Floor Terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18, 64, 64]} />
        <primitive object={material} ref={materialRef} attach="material" />
      </mesh>

      {/* Aquarium Glass Enclosure */}
      <AquariumGlass />

      {/* Sea Props & Coral Formations */}
      <CoralRock position={[-4.5, 0.7, -3.5]} scale={[1.8, 1.2, 1.5]} rotation={[0.2, 0.8, 0.1]} />
      <CoralRock position={[5.2, 0.6, 2.8]} scale={[1.4, 0.9, 1.3]} rotation={[0.4, 1.1, -0.3]} />
      <CoralRock position={[3.8, 0.4, -4.2]} scale={[1.1, 0.7, 1.0]} rotation={[-0.2, 0.5, 0.4]} />
      <CoralRock position={[-2.8, 0.5, 4.0]} scale={[1.3, 0.8, 1.2]} rotation={[0.1, 1.4, 0.2]} />

      <SeaCoral position={[-4.2, 0.0, -2.5]} color="#f3722c" />
      <SeaCoral position={[-4.8, 0.0, -4.2]} color="#f9844a" />
      <SeaCoral position={[5.0, 0.0, 3.8]} color="#f94144" />
      <SeaCoral position={[4.0, 0.0, -3.5]} color="#90be6d" />

      {/* Swimming Fish Swarm */}
      <FishSwarm />

      {/* Floating Sea Creature (Manta Ray / Jellyfish abstraction) */}
      <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
        <mesh position={[0, 3.2, 0]} rotation={[-0.2, 0, 0]}>
          <coneGeometry args={[0.8, 0.15, 5]} />
          <meshStandardMaterial color="#48cae4" roughness={0.3} metalness={0.2} />
        </mesh>
      </Float>

      {/* Interactive Orbit Controls */}
      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 1.8, 0]}
      />
    </>
  )
}
