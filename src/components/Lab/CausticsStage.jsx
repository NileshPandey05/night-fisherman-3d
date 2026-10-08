import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`

const fragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform int uLevel;
  uniform float uScaleA;
  uniform float uScaleB;
  uniform float uSpeed;
  uniform float uSharpness;
  uniform float uIntensity;
  uniform float uRgbOffset;
  uniform float uWaterLevel;
  uniform float uRawField;
  uniform float uShowSeeds;
  uniform int uLayer;

  varying vec3 vWorldPosition;
  varying vec3 vNormal;
  varying vec2 vUv;

  vec2 hash2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453123);
  }

  vec3 voronoi(vec2 p, float t) {
    vec2 n = floor(p);
    vec2 r = fract(p);
    float f1 = 10.0;
    float f2 = 10.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 g = vec2(float(i), float(j));
        vec2 o = sin(hash2(n + g) * 6.28318530718 + t) * 0.36 + 0.5;
        vec2 diff = g + o - r;
        float d = length(diff);
        f2 = min(f2, max(f1, d));
        f1 = min(f1, d);
      }
    }
    float seedMask = 1.0 - smoothstep(0.025, 0.065, f1);
    return vec3(f1, f2, seedMask);
  }

  struct LayerResult {
    float field;
    float raw;
    float seeds;
  };

  LayerResult evalLayer(vec2 pos, float t) {
    float r = t * uSpeed;
    vec3 i = voronoi(pos * uScaleA + vec2(r * 0.33, r * 0.12), r);
    vec3 a = voronoi(pos * uScaleB - vec2(r * 0.2, r * 0.29) + 7.3, r * 0.83);

    float edgeA = pow(1.0 - clamp(i.y - i.x, 0.0, 1.0), uSharpness);
    float edgeB = pow(1.0 - clamp(a.y - a.x, 0.0, 1.0), uSharpness);
    float combined = sqrt(edgeA * edgeB);

    float f = combined;
    float raw = i.x;
    float seeds = max(i.z, a.z);

    if (uLayer == 1) {
      f = edgeA;
      raw = i.x;
      seeds = i.z;
    } else if (uLayer == 2) {
      f = edgeB;
      raw = a.x;
      seeds = a.z;
    }

    return LayerResult(f, raw, seeds);
  }

  void main() {
    float depth = max(0.0, uWaterLevel - vWorldPosition.y);
    vec2 projUv = vWorldPosition.xz - vec2(-0.45, 0.35) * (vWorldPosition.y / 0.8);
    float r = uTime * uSpeed;

    vec3 sandColor = vec3(0.788, 0.725, 0.541); // #c9b98a
    vec3 waterColor = vec3(0.278, 0.494, 0.471); // #477e78
    vec3 seabedBase = uLevel < 3
      ? vec3(0.220, 0.420, 0.439) // #386b70
      : mix(sandColor, waterColor, smoothstep(0.0, 0.25, depth) * 0.72);

    vec3 finalColor = vec3(0.0);

    if (uLevel == 1) {
      vec3 v = voronoi(projUv * uScaleA + vec2(r * 0.33, r * 0.12), r);
      float blob = pow(clamp(v.x, 0.0, 1.0), 3.0) * uIntensity;
      float val = mix(blob, v.x, uRawField);
      vec3 col = mix(seabedBase + vec3(val), vec3(val), uRawField);
      finalColor = mix(col, vec3(1.0, 0.3, 0.08), v.z * uShowSeeds);
    } else if (uLevel == 2) {
      vec3 v = voronoi(projUv * uScaleA + vec2(r * 0.33, r * 0.12), r);
      float edge = v.y - v.x;
      float edgeVal = pow(1.0 - clamp(edge, 0.0, 1.0), uSharpness) * uIntensity;
      float val = mix(edgeVal, edge, uRawField);
      vec3 col = mix(seabedBase + vec3(val), vec3(val), uRawField);
      finalColor = mix(col, vec3(1.0, 0.3, 0.08), v.z * uShowSeeds);
    } else {
      // Level 3: Dual counter-scrolling Voronoi with RGB dispersion and depth attenuation
      LayerResult base = evalLayer(projUv, uTime);
      LayerResult rCh = evalLayer(projUv + vec2(uRgbOffset, 0.0), uTime);
      LayerResult bCh = evalLayer(projUv - vec2(uRgbOffset, 0.0), uTime);

      float depthAtten = smoothstep(0.0, 0.15, depth);
      vec3 rgbField = vec3(rCh.field, base.field, bCh.field) * uIntensity * depthAtten;

      vec3 causticsCol = mix(seabedBase + rgbField, vec3(base.raw), uRawField);
      finalColor = mix(causticsCol, vec3(1.0, 0.22, 0.04), base.seeds * uShowSeeds);
    }

    // Directional light & ambient shading
    vec3 lightDir = normalize(vec3(-8.0, 16.0, 9.0));
    float diff = max(dot(vNormal, lightDir), 0.0) * 0.55 + 0.45;
    vec3 ambient = vec3(0.08, 0.16, 0.25);
    vec3 litColor = finalColor * diff + ambient * seabedBase * 0.3;

    gl_FragColor = vec4(mix(litColor, finalColor, uRawField), 1.0);
  }
`

