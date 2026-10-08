import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Analytical Gerstner wave parameters
export const GERSTNER_WAVES = [
  { dir: new THREE.Vector2(0.8, 0.6).normalize(), length: 16.0, amp: 0.18, speed: 1.1, steepness: 0.22 },
  { dir: new THREE.Vector2(-0.5, 0.86).normalize(), length: 9.5, amp: 0.11, speed: 1.4, steepness: 0.18 },
  { dir: new THREE.Vector2(0.3, 0.95).normalize(), length: 4.8, amp: 0.06, speed: 1.9, steepness: 0.15 }
]

// Analytical wave elevation & normal sampler for buoyancy
export function sampleGerstnerWater(x, z, time) {
  let elevation = 0
  let dx = 0
  let dz = 0

  for (let i = 0; i < GERSTNER_WAVES.length; i++) {
    const w = GERSTNER_WAVES[i]
    const k = (2.0 * Math.PI) / w.length
    const c = Math.sqrt(9.81 / k) * w.speed
    const phase = k * (w.dir.x * x + w.dir.y * z) - k * c * time
    
    elevation += w.amp * Math.cos(phase)
    
    const dCos = -w.amp * k * Math.sin(phase)
    dx += w.dir.x * dCos
    dz += w.dir.y * dCos
  }

  const normal = new THREE.Vector3(-dx, 1.0, -dz).normalize()
  return { elevation, normal }
}

