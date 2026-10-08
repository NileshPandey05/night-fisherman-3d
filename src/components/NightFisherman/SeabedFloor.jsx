import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const seabedVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    // Gentle underwater dune undulations
    vec3 pos = position;
    float dune = sin(pos.x * 0.12) * cos(pos.y * 0.14) * 0.45;
    dune += sin(pos.x * 0.35 + 1.2) * 0.18;
    pos.z += dune;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    vNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const seabedFragmentShader = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec3 uLanternPos;
  uniform vec3 uLanternColor;
  uniform float uLanternIntensity;
  uniform vec3 uMoonPos;
  uniform vec3 uMoonColor;
  uniform float uCausticIntensity;
  uniform float uRgbOffset;
  uniform float uSharpness;
  uniform float uSpeed;
  uniform bool uCausticsEnabled;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453123);
  }

  // Voronoi F1 and F2 distance calculation
  vec3 voronoi(vec2 p, float t) {
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
    return vec3(f1, f2, 0.0);
  }

  // Wawa Sensei Level 3 Caustic Layer: Dual Counter-Scrolling Voronoi Lenses flowing with ocean swell
  float evalCausticFocalWeb(vec2 pos, float t) {
    float r = t * uSpeed;
    vec2 swellFlow = normalize(vec2(0.8, 0.6)) * (r * 1.5);
    // Layer A moving with ocean swell
    vec3 i = voronoi(pos * 2.3 + swellFlow + vec2(r * 0.42, r * 0.20), r);
    // Layer B moving counter-diagonally with cross swell
    vec3 a = voronoi(pos * 3.7 - swellFlow * 0.9 - vec2(r * 0.30, r * 0.38) + 7.3, r * 1.15);

    float edgeA = pow(1.0 - clamp(i.y - i.x, 0.0, 1.0), uSharpness);
    float edgeB = pow(1.0 - clamp(a.y - a.x, 0.0, 1.0), uSharpness);
    
    // Geometric mean creates thin, intersecting caustic cusps
    return sqrt(edgeA * edgeB);
  }

  void main() {
    // 1. Dark Nocturnal Seabed Base (deep oceanic sand & basalt)
    vec3 sandDeep = vec3(0.008, 0.024, 0.048);
    vec3 sandMid = vec3(0.018, 0.042, 0.072);
    
    // Subtle sandy noise pattern
    float sandNoise = sin(vWorldPosition.x * 2.5) * cos(vWorldPosition.z * 2.5) * 0.5 + 0.5;
    vec3 seabedBase = mix(sandDeep, sandMid, sandNoise * 0.4);

    // 2. Light Distances
    vec3 lanternVec = uLanternPos - vWorldPosition;
    float lanternDist = length(lanternVec);
    vec3 lanternL = normalize(lanternVec);
    float lanternAtten = 1.0 / (1.0 + 0.12 * lanternDist + 0.06 * lanternDist * lanternDist);
    lanternAtten *= uLanternIntensity;

    // Moonlight
    vec3 moonL = normalize(uMoonPos - vWorldPosition);
    float moonDiff = max(dot(vNormal, moonL), 0.0) * 0.4 + 0.6;

    // 3. Wawa Sensei Level 3 Caustics with Chromatic Dispersion
    vec3 causticColor = vec3(0.0);
    if (uCausticsEnabled && uCausticIntensity > 0.01) {
      vec2 projUv = vWorldPosition.xz * 0.75;
      float t = uTime;

      // Sample 3 chromatic channels with spatial offset for dispersion
      float rCh = evalCausticFocalWeb(projUv + vec2(uRgbOffset, 0.0), t);
      float gCh = evalCausticFocalWeb(projUv, t);
      float bCh = evalCausticFocalWeb(projUv - vec2(uRgbOffset, 0.0), t);

      vec3 spectralCaustics = vec3(rCh, gCh, bCh) * uCausticIntensity;

      // Dual-Light Caustic Tinting:
      // Golden-amber directly under the fisherman's lantern, luminescent aquamarine/cyan in moonlit sea
      vec3 lanternCaustic = uLanternColor * spectralCaustics * (lanternAtten * 3.8);
      vec3 moonCaustic = vec3(0.25, 0.75, 1.0) * spectralCaustics * 0.45;

      // Attenuate caustics with distance from water surface (Beer-Lambert)
      float waterDepth = max(0.0, -vWorldPosition.y);
      float depthFactor = exp(-waterDepth * 0.28);

      causticColor = (lanternCaustic + moonCaustic) * depthFactor;
    }

    // 4. Combine Lighting
    float diff = max(dot(vNormal, lanternL), 0.0) * lanternAtten;
    vec3 lanternDiffuse = uLanternColor * diff * 0.8;
    vec3 ambient = vec3(0.005, 0.014, 0.035) * moonDiff;

    vec3 finalColor = seabedBase + lanternDiffuse + ambient + causticColor;

    // Subtle nocturnal fog extinction
    float camDist = length(cameraPosition - vWorldPosition);
    float fog = 1.0 - exp(-camDist * 0.035);
    vec3 fogColor = vec3(0.008, 0.020, 0.045);
    finalColor = mix(finalColor, fogColor, clamp(fog, 0.0, 0.95));

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

export function SeabedFloor({
  lanternPos = [0, 1.8, 0],
  moonPos = [26, 36, -46],
  causticsEnabled = true,
  causticIntensity = 1.85
}) {
  const meshRef = useRef()
  const matRef = useRef()

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLanternPos: { value: new THREE.Vector3(...lanternPos) },
    uLanternColor: { value: new THREE.Color('#ffa63b') },
    uLanternIntensity: { value: 1.5 },
    uMoonPos: { value: new THREE.Vector3(...moonPos) },
    uMoonColor: { value: new THREE.Color('#b8d9ff') },
    uCausticIntensity: { value: causticIntensity },
    uRgbOffset: { value: 0.016 },
    uSharpness: { value: 18.0 },
    uSpeed: { value: 1.35 },
    uCausticsEnabled: { value: causticsEnabled }
  }), [causticIntensity, causticsEnabled, lanternPos, moonPos])

  useFrame((state) => {
    if (!matRef.current) return
    const mat = matRef.current
    mat.uniforms.uTime.value = state.clock.getElapsedTime()
    mat.uniforms.uLanternPos.value.set(...lanternPos)
    mat.uniforms.uMoonPos.value.set(...moonPos)
    mat.uniforms.uCausticIntensity.value = causticIntensity
    mat.uniforms.uCausticsEnabled.value = causticsEnabled
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -5.6, 0]}
      receiveShadow
    >
      <planeGeometry args={[95, 95, 64, 64]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={seabedVertexShader}
        fragmentShader={seabedFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  )
}