export function CausticsStage({ level = 3, params = {} }) {
  const meshRef = useRef()
  const matRef = useRef()
  const timeRef = useRef(0)

  // Topography matching Wawa Sensei: y = 0.1 + (x + 7) / 14 * 1.65 + noise
  const terrainGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(14, 11, 110, 90)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position

    const pseudoNoise = (x, z) => {
      return Math.sin(x * 1.2 + z * 0.7) * Math.cos(z * 1.1 - x * 0.5) * 0.5 +
             Math.sin(x * 2.5 + z * 1.8) * 0.25
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const height = 0.1 + ((x + 7.0) / 14.0) * 1.65 + pseudoNoise(x * 0.3, z * 0.3) * 0.11
      pos.setY(i, height)
    }

    geo.computeVertexNormals()
    return geo
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uLevel: { value: level },
    uScaleA: { value: params.scaleA ?? 2.3 },
    uScaleB: { value: params.scaleB ?? 3.7 },
    uSpeed: { value: params.speed ?? 0.32 },
    uSharpness: { value: params.sharpness ?? 18 },
    uIntensity: { value: params.intensity ?? 1.65 },
    uRgbOffset: { value: params.rgbOffset ?? 0.012 },
    uWaterLevel: { value: params.waterLevel ?? 1.05 },
    uRawField: { value: params.rawField ? 1.0 : 0.0 },
    uShowSeeds: { value: params.showSeeds ? 1.0 : 0.0 },
    uLayer: { value: params.layer ?? 0 },
  }), [level, params])

  useFrame((_, delta) => {
    if (!params.freeze) {
      timeRef.current += delta
    }
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = timeRef.current
      matRef.current.uniforms.uLevel.value = level
      matRef.current.uniforms.uScaleA.value = params.scaleA ?? 2.3
      matRef.current.uniforms.uScaleB.value = params.scaleB ?? 3.7
      matRef.current.uniforms.uSpeed.value = params.speed ?? 0.32
      matRef.current.uniforms.uSharpness.value = params.sharpness ?? 18
      matRef.current.uniforms.uIntensity.value = params.intensity ?? 1.65
      matRef.current.uniforms.uRgbOffset.value = params.rgbOffset ?? 0.012
      matRef.current.uniforms.uWaterLevel.value = params.waterLevel ?? 1.05
      matRef.current.uniforms.uRawField.value = params.rawField ? 1.0 : 0.0
      matRef.current.uniforms.uShowSeeds.value = params.showSeeds ? 1.0 : 0.0
      matRef.current.uniforms.uLayer.value = params.layer ?? 0
    }
  })

  const waterY = params.waterLevel ?? 1.05
  const showWaterPlane = !params.rawField

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

      {/* Seabed Mesh with Caustics Shader */}
      <mesh ref={meshRef} geometry={terrainGeo} receiveShadow>
        <shaderMaterial
          ref={matRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>

      {/* Transparent Water Surface Plane */}
      {showWaterPlane && (
        <mesh position={[0, waterY, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[14, 11]} />
          <meshStandardMaterial
            color="#679d99"
            transparent
            opacity={0.065}
            roughness={0.22}
            metalness={0.15}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Deep Ground Floor Base */}
      <mesh position={[0, -0.025, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#062e48" roughness={0.65} metalness={0.15} />
      </mesh>
    </group>
  )
}