const waterVertexShader = /* glsl */ `
  uniform float uTime;
  uniform vec4 uRipples[12];
  uniform int uRippleCount;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  struct GerstnerWave {
    vec2 dir;
    float length;
    float amp;
    float speed;
    float steepness;
  };

  void main() {
    vec3 pos = position;
    vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;

    GerstnerWave waves[3];
    waves[0] = GerstnerWave(normalize(vec2(0.8, 0.6)), 16.0, 0.18, 1.1, 0.22);
    waves[1] = GerstnerWave(normalize(vec2(-0.5, 0.86)), 9.5, 0.11, 1.4, 0.18);
    waves[2] = GerstnerWave(normalize(vec2(0.3, 0.95)), 4.8, 0.06, 1.9, 0.15);

    vec3 displaced = worldPos;
    vec3 normalSum = vec3(0.0, 1.0, 0.0);

    for (int i = 0; i < 3; i++) {
      float k = 6.2831853 / waves[i].length;
      float c = sqrt(9.81 / k) * waves[i].speed;
      float phase = k * dot(waves[i].dir, worldPos.xz) - k * c * uTime;
      float sinP = sin(phase);
      float cosP = cos(phase);

      float qi = waves[i].steepness / (k * waves[i].amp * 3.0);
      displaced.x -= qi * waves[i].amp * waves[i].dir.x * sinP;
      displaced.z -= qi * waves[i].amp * waves[i].dir.y * sinP;
      displaced.y += waves[i].amp * cosP;

      float wa = k * waves[i].amp;
      normalSum.x -= waves[i].dir.x * wa * sinP;
      normalSum.z -= waves[i].dir.y * wa * sinP;
    }

    // Macro elevation displacement safely resolved on 200x200 vertex grid without spatial aliasing
    for (int j = 0; j < 12; j++) {
      if (j >= uRippleCount) break;
      vec4 rip = uRipples[j];
      float dt = uTime - rip.z;
      if (dt > 0.0 && dt < 4.5 && rip.w > 0.001) {
        float r = length(worldPos.xz - rip.xy);
        float waveSpeed = 3.2;
        float waveDist = r - waveSpeed * dt;
        
        float envelope = exp(-waveDist * waveDist * 1.6) * exp(-dt * 0.95) * exp(-r * 0.18);
        float macroCrest = rip.w * 0.45 * sin(5.5 * waveDist) * envelope;
        displaced.y += macroCrest;
      }
    }

    vWorldPosition = displaced;
    vNormal = normalize(normalSum);
    
    vec4 mvPosition = viewMatrix * vec4(displaced, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const waterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uLanternPos;
  uniform vec3 uLanternColor;
  uniform float uLanternIntensity;
  uniform vec3 uMoonPos;
  uniform vec3 uMoonColor;
  uniform vec4 uRipples[12];
  uniform int uRippleCount;
  uniform float uCausticIntensity;
  uniform bool uCausticsEnabled;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453123);
  }

  vec2 fastVoronoiWater(vec2 p, float t) {
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

  // Wawa Sensei Level 3 Caustic Network on Water Surface flowing with waves
  float evalWaterSurfaceCaustics(vec2 pos, float t, vec2 waveMotion) {
    float r = t * 1.35; // Increased speed for lively, liquid fluid motion
    // Layer A surges with the dominant ocean swell
    vec2 i = fastVoronoiWater(pos * 2.5 + waveMotion * 1.8 + vec2(r * 0.42, r * 0.22), r);
    // Layer B counter-flows with the cross swell
    vec2 a = fastVoronoiWater(pos * 3.9 - waveMotion * 1.1 - vec2(r * 0.32, r * 0.44) + 7.3, r * 1.15);
    float edgeA = pow(1.0 - clamp(i.y - i.x, 0.0, 1.0), 16.0);
    float edgeB = pow(1.0 - clamp(a.y - a.x, 0.0, 1.0), 16.0);
    return sqrt(edgeA * edgeB);
  }

  // High-frequency ambient micro-capillaries (surface-tension wind ripples)
  vec2 getWindCapillaries(vec2 pos, float time) {
    vec2 dN = vec2(0.0);
    
    float t1 = time * 2.4;
    float p1 = dot(vec2(0.707, 0.707), pos) * 8.5 - t1;
    dN += vec2(0.707, 0.707) * cos(p1) * 0.038;

    float t2 = time * 3.1;
    float p2 = dot(vec2(-0.5, 0.866), pos) * 16.0 - t2;
    dN += vec2(-0.5, 0.866) * cos(p2) * 0.024;

    float t3 = time * 4.2;
    float p3 = dot(vec2(0.866, -0.5), pos) * 28.0 - t3;
    dN += vec2(0.866, -0.5) * cos(p3) * 0.014;

    return dN;
  }

  void main() {
    vec3 baseN = normalize(vNormal);
    vec3 V = normalize(vViewPosition);

    // 1. Analytical Per-Pixel Capillary Ripple Normal Perturbation
    vec2 rippleSlope = vec2(0.0);
    for (int j = 0; j < 12; j++) {
      if (j >= uRippleCount) break;
      vec4 rip = uRipples[j];
      float dt = uTime - rip.z;
      if (dt > 0.0 && dt < 4.5 && rip.w > 0.001) {
        vec2 diff = vWorldPosition.xz - rip.xy;
        float r = length(diff);
        if (r > 0.004) {
          vec2 rDir = diff / r;
          float waveSpeed = 3.2; // Capillary group velocity
          float waveDist = r - waveSpeed * dt;

          // Surface-tension dispersion envelope: tightly focused Gaussian wave packet
          float envelope = exp(-waveDist * waveDist * 3.8) * exp(-dt * 1.35) * exp(-r * 0.22);
          
          // Harmonic wave train: primary capillary frequency (22 rad/m) + micro-crest harmonic (44 rad/m)
          float k1 = 22.0;
          float k2 = 44.0;
          float slope = rip.w * envelope * (
            k1 * cos(k1 * waveDist) + 
            0.55 * k2 * cos(k2 * waveDist)
          );

          rippleSlope += rDir * slope;
        }
      }
    }

    // 2. Synthesize High-Frequency Micro-Capillaries
    vec2 windCap = getWindCapillaries(vWorldPosition.xz, uTime);

    // 3. Composite Normal with Sub-Pixel Analytical Precision
    vec3 perturbed = vec3(
      baseN.x - rippleSlope.x * 1.8 - windCap.x,
      baseN.y,
      baseN.z - rippleSlope.y * 1.8 - windCap.y
    );
    vec3 N = normalize(perturbed);

    // Fresnel reflectance (water IOR = 1.333, F0 = 0.02)
    float F0 = 0.020;
    float cosTheta = clamp(dot(N, V), 0.0, 1.0);
    float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);

    // 4. Lantern Illumination & Specular Glistening
    vec3 lightVec = uLanternPos - vWorldPosition;
    float dist = length(lightVec);
    vec3 L = normalize(lightVec);

    // Physical inverse-square falloff
    float atten = 1.0 / (1.0 + 0.16 * dist + 0.10 * dist * dist);
    atten *= uLanternIntensity;

    float diff = max(dot(N, L), 0.0);
    vec3 lanternDiffuse = uLanternColor * diff * atten * 1.6;

    // Razor-sharp golden specular highlight catching the capillary micro-crests
    vec3 H = normalize(L + V);
    float specTight = pow(max(dot(N, H), 0.0), 160.0);
    float specBroad = pow(max(dot(N, H), 0.0), 28.0) * 0.25;
    vec3 lanternSpec = uLanternColor * (specTight * 6.5 + specBroad) * atten;

    // 5. Moon Glade (Silvery lunar glitter path across ripples)
    vec3 moonL = normalize(uMoonPos - vWorldPosition);
    vec3 moonH = normalize(moonL + V);
    float moonSpecTight = pow(max(dot(N, moonH), 0.0), 140.0);
    float moonSpecBroad = pow(max(dot(N, moonH), 0.0), 22.0) * 0.2;
    float moonDiff = max(dot(N, moonL), 0.0);
    vec3 moonGlint = uMoonColor * (moonSpecTight * 4.8 + moonSpecBroad * 1.2 + moonDiff * 0.22);

    // 6. Translucent Water Optical Extinction (revealing silver fish below)
    vec3 deepWater = vec3(0.012, 0.038, 0.095);
    vec3 litWater = vec3(0.035, 0.17, 0.24);
    vec3 baseWater = mix(litWater, deepWater, smoothstep(1.5, 8.5, dist));

    // Sky ambient reflection
    vec3 skyReflect = vec3(0.025, 0.075, 0.18);

    vec3 finalColor = mix(baseWater + lanternDiffuse * 0.35, skyReflect, fresnel * 0.88);
    finalColor += lanternSpec + moonGlint;

    // 7. Wawa Sensei Level 3 Chromatic Caustic Pattern on Water Surface
    // Optimization: Skip expensive Voronoi loops beyond visible lantern illumination range (dist < 18.0)
    if (uCausticsEnabled && uCausticIntensity > 0.01 && dist < 18.0) {
      // 1. Dominant ocean wave flow vector (Gerstner waves travel along (0.8, 0.6))
      vec2 swellDir = normalize(vec2(0.8, 0.6));
      vec2 waveMotion = swellDir * (uTime * 1.35);

      // 2. Wave refraction slope displacement:
      // When a wave passes, the surface normal tilts (baseN.xz). Light rays refract in the tilt direction!
      // This causes caustics to dynamically bunch up on wave crests and stretch across wave faces!
      vec2 waveSlopeDistort = baseN.xz * 1.85 - rippleSlope * 0.6;

      vec2 cUv = vWorldPosition.xz * 0.68 + waveSlopeDistort;
      float t = uTime;
      float rgbOffset = 0.018;

      // Sample 3 chromatic channels for rainbow dispersion advecting with the wave
      float rCh = evalWaterSurfaceCaustics(cUv + vec2(rgbOffset, 0.0), t, waveMotion);
      float gCh = evalWaterSurfaceCaustics(cUv, t, waveMotion);
      float bCh = evalWaterSurfaceCaustics(cUv - vec2(rgbOffset, 0.0), t, waveMotion);
      vec3 spectralCaustic = vec3(rCh, gCh, bCh) * uCausticIntensity;

      // When light hits the surface:
      // A. Golden-amber caustics illuminated by warm lantern light pool
      vec3 lanternSurfaceCaustic = uLanternColor * spectralCaustic * (atten * 5.4);

      // B. Cool aquamarine caustics along the moonlit ocean surface
      vec3 moonSurfaceCaustic = vec3(0.28, 0.78, 1.0) * spectralCaustic * 0.65;

      // Noticeable when looking from top-down perspective into the water
      float topDownFactor = pow(cosTheta, 1.1) * 0.75 + 0.35;
      vec3 surfaceCaustics = (lanternSurfaceCaustic + moonSurfaceCaustic) * topDownFactor * (1.0 - fresnel * 0.55);

      finalColor += surfaceCaustics;
    }

    // 8. Physical Transparency
    // When looking down near lantern, transparency rises so fish swimming below shine through
    float topDown = pow(cosTheta, 1.4);
    float lanternGlow = clamp(atten * 1.6, 0.0, 1.0);
    
    float alpha = mix(0.52, 0.94, fresnel);
    alpha -= lanternGlow * 0.25 * topDown;
    alpha = clamp(alpha, 0.38, 0.96);

    gl_FragColor = vec4(finalColor, alpha);
  }
`

