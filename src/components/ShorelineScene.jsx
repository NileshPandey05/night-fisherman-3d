import { OrbitControls, Float } from '@react-three/drei'
import { ShorelineSimulation } from './Shoreline'

// Decorative floating buoy to provide realistic ocean scale and wave response
function OceanBuoy({ position }) {
  return (
    <Float speed={2.5} rotationIntensity={0.6} floatIntensity={0.8}>
      <group position={position}>
        {/* Float base ring */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.25, 24]} />
          <meshStandardMaterial color="#f77f00" roughness={0.3} metalness={0.1} />
        </mesh>
        {/* Beacon pole */}
        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.7, 12]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Top light beacon */}
        <mesh position={[0, 0.95, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#fcbf49" emissive="#fcbf49" emissiveIntensity={0.6} />
        </mesh>
      </group>
    </Float>
  )
}

// Decorative coastal rocks on the beach
function BeachRock({ position, scale, rotation }) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#4a4e69" roughness={0.85} metalness={0.05} />
    </mesh>
  )
}

export function ShorelineScene({ config }) {
  return (
    <>
      {/* Sky & Coastal Atmosphere */}
      <color attach="background" args={['#a2d2ff']} />
      <fog attach="fog" args={['#bde0fe', 25, 70]} />

      {/* Sun & Ambient Lighting */}
      <ambientLight intensity={0.55} color="#e0fbfc" />
      <directionalLight
        position={[14, 20, 12]}
        intensity={1.8}
        color="#fff3b0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
      />
      <directionalLight position={[-10, 12, -10]} intensity={0.4} color="#90e0ef" />

      {/* Shoreline Simulation */}
      <ShorelineSimulation config={config} />

      {/* Coastal Scale Anchors & Props */}
      <OceanBuoy position={[-6.0, 0.4, -9.0]} />
      <BeachRock position={[8.5, 0.6, 3.5]} scale={[1.4, 0.9, 1.2]} rotation={[0.4, 0.6, 0.2]} />
      <BeachRock position={[9.8, 0.4, 2.8]} scale={[0.8, 0.6, 0.9]} rotation={[0.1, 1.2, 0.5]} />
      <BeachRock position={[-9.2, 0.3, 2.0]} scale={[1.2, 0.7, 1.0]} rotation={[0.3, 0.8, -0.2]} />

      {/* Camera Orbit Controls */}
      <OrbitControls
        makeDefault
        minDistance={4}
        maxDistance={40}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 0, -2]}
      />
    </>
  )
}
