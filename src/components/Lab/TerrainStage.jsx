import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Delaunator from 'delaunator'

// Procedural multi-octave noise function
function pseudoNoise(x, z) {
  return (
    Math.sin(x * 0.8 + z * 0.5) * 0.5 +
    Math.cos(z * 1.2 - x * 0.6) * 0.35 +
    Math.sin(x * 2.1 + z * 1.9) * 0.15 +
    Math.sin(x * 4.2 - z * 3.7) * 0.06
  )
}

function computeHeight(x, z, amplitude = 4.2) {
  const dist = Math.hypot(x, z) / 7.0
  const island = Math.max(0, 1.0 - dist * dist * 0.8)
  const n = pseudoNoise(x * 0.45, z * 0.45)
  const n2 = pseudoNoise(x * 1.2 + 2.3, z * 1.2 - 1.7) * 0.35
  const rawH = (n + n2 + 0.35) * island
  return Math.max(0.02, rawH * amplitude)
}

// Biome classification: sand, grass, rock, snow
function getBiomeColor(height, maxH, slope) {
  const hRel = height / (maxH || 1)
  const sand = new THREE.Color('#c9b98a')
  const grass = new THREE.Color('#718668')
  const rock = new THREE.Color('#697780')
  const snow = new THREE.Color('#edf2f4')

  if (slope > 0.65) return rock
  if (hRel < 0.18) return sand
  if (hRel < 0.55) {
    const t = (hRel - 0.18) / (0.55 - 0.18)
    return sand.clone().lerp(grass, t)
  }
  if (hRel < 0.78) {
    const t = (hRel - 0.55) / (0.78 - 0.55)
    return grass.clone().lerp(rock, t)
  }
  const t = (hRel - 0.78) / (1.0 - 0.78)
  return rock.clone().lerp(snow, t)
}

