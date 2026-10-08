export const aquariumCausticsVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

export const aquariumCausticsFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform float uTime;
uniform int uLevel; // 1: Basic Voronoi, 2: Warped Voronoi + Chromatic, 3: Advanced Voronoi & Delaunay F2-F1
uniform float uScale;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSharpness;
uniform float uDispersion;
uniform vec3 uColor;
uniform vec3 uBaseColor;
uniform vec3 uDeepColor;
uniform float uLightShafts;

// 2D Hash
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}

// Level 1: Standard Cellular / Voronoi F1
float voronoiL1(vec2 uv, float time) {
  vec2 p = floor(uv);
  vec2 f = fract(uv);
  float minDist = 1.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(p + g);
      // Sinusoidal cell center animation
      o = 0.5 + 0.4 * sin(time * 2.0 + 6.28318 * o);
      vec2 r = g - f + o;
      float d = length(r);
      minDist = min(minDist, d);
    }
  }
  return minDist;
}

// Level 2: Dual-frequency domain warped Voronoi with cellular clustering
float voronoiL2(vec2 uv, float time) {
  // Domain warp
  vec2 warp = vec2(
    sin(uv.y * 1.5 + time * 1.2),
    cos(uv.x * 1.5 + time * 1.0)
  ) * 0.35;

  vec2 warpedUv = uv + warp;
  vec2 p = floor(warpedUv);
  vec2 f = fract(warpedUv);
  float minDist = 1.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(p + g);
      o = 0.5 + 0.45 * sin(time * 1.8 + 6.28318 * o);
      vec2 r = g - f + o;
      float d = length(r);
      minDist = min(minDist, d);
    }
  }

  // Dual scale combination
  float v1 = pow(1.0 - minDist, 2.5);
  float v2 = pow(1.0 - voronoiL1(uv * 1.8 - warp, time * 0.8), 2.0) * 0.6;
  return v1 + v2;
}

// Level 3: Advanced Voronoi & Delaunay F2 - F1 boundary edge concentration
// Produces bright, thin caustic networks with cusp intersections
vec2 voronoiF1F2(vec2 uv, float time) {
  vec2 p = floor(uv);
  vec2 f = fract(uv);
  float d1 = 8.0;
  float d2 = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(p + g);
      // Smooth organic fluid motion
      o = 0.5 + 0.45 * sin(time * 2.2 + 6.28318 * o);
      vec2 r = g - f + o;
      float d = dot(r, r);

      if (d < d1) {
        d2 = d1;
        d1 = d;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  return vec2(sqrt(d1), sqrt(d2));
}

// Level 3 High-Fidelity Caustic Field
float causticsL3(vec2 uv, float time, float sharpness) {
  // Multi-frequency trigonometric fluid domain warp
  vec2 warp1 = vec2(
    sin(uv.y * 2.2 + time * 1.4 + cos(uv.x * 1.8)),
    cos(uv.x * 2.2 + time * 1.6 + sin(uv.y * 1.8))
  ) * 0.28;

  vec2 warp2 = vec2(
    cos(uv.x * 3.4 - time * 1.2),
    sin(uv.y * 3.4 - time * 1.5)
  ) * 0.15;

  vec2 q = uv + warp1 + warp2;

  // Primary F2 - F1 Delaunay/Voronoi boundary edge
  vec2 f12_a = voronoiF1F2(q * 1.0, time * 0.9);
  float edge_a = f12_a.y - f12_a.x;
  float caustic_a = 1.0 - smoothstep(0.0, 0.16, edge_a);
  caustic_a = pow(caustic_a, sharpness);

  // Secondary fine-detail caustic web
  vec2 f12_b = voronoiF1F2(q * 2.1 + vec2(1.7, 3.4), time * 1.3);
  float edge_b = f12_b.y - f12_b.x;
  float caustic_b = 1.0 - smoothstep(0.0, 0.22, edge_b);
  caustic_b = pow(caustic_b, sharpness * 0.85) * 0.55;

  // Tertiary soft intensity swell
  float swell = pow(1.0 - f12_a.x, 3.0) * 0.35;

  return (caustic_a + caustic_b + swell) * 1.35;
}

void main() {
  vec2 uv = vWorldPosition.xz * (uScale * 0.1);
  float t = uTime * uSpeed;

  vec3 causticColor = vec3(0.0);

  if (uLevel == 1) {
    // Level 1: Basic Voronoi F1 projection
    float c = pow(1.0 - voronoiL1(uv, t), uSharpness);
    causticColor = vec3(c) * uColor * uIntensity;

  } else if (uLevel == 2) {
    // Level 2: Warped Voronoi with RGB Chromatic Dispersion
    float disp = uDispersion * 0.8;
    float r = voronoiL2(uv + vec2(disp, 0.0), t);
    float g = voronoiL2(uv, t);
    float b = voronoiL2(uv - vec2(disp, 0.0), t);
    causticColor = vec3(r, g, b) * uColor * uIntensity;

  } else {
    // Level 3: Advanced Voronoi & Delaunay F2-F1 with Multi-Warp & Spectral Dispersion
    float disp = uDispersion * 1.2;
    float r = causticsL3(uv + vec2(disp, disp * 0.5), t * 1.02, uSharpness);
    float g = causticsL3(uv, t, uSharpness);
    float b = causticsL3(uv - vec2(disp, disp * 0.5), t * 0.98, uSharpness);

    // High intensity light focus
    vec3 spectralCaustics = vec3(r, g, b);
    causticColor = spectralCaustics * uColor * uIntensity;
  }

  // Base underwater seabed color with depth darkening
  vec3 base = mix(uBaseColor, uDeepColor, smoothstep(0.0, -4.0, vWorldPosition.y));

  // Volumetric top-down light shaft contribution
  float shaft = 0.0;
  if (uLightShafts > 0.01) {
    float shaftNoise = sin(vWorldPosition.x * 0.8 + t * 0.5) * cos(vWorldPosition.z * 0.8 + t * 0.4);
    shaft = smoothstep(0.2, 1.0, shaftNoise) * uLightShafts * 0.4;
  }

  // Composite final shaded output
  vec3 finalColor = base + causticColor + vec3(shaft) * uColor;

  gl_FragColor = vec4(finalColor, 1.0);
}
`
