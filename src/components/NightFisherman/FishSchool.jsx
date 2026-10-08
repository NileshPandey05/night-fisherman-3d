import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const FISH_COUNT = 1000

// Custom Shader Material for fish scales with Anisotropic Specular Flashes & Beer-Lambert extinction
const fishVertexShader = /* glsl */ `
  attribute float aTailPhase;
  attribute vec3 aColorTint;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vViewPosition;
  varying vec3 vColorTint;
  varying float vInstanceID;

  uniform float uTime;

  void main() {
    vInstanceID = float(gl_InstanceID);
    vColorTint = aColorTint;
    vec3 pos = position;

    // Realistic tail wagging: lateral displacement propagates from mid-body to caudal fin
    // Fish is oriented along -Z axis (head at +Z, tail at -Z)
    float tailWeight = smoothstep(0.04, -0.16, pos.z);
    float wagFrequency = 15.5;
    float wag = sin(uTime * wagFrequency + aTailPhase) * tailWeight * 0.048;
    pos.x += wag;

    vec4 worldPos = modelMatrix * instanceMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;

    // Transform normals & tangents
    mat3 normalMat = mat3(modelMatrix * instanceMatrix);
    vNormal = normalize(normalMat * normal);
    vTangent = normalize(normalMat * vec3(0.0, 0.0, -1.0)); // Fish spine tangent

    vec4 mvPosition = viewMatrix * worldPos;
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fishFragmentShader = /* glsl */ `
  uniform vec3 uLanternPos;
  uniform vec3 uLanternColor;
  uniform float uLanternIntensity;
  uniform vec3 uMoonDir;
  uniform float uTime;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vViewPosition;
  varying vec3 vColorTint;
  varying float vInstanceID;

  vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453123);
  }

  vec2 fastVoronoi(vec2 p, float t) {
    vec2 n = floor(p);
    vec2 r = fract(p);
    float f1 = 8.0;
    float f2 = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = sin(hash2(n + g) * 6.2831853 + t) * 0.38 + 0.5;
        vec2 diff = g + o - r;
        float d = length(diff);
        if (d < f1) {
          f2 = f1;
          f1 = d;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
    return vec2(f1, f2);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 T = normalize(vTangent);
    vec3 V = normalize(vViewPosition);

    vec3 lightVec = uLanternPos - vWorldPosition;
    float dist = length(lightVec);
    vec3 L = normalize(lightVec);

    // Inverse-square attenuation from warm lantern
    float atten = 1.0 / (1.0 + 0.16 * dist + 0.10 * dist * dist);
    atten *= uLanternIntensity;

    // Base Metallic Silver Color with subtle per-instance pearl/turquoise tint
    vec3 silverBase = vColorTint;
    
    // Countershading: dark greenish-slate dorsal back, mirror-bright silver belly
    float dorsal = smoothstep(0.08, 0.75, N.y);
    float ventral = smoothstep(-0.08, -0.75, N.y);
    silverBase = mix(silverBase, vec3(0.07, 0.18, 0.32), dorsal * 0.82);
    silverBase = mix(silverBase, vec3(0.96, 0.98, 1.0), ventral * 0.45);

    // 1. Diffuse light from Lantern
    float diff = max(dot(N, L), 0.0);
    vec3 diffuseLight = uLanternColor * diff * atten * 1.5;

    // 2. Anisotropic Specular Glint (Guanine Scale Crystal Model)
    vec3 H = normalize(L + V);
    float dotTH = dot(T, H);
    float sinTH = sqrt(max(0.0, 1.0 - dotTH * dotTH));
    float anisoSpec = pow(sinTH, 42.0);

    // Sharp specular flash when scale normal catches the flame
    float glint = pow(max(dot(N, H), 0.0), 38.0);
    float totalSpec = (anisoSpec * 0.65 + glint * 0.9) * atten * 5.6;
    vec3 specularLight = mix(vec3(1.0), uLanternColor, 0.4) * totalSpec;

    // 3. Moon Ambient & Cool Rim Light
    vec3 moonH = normalize(uMoonDir + V);
    float moonSpec = pow(max(dot(N, moonH), 0.0), 28.0) * 0.6;
    vec3 moonLight = vec3(0.6, 0.78, 1.0) * (max(dot(N, uMoonDir), 0.0) * 0.3 + moonSpec);

    // 4. Beer-Lambert Water Depth Absorption
    float depth = max(0.0, -vWorldPosition.y);
    float waterTransmittance = exp(-depth * 0.36);
    vec3 underwaterFilter = mix(vec3(0.08, 0.24, 0.48), vec3(1.0), waterTransmittance);

    // 5. Wawa Sensei Level 3 Chromatic Caustic Ribbons on Fish flowing with ocean waves
    float upward = max(0.0, N.y);
    vec3 causticLight = vec3(0.0);
    if (vWorldPosition.y <= 0.0 && upward > 0.04) {
      float ct = uTime * 1.35; // Increased speed for lively liquid light ribbons
      vec2 swellFlow = normalize(vec2(0.8, 0.6)) * (ct * 1.4);
      vec2 cuv = vWorldPosition.xz * 0.72 + swellFlow;
      vec2 vA = fastVoronoi(cuv * 2.3 + vec2(ct * 0.42, ct * 0.20), ct);
      vec2 vB = fastVoronoi(cuv * 3.7 - vec2(ct * 0.30, ct * 0.38) + 7.3, ct * 1.15);
      float cEdgeA = pow(1.0 - clamp(vA.y - vA.x, 0.0, 1.0), 16.0);
      float cEdgeB = pow(1.0 - clamp(vB.y - vB.x, 0.0, 1.0), 16.0);
      float causticWeb = sqrt(cEdgeA * cEdgeB);

      vec3 causticTint = mix(vec3(0.35, 0.82, 1.0), uLanternColor, clamp(atten * 2.5, 0.0, 1.0));
      causticLight = causticTint * causticWeb * upward * 3.2;
    }

    vec3 finalColor = (silverBase * (diffuseLight + moonLight + vec3(0.05, 0.09, 0.18)) + specularLight + causticLight) * underwaterFilter;

    // Above water (leaping)
    if (vWorldPosition.y > 0.0) {
      finalColor = silverBase * (diffuseLight + moonLight + vec3(0.2, 0.3, 0.45)) + specularLight * 1.6;
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

export function FishSchool({
  lanternPos = [0, 1.8, 0],
  predatorPos = [0, -2, 0],
  isPredatorAttacking = false,
  motionMode = 'milling', // 'milling', 'fountain', 'flash', 'flocking'
  millingDirection = 1, // 1 (CCW) or -1 (CW)
  lurePos = null,
  onSplash
}) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])

  // Procedural sculpted baitfish geometry with distinct fins and body
  const fishGeometry = useMemo(() => {
    // 1. Main streamlined body
    const bodyGeo = new THREE.CylinderGeometry(0.012, 0.042, 0.26, 8, 5)
    bodyGeo.rotateX(Math.PI / 2)
    bodyGeo.scale(0.48, 1.15, 1.0)
    bodyGeo.translate(0, 0, -0.01)

    // 2. Caudal / Tail Fin (forked / crescent shape at back)
    const tailUpper = new THREE.BoxGeometry(0.005, 0.055, 0.065)
    tailUpper.rotateX(0.45)
    tailUpper.translate(0, 0.025, -0.165)

    const tailLower = new THREE.BoxGeometry(0.005, 0.055, 0.065)
    tailLower.rotateX(-0.45)
    tailLower.translate(0, -0.025, -0.165)

    // 3. Dorsal Fin
    const dorsal = new THREE.ConeGeometry(0.006, 0.065, 4)
    dorsal.rotateZ(Math.PI)
    dorsal.rotateX(-0.5)
    dorsal.translate(0, 0.052, -0.04)

    // 4. Pectoral Fins
    const pectL = new THREE.BoxGeometry(0.042, 0.004, 0.045)
    pectL.rotateY(0.45)
    pectL.rotateZ(-0.35)
    pectL.translate(0.038, -0.015, 0.04)

    const pectR = new THREE.BoxGeometry(0.042, 0.004, 0.045)
    pectR.rotateY(-0.45)
    pectR.rotateZ(0.35)
    pectR.translate(-0.038, -0.015, 0.04)

    // Merge into single high-performance geometry
    const merged = BufferGeometryUtils.mergeGeometries([bodyGeo, tailUpper, tailLower, dorsal, pectL, pectR])
    merged.computeVertexNormals()

    // Assign tail phase & color variation
    const tailPhases = new Float32Array(FISH_COUNT)
    const colorTints = new Float32Array(FISH_COUNT * 3)

    for (let i = 0; i < FISH_COUNT; i++) {
      tailPhases[i] = Math.random() * Math.PI * 2.0

      // Natural subtle pearl / silver / pale turquoise tints
      const tintVariation = Math.random()
      const cIdx = i * 3
      if (tintVariation < 0.6) {
        colorTints[cIdx] = 0.88; colorTints[cIdx + 1] = 0.92; colorTints[cIdx + 2] = 0.98 // Silver pearl
      } else if (tintVariation < 0.85) {
        colorTints[cIdx] = 0.74; colorTints[cIdx + 1] = 0.88; colorTints[cIdx + 2] = 0.95 // Pale turquoise
      } else {
        colorTints[cIdx] = 0.92; colorTints[cIdx + 1] = 0.88; colorTints[cIdx + 2] = 0.82 // Pale champagne silver
      }
    }

    merged.setAttribute('aTailPhase', new THREE.InstancedBufferAttribute(tailPhases, 1))
    merged.setAttribute('aColorTint', new THREE.InstancedBufferAttribute(colorTints, 3))

    return merged
  }, [])

  // Shader material
  const fishMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: fishVertexShader,
      fragmentShader: fishFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uLanternPos: { value: new THREE.Vector3(...lanternPos) },
        uLanternColor: { value: new THREE.Color('#ffaa38') },
        uLanternIntensity: { value: 1.8 },
        uMoonDir: { value: new THREE.Vector3(0.5, 0.8, -0.35).normalize() }
      }
    })
  }, [])

  // Boids Simulation State
  const boids = useMemo(() => {
    const pos = new Float32Array(FISH_COUNT * 3)
    const vel = new Float32Array(FISH_COUNT * 3)
    const bank = new Float32Array(FISH_COUNT) // Banking roll angle
    const state = new Uint8Array(FISH_COUNT) // 0: swimming, 1: leaping, 2: diving

    for (let i = 0; i < FISH_COUNT; i++) {
      const idx = i * 3
      const angle = Math.random() * Math.PI * 2.0
      const radius = 1.2 + Math.random() * 3.8
      pos[idx] = Math.cos(angle) * radius
      pos[idx + 1] = -0.7 - Math.random() * 2.4
      pos[idx + 2] = Math.sin(angle) * radius

      const speed = 1.4 + Math.random() * 0.8
      vel[idx] = -Math.sin(angle) * speed
      vel[idx + 1] = (Math.random() - 0.5) * 0.2
      vel[idx + 2] = Math.cos(angle) * speed

      bank[i] = 0
      state[i] = 0
    }

    return { pos, vel, bank, state }
  }, [])

  // Initialize instance matrices
  useEffect(() => {
    if (!meshRef.current) return
    const { pos } = boids
    for (let i = 0; i < FISH_COUNT; i++) {
      const idx = i * 3
      dummy.position.set(pos[idx], pos[idx + 1], pos[idx + 2])
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [boids, dummy])

  // Simulation Loop
  useFrame((state, delta) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    const dt = Math.min(delta, 0.05)

    fishMaterial.uniforms.uTime.value = time
    fishMaterial.uniforms.uLanternPos.value.set(...lanternPos)

    const { pos, vel, bank, state: fishState } = boids
    const lX = lanternPos[0]
    const lZ = lanternPos[2]
    const pX = predatorPos[0]
    const pY = predatorPos[1]
    const pZ = predatorPos[2]

    const stride = 14
    const dirSign = millingDirection >= 0 ? 1.0 : -1.0

    for (let i = 0; i < FISH_COUNT; i++) {
      const i3 = i * 3
      let px = pos[i3]
      let py = pos[i3 + 1]
      let pz = pos[i3 + 2]

      let vx = vel[i3]
      let vy = vel[i3 + 1]
      let vz = vel[i3 + 2]

      const currState = fishState[i]

      // --- STATE 1: LEAPING (Above Water Ballistic Arc) ---
      if (currState === 1) {
        vy -= 9.81 * dt
        py += vy * dt
        px += vx * dt
        pz += vz * dt

        if (py <= 0.0) {
          fishState[i] = 2 // Diving
          py = -0.05
          vy = -1.3
          if (onSplash) {
            onSplash(px, pz, 0.09 + Math.random() * 0.06)
          }
        }

        pos[i3] = px
        pos[i3 + 1] = py
        pos[i3 + 2] = pz
        vel[i3] = vx
        vel[i3 + 1] = vy
        vel[i3 + 2] = vz

        dummy.position.set(px, py, pz)
        const forward = new THREE.Vector3(vx, vy, vz).normalize()
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }

      // --- STATE 2: DIVING (Post-splash recovery) ---
      if (currState === 2) {
        vy *= 0.91
        py += vy * dt
        px += vx * dt
        pz += vz * dt

        if (py < -0.55) {
          fishState[i] = 0
        }

        pos[i3] = px
        pos[i3 + 1] = py
        pos[i3 + 2] = pz
        vel[i3] = vx
        vel[i3 + 1] = vy
        vel[i3 + 2] = vz

        dummy.position.set(px, py, pz)
        const forward = new THREE.Vector3(vx, vy, vz).normalize()
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward)
        dummy.updateMatrix()
        meshRef.current.setMatrixAt(i, dummy.matrix)
        continue
      }

      // --- STATE 0: SWIMMING ---
      let sepX = 0, sepY = 0, sepZ = 0
      let aliX = 0, aliY = 0, aliZ = 0
      let cohX = 0, cohY = 0, cohZ = 0
      let neighbors = 0

      for (let j = (i + 1) % stride; j < FISH_COUNT; j += stride) {
        if (i === j) continue
        const j3 = j * 3
        const dx = px - pos[j3]
        const dy = py - pos[j3 + 1]
        const dz = pz - pos[j3 + 2]
        const distSq = dx * dx + dy * dy + dz * dz

        if (distSq < 0.38 && distSq > 0.0001) {
          const invD = 1.0 / Math.sqrt(distSq)
          sepX += dx * invD
          sepY += dy * invD
          sepZ += dz * invD
        } else if (distSq < 3.8) {
          aliX += vel[j3]
          aliY += vel[j3 + 1]
          aliZ += vel[j3 + 2]

          cohX += pos[j3]
          cohY += pos[j3 + 1]
          cohZ += pos[j3 + 2]
          neighbors++
        }
      }

      vx += sepX * 2.6 * dt
      vy += sepY * 2.0 * dt
      vz += sepZ * 2.6 * dt

      if (neighbors > 0) {
        aliX /= neighbors
        aliY /= neighbors
        aliZ /= neighbors
        vx += (aliX - vx) * 1.1 * dt
        vy += (aliY - vy) * 0.8 * dt
        vz += (aliZ - vz) * 1.1 * dt

        cohX /= neighbors
        cohY /= neighbors
        cohZ /= neighbors
        const cohWeight = (motionMode === 'milling' || motionMode === 'fountain') ? 0.25 : 0.5
        vx += (cohX - px) * cohWeight * dt
        vy += (cohY - py) * 0.4 * dt
        vz += (cohZ - pz) * cohWeight * dt
      }

      // --- 1. BIOLOGICAL SWARM BEHAVIORS ---
      if (motionMode === 'milling') {
        // Toroidal Milling Vortex with direction flip
        const toCenterX = px - lX
        const toCenterZ = pz - lZ
        const distR = Math.sqrt(toCenterX * toCenterX + toCenterZ * toCenterZ)
        if (distR > 0.1) {
          const tangX = (-toCenterZ / distR) * dirSign
          const tangZ = (toCenterX / distR) * dirSign
          const targetMillingSpeed = 2.2

          vx += (tangX * targetMillingSpeed - vx) * 1.7 * dt
          vz += (tangZ * targetMillingSpeed - vz) * 1.7 * dt

          const preferredR = 2.7
          const radialError = preferredR - distR
          vx -= (toCenterX / distR) * radialError * 0.85 * dt
          vz -= (toCenterZ / distR) * radialError * 0.85 * dt

          const angle = Math.atan2(toCenterZ, toCenterX)
          const targetDepth = -1.2 + Math.sin(angle * 2.0 + time * 0.9) * 0.5
          vy += (targetDepth - py) * 1.2 * dt
        }
      } else if (motionMode === 'fountain') {
        // The Fountain Effect: eruption upwards around center, cascading outward and down
        const toCenterX = px - lX
        const toCenterZ = pz - lZ
        const distR = Math.sqrt(toCenterX * toCenterX + toCenterZ * toCenterZ)

        if (distR < 1.8) {
          // Inner core erupts upwards
          vy += 3.8 * dt
          const pushOutX = toCenterX > 0 ? 1 : -1
          const pushOutZ = toCenterZ > 0 ? 1 : -1
          vx += pushOutX * 1.5 * dt
          vz += pushOutZ * 1.5 * dt
        } else if (distR < 3.8) {
          // Outer cascade pushes down and curls back under
          vy -= 2.6 * dt
          const radialDirX = toCenterX / distR
          const radialDirZ = toCenterZ / distR
          vx += radialDirX * 1.8 * dt
          vz += radialDirZ * 1.8 * dt
        } else {
          // Outer rim recirculates inward
          const invR = 1.0 / distR
          vx -= toCenterX * invR * 1.6 * dt
          vz -= toCenterZ * invR * 1.6 * dt
          vy += (-1.8 - py) * 0.8 * dt
        }
      } else if (motionMode === 'flash') {
        // Flash Expansion: sudden outward scatter
        const toCenterX = px - lX
        const toCenterZ = pz - lZ
        const distR = Math.max(0.1, Math.sqrt(toCenterX * toCenterX + toCenterZ * toCenterZ))
        vx += (toCenterX / distR) * 4.5 * dt
        vz += (toCenterZ / distR) * 4.5 * dt
      } else {
        // Free Flocking: gentle drift toward lantern volume
        const toLanternX = lX - px
        const toLanternZ = lZ - pz
        const distLantern = Math.sqrt(toLanternX * toLanternX + toLanternZ * toLanternZ)
        if (distLantern > 1.2 && distLantern < 8.0) {
          vx += (toLanternX / distLantern) * 0.5 * dt
          vz += (toLanternZ / distLantern) * 0.5 * dt
        }
      }

      // --- 2. Interactive Fishing Lure Attraction ---
      if (lurePos) {
        const toLureX = lurePos[0] - px
        const toLureY = lurePos[1] - py
        const toLureZ = lurePos[2] - pz
        const distLureSq = toLureX * toLureX + toLureY * toLureY + toLureZ * toLureZ
        if (distLureSq < 6.0 && distLureSq > 0.05) {
          const invDLure = 1.0 / Math.sqrt(distLureSq)
          vx += toLureX * invDLure * 0.9 * dt
          vy += toLureY * invDLure * 0.7 * dt
          vz += toLureZ * invDLure * 0.9 * dt
        }
      }

      // --- 3. Predator Evasion ---
      const predDX = px - pX
      const predDY = py - pY
      const predDZ = pz - pZ
      const distPredSq = predDX * predDX + predDY * predDY + predDZ * predDZ
      const dangerRadiusSq = isPredatorAttacking ? 36.0 : 11.5

      if (distPredSq < dangerRadiusSq && distPredSq > 0.001) {
        const distPred = Math.sqrt(distPredSq)
        const fleeStrength = isPredatorAttacking ? 22.0 : 9.5
        const fleeFactor = (fleeStrength / (distPredSq + 0.1)) * dt
        vx += (predDX / distPred) * fleeFactor
        vy += (predDY / distPred) * fleeFactor * 0.6
        vz += (predDZ / distPred) * fleeFactor

        if (py > -0.75 && Math.random() < 0.016) {
          fishState[i] = 1 // LEAPING
          vy = 3.6 + Math.random() * 1.5
          if (onSplash) {
            onSplash(px, pz, 0.06 + Math.random() * 0.04)
          }
        }
      }

      // Spontaneous natural breach
      if (fishState[i] === 0 && py > -0.65 && Math.random() < 0.00045) {
        fishState[i] = 1
        vy = 3.4 + Math.random() * 1.2
        if (onSplash) {
          onSplash(px, pz, 0.05 + Math.random() * 0.03)
        }
      }

      // Boundary containment
      const distR = Math.sqrt(px * px + pz * pz)
      if (distR > 5.6) {
        vx -= (px / distR) * 3.0 * dt
        vz -= (pz / distR) * 3.0 * dt
      }

      if (py > -0.42 && fishState[i] === 0) {
        vy -= 2.6 * dt
      }
      if (py < -3.6) {
        vy += 3.2 * dt
      }

      // Speed limits
      const curSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz)
      const maxSpeed = distPredSq < dangerRadiusSq ? 5.0 : (motionMode === 'flash' ? 4.2 : 2.8)
      const minSpeed = 0.9
      if (curSpeed > maxSpeed) {
        const factor = maxSpeed / curSpeed
        vx *= factor
        vy *= factor
        vz *= factor
      } else if (curSpeed < minSpeed && curSpeed > 0.001) {
        const factor = minSpeed / curSpeed
        vx *= factor
        vy *= factor
        vz *= factor
      }

      px += vx * dt
      py += vy * dt
      pz += vz * dt

      pos[i3] = px
      pos[i3 + 1] = py
      pos[i3 + 2] = pz
      vel[i3] = vx
      vel[i3 + 1] = vy
      vel[i3 + 2] = vz

      // --- 4. Smooth Banking Roll Alignment ---
      dummy.position.set(px, py, pz)
      const forward = new THREE.Vector3(vx, vy, vz).normalize()
      
      // Calculate angular turning rate for realistic airplane banking
      const prevVx = vel[i3]
      const prevVz = vel[i3 + 2]
      const turnRate = (vx * prevVz - vz * prevVx) / (curSpeed * curSpeed + 0.01)
      const targetBank = THREE.MathUtils.clamp(-turnRate * 1.8, -0.65, 0.65)
      bank[i] = THREE.MathUtils.lerp(bank[i], targetBank, 0.1)

      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), forward)
      // Apply banking roll around local Z
      const rollQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), bank[i])
      dummy.quaternion.multiply(rollQuat)

      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[fishGeometry, fishMaterial, FISH_COUNT]}
      frustumCulled={false}
      renderOrder={0}
    />
  )
}