export function TerrainStage({ level = 1, params = {} }) {
  const meshRef = useRef()
  const amplitude = params.amplitude ?? 4.2
  const count = params.count ?? (level === 1 ? 15000 : 1500)
  const seed = params.seed ?? 42
  const sampling = params.sampling ?? 'poisson'
  const smooth = params.smooth ?? (level === 1)
  const wireframe = !!params.wireframe
  const showSeeds = !!params.seeds
  const showBiomes = params.biomes !== false
  const showSea = params.sea !== false

  // Generate terrain geometry based on Level
  const { geometry, seedPoints, biomeLines } = useMemo(() => {
    const size = 14
    const half = size / 2

    if (level === 1) {
      // Level 1: Dense smooth grid
      const segs = 140
      const geo = new THREE.PlaneGeometry(size, size, segs, segs)
      geo.rotateX(-Math.PI / 2)
      const pos = geo.attributes.position
      const colors = new Float32Array(pos.count * 3)

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const z = pos.getZ(i)
        const h = computeHeight(x, z, amplitude)
        pos.setY(i, h)
      }
      geo.computeVertexNormals()

      const norm = geo.attributes.normal
      for (let i = 0; i < pos.count; i++) {
        const h = pos.getY(i)
        const slope = 1.0 - Math.max(0, norm.getY(i))
        const col = getBiomeColor(h, amplitude, slope)
        colors[i * 3] = col.r
        colors[i * 3 + 1] = col.g
        colors[i * 3 + 2] = col.b
      }
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return { geometry: geo, seedPoints: [], biomeLines: [] }
    } else if (level === 2) {
      // Level 2: Low-poly coarse grid with flat face shading
      const segs = 34
      const geo = new THREE.PlaneGeometry(size, size, segs, segs)
      geo.rotateX(-Math.PI / 2)
      const nonIndexed = geo.toNonIndexed()
      const pos = nonIndexed.attributes.position
      const colors = new Float32Array(pos.count * 3)

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i)
        const z = pos.getZ(i)
        const h = computeHeight(x, z, amplitude)
        pos.setY(i, h)
      }
      nonIndexed.computeVertexNormals()

      // Color per triangle
      for (let i = 0; i < pos.count; i += 3) {
        const avgY = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3
        const avgNormY = (
          nonIndexed.attributes.normal.getY(i) +
          nonIndexed.attributes.normal.getY(i + 1) +
          nonIndexed.attributes.normal.getY(i + 2)
        ) / 3
        const slope = 1.0 - Math.max(0, avgNormY)
        const col = getBiomeColor(avgY, amplitude, slope)
        for (let j = 0; j < 3; j++) {
          colors[(i + j) * 3] = col.r
          colors[(i + j) * 3 + 1] = col.g
          colors[(i + j) * 3 + 2] = col.b
        }
      }
      nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      return { geometry: nonIndexed, seedPoints: [], biomeLines: [] }
    } else {
      // Level 3: Poisson-disk / Random Delaunay Triangulation
      const points = []
      const numPoints = Math.min(count, 3500)
      const rng = (s) => {
        const x = Math.sin(s++) * 10000
        return x - Math.floor(x)
      }

      // Generate 2D seeds
      let curSeed = seed
      for (let i = 0; i < numPoints; i++) {
        const x = (rng(curSeed++) - 0.5) * size
        const z = (rng(curSeed++) - 0.5) * size
        points.push([x, z])
      }
      // Add boundary points to anchor the square
      const bSteps = 24
      for (let i = 0; i <= bSteps; i++) {
        const t = (i / bSteps) * size - half
        points.push([-half, t], [half, t], [t, -half], [t, half])
      }

      // Delaunator triangulation
      const flatCoords = points.flat()
      const delaunay = new Delaunator(flatCoords)
      const triangles = delaunay.triangles

      const positions = []
      const colors = []
      const seedsArr = []
      const lines = []

      const heights = points.map(([x, z]) => computeHeight(x, z, amplitude))

      for (let i = 0; i < points.length; i++) {
        seedsArr.push(points[i][0], heights[i] + 0.05, points[i][1])
      }

      for (let i = 0; i < triangles.length; i += 3) {
        const i0 = triangles[i]
        const i1 = triangles[i + 1]
        const i2 = triangles[i + 2]

        const p0 = [points[i0][0], heights[i0], points[i0][1]]
        const p1 = [points[i1][0], heights[i1], points[i1][1]]
        const p2 = [points[i2][0], heights[i2], points[i2][1]]

        positions.push(...p0, ...p1, ...p2)

        const avgY = (p0[1] + p1[1] + p2[1]) / 3
        const vA = new THREE.Vector3(...p0)
        const vB = new THREE.Vector3(...p1)
        const vC = new THREE.Vector3(...p2)
        const norm = new THREE.Vector3().crossVectors(vB.sub(vA), vC.sub(vA)).normalize()
        const slope = 1.0 - Math.max(0, norm.y)
        const col = getBiomeColor(avgY, amplitude, slope)

        for (let j = 0; j < 3; j++) {
          colors.push(col.r, col.g, col.b)
        }
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
      if (smooth) {
        geo.computeVertexNormals()
      } else {
        geo.computeVertexNormals()
      }

      return {
        geometry: geo,
        seedPoints: seedsArr,
        biomeLines: lines
      }
    }
  }, [level, amplitude, count, seed, sampling, smooth])

  const seaLevel = amplitude * 0.17

  return (
    <group>
      {/* Directional Sunlight */}
      <directionalLight
        position={[-8, 16, 9]}
        intensity={3.0}
        color="#e6f2ff"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#d6eaff', '#102a48', 1.0]} />

      {/* Terrain Mesh */}
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors={showBiomes}
          color={showBiomes ? '#ffffff' : '#99a5a2'}
          roughness={0.88}
          metalness={0.08}
          flatShading={!smooth}
          wireframe={wireframe}
        />
      </mesh>

      {/* Sea Plane */}
      {showSea && (
        <mesh position={[0, seaLevel, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, 14]} />
          <meshStandardMaterial
            color="#497f82"
            transparent
            opacity={0.38}
            roughness={0.25}
            metalness={0.3}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Seed Dots */}
      {showSeeds && seedPoints.length > 0 && (
        <points>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={seedPoints.length / 3}
              array={new Float32Array(seedPoints)}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial color="#55f5c8" size={0.08} sizeAttenuation />
        </points>
      )}

      {/* Floor Base */}
      <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#062e48" roughness={0.65} metalness={0.15} />
      </mesh>
    </group>
  )
}
