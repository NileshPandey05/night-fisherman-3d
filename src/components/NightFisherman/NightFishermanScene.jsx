import { useState, useRef, useCallback } from 'react'
import { OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { OceanWater } from './OceanWater'
import { BambooRaft } from './BambooRaft'
import { FishSchool } from './FishSchool'
import { PredatorCreature } from './PredatorCreature'
import { SplashDroplets } from './SplashDroplets'
import { VolumetricLightShafts } from './VolumetricLightShafts'
import { DistantBoats } from './DistantBoats'
import { FishingLure } from './FishingLure'
import { BloomPass } from './BloomPass'
import { SeabedFloor } from './SeabedFloor'

function GlowingMoon({ position = [26, 36, -46] }) {
  return (
    <group position={position}>
      {/* Luminous Moon Sphere */}
      <mesh>
        <sphereGeometry args={[2.9, 32, 32]} />
        <meshBasicMaterial color="#f0f7ff" />
      </mesh>

      {/* Multi-Layer Soft Lunar Halo Atmosphere */}
      <mesh>
        <sphereGeometry args={[3.8, 24, 24]} />
        <meshBasicMaterial
          color="#aed8ff"
          transparent
          opacity={0.24}
          side={THREE.BackSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[5.6, 24, 24]} />
        <meshBasicMaterial
          color="#7dbbff"
          transparent
          opacity={0.09}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}

export function NightFishermanScene({
  motionMode = 'milling',
  millingDirection = 1,
  bloomEnabled = true,
  isAttacking = false,
  causticsEnabled = true,
  causticIntensity = 1.85
}) {
  const [lanternPos, setLanternPos] = useState([0, 1.8, 0])
  const [predatorPos, setPredatorPos] = useState([0, -2, 0])
  const [internalAttacking, setInternalAttacking] = useState(false)
  const isPredatorAttacking = isAttacking || internalAttacking
  const [ripples, setRipples] = useState([])
  const [lurePos, setLurePos] = useState([0.35, 0, 2.3])
  const dropletsRef = useRef()

  const moonPos = [26, 36, -46]
  const rodTipPos = [0.08, 0.72, 0.42] // Estimated rod tip in raft frame

  // Handle splash event from leaping fish
  const handleSplash = useCallback((x, z, amplitude = 0.08) => {
    const now = performance.now() / 1000.0

    // Add ripple to ocean water shader
    setRipples((prev) => {
      return [...prev.slice(-11), { x, z, startTime: now, amplitude }]
    })

    // Spawn droplet particles
    if (dropletsRef.current) {
      dropletsRef.current.spawnSplash(x, z, amplitude * 12.0)
    }
  }, [])

  // Click on water to cast the fishing line
  const handleWaterClick = (event) => {
    if (event.point) {
      const { x, z } = event.point
      // Keep lure within reasonable casting range
      const dist = Math.sqrt(x * x + z * z)
      if (dist < 8.0) {
        setLurePos([x, 0, z])
        handleSplash(x, z, 0.12)
      }
    }
  }

  return (
    <>
      {/* Nocturnal Moonlit Atmosphere */}
      <color attach="background" args={['#02081a']} />
      <fogExp2 attach="fog" args={['#02081a', 0.020]} />

      {/* Glowing 3D Moon in Sky */}
      <GlowingMoon position={moonPos} />

      {/* Moonlight Directional Light creating the Moon Glade across the sea */}
      <directionalLight
        position={moonPos}
        color="#b4d7ff"
        intensity={1.3}
      />
      <ambientLight color="#061226" intensity={0.30} />

      {/* Starry Night Sky */}
      <Stars
        radius={95}
        depth={50}
        count={3000}
        factor={4.0}
        saturation={0.5}
        fade
        speed={0.6}
      />

      <OrbitControls
        makeDefault
        target={[0, 0.3, 0]}
        minDistance={2.5}
        maxDistance={26.0}
        maxPolarAngle={Math.PI * 0.49}
        enableDamping
        dampingFactor={0.05}
      />

      {/* Distant Horizon Silhouette Fishing Boats */}
      <DistantBoats />

      {/* Undulating Seabed with Wawa Sensei Level 3 Chromatic Caustics */}
      <SeabedFloor
        lanternPos={lanternPos}
        moonPos={moonPos}
        causticsEnabled={causticsEnabled}
        causticIntensity={causticIntensity}
      />

      {/* Interactive Translucent Ocean Water Plane */}
      <group onClick={handleWaterClick}>
        <OceanWater
          ripples={ripples}
          lanternPos={lanternPos}
          moonPos={moonPos}
          causticsEnabled={causticsEnabled}
          causticIntensity={causticIntensity}
        />
      </group>

      {/* Buoyant Bamboo Raft with Seated Fisherman & Warm Oil Lantern */}
      <BambooRaft onLanternPosChange={setLanternPos} />

      {/* Volumetric Underwater Amber Light Shafts (God Rays) */}
      <VolumetricLightShafts lanternPos={lanternPos} />

      {/* Interactive Fishing Lure & Line */}
      <FishingLure
        rodTipPos={rodTipPos}
        lurePos={lurePos}
      />

      {/* 1,000 Anatomical Fish with Biological Swarm Dynamics */}
      <FishSchool
        lanternPos={lanternPos}
        predatorPos={predatorPos}
        isPredatorAttacking={isPredatorAttacking}
        motionMode={motionMode}
        millingDirection={millingDirection}
        lurePos={lurePos}
        onSplash={handleSplash}
      />

      {/* Stalking Predator Creature */}
      <PredatorCreature
        onPositionUpdate={setPredatorPos}
        isAttacking={isPredatorAttacking}
      />

      {/* Airborne Splash Water Droplet Particles */}
      <SplashDroplets ref={dropletsRef} />

      {/* Post-Processing Luminous Bloom */}
      <BloomPass enabled={bloomEnabled} strength={0.30} radius={0.52} threshold={0.72} />
    </>
  )
}
