/**
 * GLSL Shaders for Procedural Water Caustics
 *
 * Mathematical Approach:
 * 1. Simplex/Gradient Noise generates a continuous 2D divergence-free flow field for domain warping.
 * 2. Multi-frequency Domain Warping distorts UV coordinates smoothly without global translation.
 * 3. 2D Voronoi Cellular evaluation computes nearest site distance (F1) and second-nearest (F2).
 * 4. The differential boundary field (F2 - F1) isolates caustic light convergence ridges.
 * 5. Optical concentration function pow(1.0 - edge, sharpness) shapes concentrated rays of light.
 * 6. Multi-octave constructive interference combines 3 asynchronous spatial frequencies to eliminate polygonal patterns.
 * 7. Chromatic dispersion slightly splits RGB wave refraction channels for physical realism.
 */

export const causticsVertexShader = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const causticsFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;

uniform float uTime;
uniform float uScale;
uniform float uSpeed;
uniform float uIntensity;
uniform float uDistortion;
uniform float uEdgeWidth;
uniform float uSharpness;
uniform float uGlow;
uniform float uDispersion;
uniform vec3 uColor;
uniform vec3 uBaseColor;
uniform int uDebugMode;

// --- Fast Analytical 2D Noise for Domain Warping ---
vec2 hash2(vec2 p) {
  p = vec2(
    dot(p, vec2(127.1, 311.7)),
    dot(p, vec2(269.5, 183.3))
  );
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
        dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
    mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
        dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// 2D Rotation matrix
mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

// Multi-octave Flow Warp
vec2 domainWarp(vec2 p, float t) {
  vec2 q = vec2(
    noise(p + vec2(0.0, 0.0) + t * 0.15),
    noise(p + vec2(5.2, 1.3) - t * 0.18)
  );

  vec2 r = vec2(
    noise(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.22),
    noise(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.25)
  );

  return r;
}

// --- Cellular / Voronoi F1 & F2 Boundary Evaluation ---
// Evaluates nearest (F1) and 2nd nearest (F2) feature points with animated internal jitter
void voronoi(vec2 x, float t, out float f1, out float f2, out vec2 minPoint) {
  vec2 n = floor(x);
  vec2 f = fract(x);

  f1 = 8.0;
  f2 = 8.0;
  minPoint = vec2(0.0);

  // 3x3 neighborhood search
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);

      // Animate site positions smoothly along circular orbits to create fluid cellular breathing
      vec2 animatedOffset = 0.5 + 0.45 * sin(t + 6.2831 * o);
      vec2 r = g + animatedOffset - f;
      float d = dot(r, r);

      if (d < f1) {
        f2 = f1;
        f1 = d;
        minPoint = r;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }

  f1 = sqrt(f1);
  f2 = sqrt(f2);
}

// Single scale caustic light concentration computation
float singleCausticLayer(vec2 uv, float time, float scale, float speed, float warpAmp) {
  vec2 p = uv * scale;
  float t = time * speed;

  // Domain distortion
  vec2 warp = domainWarp(p * 0.5, t);
  p += warp * warpAmp;

  // Evaluate Voronoi boundaries
  float f1, f2;
  vec2 minPoint;
  voronoi(p, t * 1.5, f1, f2, minPoint);

  // Boundary difference: F2 - F1
  float edgeDist = f2 - f1;

  // Non-linear edge focusing: sharp peak along boundary curve
  float edge = 1.0 - smoothstep(0.0, uEdgeWidth, edgeDist);
  float light = pow(edge, uSharpness);

  return light;
}

// Composite multi-frequency procedural caustics
float computeCaustics(vec2 uv, float time, float dispOffset) {
  vec2 uvSample = uv + vec2(dispOffset);
  float t = time * uSpeed;

  // Primary dominant layer (Large structural flow)
  float c1 = singleCausticLayer(uvSample, t, uScale, 1.0, uDistortion * 1.2);

  // Secondary layer (Medium frequency rotated 45 deg, asynchronous counter-motion)
  vec2 uvRot1 = rot(0.785) * uvSample;
  float c2 = singleCausticLayer(uvRot1 + vec2(3.1, 7.4), t * 1.25, uScale * 1.85, 0.85, uDistortion * 0.9);

  // High-frequency detail filaments (Fine ripples)
  vec2 uvRot2 = rot(-0.523) * uvSample;
  float c3 = singleCausticLayer(uvRot2 + vec2(11.2, -4.8), t * 1.6, uScale * 3.4, 1.1, uDistortion * 0.6);

  // Constructive interference weighting
  float caustic = c1 * 0.55 + c2 * 0.32 + c3 * 0.18;

  // Modulated cross-interaction to break remaining symmetry
  caustic += pow(c1 * c2, 1.5) * 0.45;

  return caustic;
}

void main() {
  vec2 uv = vUv;
  float t = uTime;

  // --- DEBUG MODES ---
  if (uDebugMode == 1) {
    // Mode 1: Raw F1
    float f1, f2;
    vec2 mp;
    voronoi(uv * uScale, t * uSpeed, f1, f2, mp);
    gl_FragColor = vec4(vec3(f1), 1.0);
    return;
  }
  if (uDebugMode == 2) {
    // Mode 2: F2 - F1 Boundary Field
    float f1, f2;
    vec2 mp;
    voronoi(uv * uScale, t * uSpeed, f1, f2, mp);
    gl_FragColor = vec4(vec3(f2 - f1), 1.0);
    return;
  }
  if (uDebugMode == 3) {
    // Mode 3: Domain Distortion Vector Field
    vec2 warp = domainWarp(uv * uScale * 0.5, t * uSpeed);
    gl_FragColor = vec4(0.5 + 0.5 * warp, 0.0, 1.0);
    return;
  }
  if (uDebugMode == 4) {
    // Mode 4: Edge Light Mask (Single Layer)
    float edgeLight = singleCausticLayer(uv, t * uSpeed, uScale, 1.0, uDistortion);
    gl_FragColor = vec4(vec3(edgeLight), 1.0);
    return;
  }
  if (uDebugMode == 5) {
    // Mode 5: Multi-Scale Raw Intensity
    float rawIntensity = computeCaustics(uv, t, 0.0);
    gl_FragColor = vec4(vec3(rawIntensity), 1.0);
    return;
  }

  // --- FINAL BEAUTY RENDER (Mode 0) ---

  // Chromatic dispersion (RGB split due to wavelength-dependent water refraction)
  float rCaustic = computeCaustics(uv, t, -uDispersion);
  float gCaustic = computeCaustics(uv, t, 0.0);
  float bCaustic = computeCaustics(uv, t, uDispersion);

  vec3 causticRgb = vec3(rCaustic, gCaustic, bCaustic);

  // Soft surrounding optical glow around intense focal ridges
  float glowIntensity = smoothstep(0.05, 0.85, gCaustic) * uGlow;
  vec3 glowColor = uColor * glowIntensity;

  // Concentrated light color
  vec3 concentratedLight = uColor * causticRgb * uIntensity;

  // Ambient deep water shading with subtle depth variation
  vec3 waterBase = uBaseColor;

  // Composite: Ambient water + Concentrated caustic rays + Soft optical glow
  vec3 finalColor = waterBase + concentratedLight + glowColor;

  // Extra high-light intensity boost for sunlight glints
  float coreHighlight = pow(gCaustic, 4.0) * uIntensity * 0.5;
  finalColor += vec3(coreHighlight);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;