export function OceanWater({
  ripples = [],
  lanternPos = [0, 1.8, 0],
  moonPos = [28, 35, -45],
  causticsEnabled = true,
  causticIntensity = 1.85
}) {
  const meshRef = useRef()
  const materialRef = useRef()

  const uniforms = useMemo(() => {
    const rippleArray = []
    for (let i = 0; i < 12; i++) {
      rippleArray.push(new THREE.Vector4(0, 0, -100, 0))
    }

    return {
      uTime: { value: 0 },
      uLanternPos: { value: new THREE.Vector3(...lanternPos) },
      uLanternColor: { value: new THREE.Color('#ffaa38') },
      uLanternIntensity: { value: 1.5 },
      uMoonPos: { value: new THREE.Vector3(...moonPos) },
      uMoonColor: { value: new THREE.Color('#b8d9ff') },
      uRipples: { value: rippleArray },
      uRippleCount: { value: 0 },
      uCausticIntensity: { value: causticIntensity },
      uCausticsEnabled: { value: causticsEnabled }
    }
  }, [causticIntensity, causticsEnabled, lanternPos, moonPos])

  useFrame((state) => {
    if (!materialRef.current) return
    const mat = materialRef.current
    mat.uniforms.uTime.value = state.clock.getElapsedTime()
    mat.uniforms.uLanternPos.value.set(...lanternPos)
    mat.uniforms.uMoonPos.value.set(...moonPos)
    mat.uniforms.uCausticIntensity.value = causticIntensity
    mat.uniforms.uCausticsEnabled.value = causticsEnabled

    const active = ripples.slice(-12)
    mat.uniforms.uRippleCount.value = active.length
    for (let i = 0; i < 12; i++) {
      if (i < active.length) {
        mat.uniforms.uRipples.value[i].set(
          active[i].x,
          active[i].z,
          active[i].startTime,
          active[i].amplitude
        )
      } else {
        mat.uniforms.uRipples.value[i].set(0, 0, -100, 0)
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      renderOrder={2}
    >
      <planeGeometry args={[110, 110, 200, 200]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
