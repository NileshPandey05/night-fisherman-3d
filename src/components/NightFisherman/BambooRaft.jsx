import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sampleGerstnerWater } from './OceanWater'

export function BambooRaft({ onLanternPosChange }) {
  const raftGroupRef = useRef()
  const lanternLightRef = useRef()
  const flameMeshRef = useRef()

  // Construct procedural bamboo raft logs
  const logs = useMemo(() => {
    const list = []
    const logCount = 8
    const raftWidth = 1.3
    const spacing = raftWidth / (logCount - 1)

    for (let i = 0; i < logCount; i++) {
      const x = -raftWidth / 2 + i * spacing
      const length = 3.6 - Math.abs(x) * 0.45
      list.push({ id: i, x, length, radius: 0.065 + (i % 2) * 0.005 })
    }
    return list
  }, [])

  // Volumetric light cone
  const coneGeo = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.08, 2.8, 3.8, 24, 1, true)
    geo.translate(0, -1.9, 0)
    return geo
  }, [])

  const coneMat = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color('#ffaa33') },
        uOpacity: { value: 0.16 }
      },
      vertexShader: /* glsl */ `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vPosition;
        void main() {
          float h = clamp(-vPosition.y / 3.8, 0.0, 1.0);
          float alpha = (1.0 - h) * pow(h, 0.4) * uOpacity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    })
  }, [])

  const lanternWorldPos = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    if (!raftGroupRef.current) return
    const time = state.clock.getElapsedTime()
    const raft = raftGroupRef.current

    // Sample 4 float points around raft perimeter
    const raftPos = raft.position
    const pFL = sampleGerstnerWater(raftPos.x - 0.6, raftPos.z + 1.4, time)
    const pFR = sampleGerstnerWater(raftPos.x + 0.6, raftPos.z + 1.4, time)
    const pBL = sampleGerstnerWater(raftPos.x - 0.6, raftPos.z - 1.4, time)
    const pBR = sampleGerstnerWater(raftPos.x + 0.6, raftPos.z - 1.4, time)

    const targetY = (pFL.elevation + pFR.elevation + pBL.elevation + pBR.elevation) / 4.0 + 0.05
    raft.position.y = THREE.MathUtils.lerp(raft.position.y, targetY, 0.06)

    const vF = (pFL.elevation + pFR.elevation) * 0.5
    const vB = (pBL.elevation + pBR.elevation) * 0.5
    const vL = (pFL.elevation + pBL.elevation) * 0.5
    const vR = (pFR.elevation + pBR.elevation) * 0.5

    const pitch = Math.atan2(vB - vF, 2.8) * 0.8
    const roll = Math.atan2(vL - vR, 1.2) * 0.8

    const targetEuler = new THREE.Euler(pitch, 0, roll, 'XYZ')
    const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler)
    raft.quaternion.slerp(targetQuat, 0.05)

    raft.position.x = Math.sin(time * 0.15) * 0.25
    raft.position.z = Math.cos(time * 0.12) * 0.2

    // Lantern flame flicker
    if (lanternLightRef.current) {
      const flicker = 1.0 + Math.sin(time * 12.0) * 0.08 + Math.sin(time * 23.0) * 0.05
      lanternLightRef.current.intensity = 52.0 * flicker
      
      lanternLightRef.current.getWorldPosition(lanternWorldPos)
      if (onLanternPosChange) {
        onLanternPosChange([lanternWorldPos.x, lanternWorldPos.y, lanternWorldPos.z])
      }
    }

    if (flameMeshRef.current) {
      const scale = 1.0 + Math.sin(time * 15.0) * 0.12
      flameMeshRef.current.scale.set(scale, scale * 1.1, scale)
    }
  })

  return (
    <group ref={raftGroupRef} position={[0, 0, 0]}>
      {/* Bamboo Logs */}
      {logs.map((log) => (
        <group key={log.id} position={[log.x, 0, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[log.radius * 0.95, log.radius, log.length, 12, 5]} />
            <meshStandardMaterial color="#9e7c44" roughness={0.7} metalness={0.1} />
          </mesh>

          {/* Bamboo Joint Node Rings */}
          {[-1.2, -0.6, 0, 0.6, 1.2].map((nodeZ, idx) => (
            <mesh key={idx} position={[0, 0, nodeZ]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[log.radius * 1.02, 0.008, 8, 16]} />
              <meshStandardMaterial color="#664927" roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Cross Bracing Poles */}
      {[-1.1, 0, 1.1].map((braceZ, idx) => (
        <mesh key={idx} position={[0, 0.07, braceZ]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.04, 1.38, 8]} />
          <meshStandardMaterial color="#7a5e33" roughness={0.75} />
        </mesh>
      ))}

      {/* Dark Hemp Rope Lashings */}
      {[-1.1, 0, 1.1].map((rz, i) => (
        [-0.55, -0.2, 0.2, 0.55].map((rx, j) => (
          <mesh key={`${i}-${j}`} position={[rx, 0.08, rz]}>
            <sphereGeometry args={[0.038, 8, 8]} />
            <meshStandardMaterial color="#2d241e" roughness={0.9} />
          </mesh>
        ))
      ))}

      {/* Vertical Bamboo Pole with Hanging Lantern */}
      <group position={[0.35, 0, -0.6]}>
        <mesh position={[0, 1.45, 0]} rotation={[0.04, 0, -0.06]}>
          <cylinderGeometry args={[0.032, 0.038, 3.1, 10]} />
          <meshStandardMaterial color="#8a6c38" roughness={0.7} />
        </mesh>

        {/* Cantilever arm for lantern */}
        <mesh position={[-0.22, 2.35, 0.1]} rotation={[0, 0, -Math.PI / 4]}>
          <cylinderGeometry args={[0.02, 0.025, 0.65, 8]} />
          <meshStandardMaterial color="#735728" roughness={0.7} />
        </mesh>

        {/* Rope Cord */}
        <mesh position={[-0.42, 2.05, 0.15]}>
          <cylinderGeometry args={[0.005, 0.005, 0.35, 6]} />
          <meshStandardMaterial color="#1a1410" roughness={0.9} />
        </mesh>

        {/* Hanging Lantern Unit */}
        <group position={[-0.42, 1.82, 0.15]}>
          <mesh position={[0, 0.12, 0]}>
            <coneGeometry args={[0.09, 0.07, 6]} />
            <meshStandardMaterial color="#1f1d1c" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.07, 0.08, 0.04, 6]} />
            <meshStandardMaterial color="#1f1d1c" metalness={0.7} roughness={0.4} />
          </mesh>

          {/* Translucent Amber Glass */}
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.065, 0.065, 0.2, 12]} />
            <meshPhysicalMaterial
              color="#ffaa3b"
              transmission={0.85}
              opacity={1}
              transparent
              roughness={0.15}
              ior={1.5}
            />
          </mesh>

          {/* Glowing Flame Core */}
          <mesh ref={flameMeshRef} position={[0, -0.02, 0]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshBasicMaterial color="#fff3b0" />
          </mesh>

          {/* Point Light with physical inverse-square falloff */}
          <pointLight
            ref={lanternLightRef}
            color="#ff9933"
            intensity={52.0}
            distance={32.0}
            decay={2.0}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />

          {/* Volumetric Soft Downward Light Cone */}
          <mesh geometry={coneGeo} material={coneMat} />
        </group>
      </group>

      {/* Traditional Bamboo Stool / Chair */}
      <group position={[-0.05, 0.07, -0.2]}>
        {/* Stool Legs */}
        {[-0.14, 0.14].map((lx, i) => (
          [-0.12, 0.12].map((lz, j) => (
            <mesh key={`stool-${i}-${j}`} position={[lx, 0.15, lz]}>
              <cylinderGeometry args={[0.022, 0.022, 0.3, 6]} />
              <meshStandardMaterial color="#6e532b" roughness={0.75} />
            </mesh>
          ))
        ))}

        {/* Stool Seat Slats */}
        {[-0.08, -0.025, 0.03, 0.08].map((sz, idx) => (
          <mesh key={`seat-${idx}`} position={[0, 0.31, sz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.024, 0.024, 0.36, 6]} />
            <meshStandardMaterial color="#876837" roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Fisherman Seated on the Stool */}
      <group position={[-0.05, 0.38, -0.2]} rotation={[0, 0.25, 0]}>
        {/* Lower body (hips on seat) */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.26, 0.12, 0.24]} />
          <meshStandardMaterial color="#162030" roughness={0.9} />
        </mesh>

        {/* Thighs extending forward */}
        <mesh position={[-0.09, 0.05, 0.16]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.06, 0.32, 6]} />
          <meshStandardMaterial color="#162030" roughness={0.9} />
        </mesh>
        <mesh position={[0.09, 0.05, 0.16]} rotation={[0.4, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.06, 0.32, 6]} />
          <meshStandardMaterial color="#162030" roughness={0.9} />
        </mesh>

        {/* Calves & feet resting on raft floor */}
        <mesh position={[-0.09, -0.16, 0.28]} rotation={[-0.1, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.34, 6]} />
          <meshStandardMaterial color="#162030" roughness={0.9} />
        </mesh>
        <mesh position={[0.09, -0.16, 0.28]} rotation={[-0.1, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.055, 0.34, 6]} />
          <meshStandardMaterial color="#162030" roughness={0.9} />
        </mesh>

        {/* Torso leaning slightly forward in relaxed posture */}
        <mesh position={[0, 0.42, 0.04]} rotation={[0.15, 0, 0]}>
          <cylinderGeometry args={[0.14, 0.19, 0.58, 8]} />
          <meshStandardMaterial color="#1c283c" roughness={0.9} />
        </mesh>

        {/* Head */}
        <mesh position={[0, 0.78, 0.11]} rotation={[0.15, 0, 0]}>
          <sphereGeometry args={[0.10, 10, 10]} />
          <meshStandardMaterial color="#2d2218" roughness={0.8} />
        </mesh>

        {/* Traditional Conical Straw Hat */}
        <mesh position={[0, 0.86, 0.12]} rotation={[0.2, 0, 0]}>
          <coneGeometry args={[0.38, 0.15, 16]} />
          <meshStandardMaterial color="#473724" roughness={0.85} />
        </mesh>

        {/* Arms holding the bamboo fishing rod */}
        <mesh position={[0.14, 0.42, 0.18]} rotation={[0.9, 0.2, -0.4]}>
          <cylinderGeometry args={[0.04, 0.045, 0.48, 6]} />
          <meshStandardMaterial color="#1c283c" roughness={0.9} />
        </mesh>
        <mesh position={[-0.14, 0.42, 0.18]} rotation={[0.9, -0.2, 0.4]}>
          <cylinderGeometry args={[0.04, 0.045, 0.48, 6]} />
          <meshStandardMaterial color="#1c283c" roughness={0.9} />
        </mesh>

        {/* Long Slender Bamboo Fishing Rod Extending Over Water */}
        <group position={[0.08, 0.44, 0.42]} rotation={[-0.32, 0.15, 0]}>
          <mesh position={[0, 0, 1.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.024, 2.9, 6]} />
            <meshStandardMaterial color="#947541" roughness={0.7} />
          </mesh>

          {/* Fishing Line dipping down toward water */}
          <mesh position={[0, -0.65, 2.8]}>
            <cylinderGeometry args={[0.002, 0.002, 1.4, 4]} />
            <meshBasicMaterial color="#ffffff" opacity={0.65} transparent />
          </mesh>
        </group>
      </group>
    </group>
  )
}
