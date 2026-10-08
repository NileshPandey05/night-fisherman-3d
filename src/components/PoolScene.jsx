import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Float } from '@react-three/drei'
import { Caustics } from './Caustics'

// A floating decorative pool ring / sphere to showcase light interaction
function FloatingBall({ position, color }) {
  const meshRef = useRef()

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * 0.4
      meshRef.current.rotation.y += delta * 0.6
    }
  })

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.6}>
      <mesh ref={meshRef} position={position} castShadow>
        <torusGeometry args={[0.7, 0.28, 16, 32]} />
        <meshStandardMaterial color={color} roughness={0.2} metalness={0.1} />
      </mesh>
    </Float>
  )
}

function PoolWalls() {
  const wallMaterial = (
    <meshStandardMaterial
      color="#073b4c"
      roughness={0.3}
      metalness={0.1}
    />
  )

  return (
    <group position={[0, 1.5, 0]}>
      {/* Back Wall */}
      <mesh position={[0, 0, -10]}>
        <planeGeometry args={[20, 3]} />
        {wallMaterial}
      </mesh>
      {/* Front Wall */}
      <mesh position={[0, 0, 10]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[20, 3]} />
        {wallMaterial}
      </mesh>
      {/* Left Wall */}
      <mesh position={[-10, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[20, 3]} />
        {wallMaterial}
      </mesh>
      {/* Right Wall */}
      <mesh position={[10, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[20, 3]} />
        {wallMaterial}
      </mesh>
    </group>
  )
}

export function PoolScene({ config }) {
  return (
    <>
      <color attach="background" args={['#020b14']} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[8, 12, 5]} intensity={1.5} color="#d4f1f9" />
      <pointLight position={[-6, 6, -6]} intensity={0.8} color="#48cae4" />

      {/* Pool Basin Walls */}
      <PoolWalls />

      {/* Underwater Caustics Floor */}
      <Caustics
        position={[0, 0, 0]}
        planeSize={[20, 20]}
        scale={config.scale}
        speed={config.speed}
        intensity={config.intensity}
        distortion={config.distortion}
        edgeWidth={config.edgeWidth}
        sharpness={config.sharpness}
        glow={config.glow}
        dispersion={config.dispersion}
        color={config.color}
        baseColor={config.baseColor}
        debugMode={config.debugMode}
      />

      {/* Floating 3D elements */}
      <FloatingBall position={[-2.5, 1.2, -1.5]} color="#ff595e" />
      <FloatingBall position={[2.8, 1.4, 1.8]} color="#ffca3a" />
      <FloatingBall position={[0.5, 1.0, -3.2]} color="#8ac926" />

      {/* Orbit Controls */}
      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2 - 0.05} // Keep camera above pool floor
        target={[0, 0.5, 0]}
      />
    </>
  )
}
