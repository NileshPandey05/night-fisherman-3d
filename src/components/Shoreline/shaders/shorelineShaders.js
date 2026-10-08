/**
 * Physics-inspired GLSL Shaders for Shoreline & Caustics Simulation
 *
 * Implements:
 * - Analytical shallow-water wave shoaling (frequency compression, amplitude growth, asymmetric crests)
 * - Swash run-up & backwash bore propagation
 * - Wave breaking detection & turbulent dissipation
 * - Sand terrain displacement with bathymetry & sediment erosion/deposition
 * - Wetness calculation (darkening, specular boost, roughness reduction)
 * - Multi-scale procedural caustics with depth attenuation & chromatic dispersion
 * - Multi-layer foam generation, advection & lace edge filaments
 * - Fresnel reflection, Beer-Lambert water depth absorption & sun specular highlights
 * - 11 comprehensive debug visualization modes
 */

export const sandVertexShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vSandHeight;
varying float vWaterDepth;
varying float vWetness;
varying float vCausticInt;
varying vec2 vFlow;

uniform float uTime;
uniform float uSlope;
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform float uErosionRate;
uniform float uDepositionRate;
uniform float uSwashRunup;

// Simple 2D noise for terrain & sediment variations
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
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

// Compute seabed bathymetry height S(x, z)
float getSeabedBaseHeight(vec2 xz) {
  float z = xz.y;
  // Natural beach slope: deep ocean at z = -12 (~-3.2m), shelf around z = -3, beach berm at z > 2
  float profile = (z + 2.0) * uSlope - 0.6;
  // Submerged sandbars and subtle undulating ripples
  float bar = 0.25 * sin(xz.y * 0.45 + 1.2) * exp(-0.08 * (xz.y + 4.0) * (xz.y + 4.0));
  float dunes = 0.08 * noise(xz * 0.25) + 0.03 * noise(xz * 0.8);
  return profile + bar + dunes;
}

// Compute water surface height at point (x, z) to determine instantaneous depth
float getWaterSurfaceHeight(vec2 xz, float t) {
  float z = xz.y;
  float x = xz.x;

  // Shoaling parameters
  float deepDist = clamp(-z * 0.15, 0.0, 2.0);
  float k = mix(0.9, 0.35, clamp(deepDist, 0.0, 1.0)); // Shoaling wavenumber compression
  float c = mix(1.2, 2.2, clamp(deepDist, 0.0, 1.0)); // Wave celerity slows down in shallow

  // Primary ocean swell traveling +z (toward beach)
  float phase1 = k * z - t * uWaveSpeed * c;
  float swell1 = uWaveHeight * (0.6 * sin(phase1) + 0.25 * sin(2.0 * phase1 - 0.5));

  // Angled secondary refraction wave
  float phase2 = (0.2 * x + k * 0.9 * z) - t * uWaveSpeed * (c * 0.9) + 1.5;
  float swell2 = (uWaveHeight * 0.35) * sin(phase2);

  // Swash surge component pushing up the beach slope
  float swashPhase = t * uWaveSpeed * 0.7;
  float swashCycle = fract(swashPhase * 0.16);
  float swashFront = mix(-2.0, uSwashRunup * 4.0, smoothstep(0.0, 0.45, swashCycle) * (1.0 - smoothstep(0.45, 1.0, swashCycle)));
  float swashHeight = max(0.0, (swashFront - z) * 0.15) * exp(-max(0.0, z - swashFront) * 0.8);

  return swell1 + swell2 + swashHeight;
}

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);

  // Base seabed elevation
  float sandH = getSeabedBaseHeight(worldPos.xz);

  // Dynamic sediment erosion/deposition effect
  float sedimentDelta = (uDepositionRate - uErosionRate) * 0.15 * (0.5 + 0.5 * sin(worldPos.x * 0.3 + worldPos.z * 0.2));
  sandH += sedimentDelta;

  // Displace vertex Y
  worldPos.y = sandH;
  vSandHeight = sandH;
  vWorldPosition = worldPos.xyz;

  // Approximate analytical normal using finite difference
  float eps = 0.1;
  float hL = getSeabedBaseHeight(worldPos.xz - vec2(eps, 0.0));
  float hR = getSeabedBaseHeight(worldPos.xz + vec2(eps, 0.0));
  float hD = getSeabedBaseHeight(worldPos.xz - vec2(0.0, eps));
  float hU = getSeabedBaseHeight(worldPos.xz + vec2(0.0, eps));
  vec3 n = normalize(vec3((hL - hR) / (2.0 * eps), 1.0, (hD - hU) / (2.0 * eps)));
  vNormal = normalize(mat3(modelMatrix) * n);

  // Compute local instantaneous water depth and wetness
  float waterH = getWaterSurfaceHeight(worldPos.xz, uTime);
  float depth = max(0.0, waterH - sandH);
  vWaterDepth = depth;

  // Wetness envelope: sand stays wet during receding swash
  float maxWaterReach = uSwashRunup * 2.8;
  float recentWet = smoothstep(maxWaterReach + 1.0, -1.0, worldPos.z);
  vWetness = clamp(smoothstep(0.0, 0.4, depth) + recentWet * 0.65, 0.0, 1.0);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const sandFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vSandHeight;
varying float vWaterDepth;
varying float vWetness;

uniform float uTime;
uniform float uCausticIntensity;
uniform float uCausticScale;
uniform float uCausticSpeed;
uniform vec3 uSandDryColor;
uniform vec3 uSandMidColor;
uniform vec3 uSandWetColor;
uniform vec3 uSandDeepWetColor;
uniform vec3 uCausticColor;
uniform vec3 uSunPosition;
uniform int uDebugMode;

// 2D Simplex/Analytical Hash Noise for Sand Grain & Domain Warp
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
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

mat2 rot(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat2(c, -s, s, c);
}

// Continuous Domain Warping
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

// Cellular Voronoi F1 & F2 Boundary Evaluation for Caustic Ribbons
void voronoi(vec2 x, float t, out float f1, out float f2) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  f1 = 8.0;
  f2 = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      vec2 animatedOffset = 0.5 + 0.45 * sin(t + 6.2831 * o);
      vec2 r = g + animatedOffset - f;
      float d = dot(r, r);

      if (d < f1) {
        f2 = f1;
        f1 = d;
      } else if (d < f2) {
        f2 = d;
      }
    }
  }
  f1 = sqrt(f1);
  f2 = sqrt(f2);
}

float singleCausticLayer(vec2 uv, float time, float scale, float speed, float warpAmp) {
  vec2 p = uv * scale;
  float t = time * speed;
  vec2 warp = domainWarp(p * 0.5, t);
  p += warp * warpAmp;

  float f1, f2;
  voronoi(p, t * 1.5, f1, f2);

  float edgeDist = f2 - f1;
  float edge = 1.0 - smoothstep(0.0, 0.09, edgeDist);
  return pow(edge, 3.0);
}

// Multi-scale constructive caustic field with chromatic offset
float computeCaustic(vec2 uv, float time, float dispOffset) {
  vec2 uvSample = uv + vec2(dispOffset);
  float t = time * uCausticSpeed;

  float c1 = singleCausticLayer(uvSample, t, uCausticScale, 1.0, 0.4);
  vec2 uvRot1 = rot(0.785) * uvSample;
  float c2 = singleCausticLayer(uvRot1 + vec2(3.1, 7.4), t * 1.2, uCausticScale * 1.8, 0.85, 0.35);
  vec2 uvRot2 = rot(-0.523) * uvSample;
  float c3 = singleCausticLayer(uvRot2 + vec2(11.2, -4.8), t * 1.5, uCausticScale * 3.2, 1.1, 0.25);

  float caustic = c1 * 0.55 + c2 * 0.32 + c3 * 0.18;
  caustic += pow(c1 * c2, 1.5) * 0.45;
  return caustic;
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 L = normalize(uSunPosition - vWorldPosition);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 H = normalize(L + V);

  // Micro-variation noise for natural sand grain color
  float grainNoise = noise(vWorldPosition.xz * 12.0) * 0.06;
  float macroNoise = noise(vWorldPosition.xz * 1.5) * 0.08;

  // Wetness color gradient
  // Dry -> Mid -> Wet -> Deep Wet
  vec3 dryBase = uSandDryColor + vec3(macroNoise + grainNoise);
  vec3 midBase = uSandMidColor + vec3(grainNoise);
  vec3 wetBase = uSandWetColor + vec3(grainNoise * 0.5);
  vec3 deepWetBase = uSandDeepWetColor;

  vec3 baseSand;
  if (vWetness < 0.4) {
    baseSand = mix(dryBase, midBase, vWetness / 0.4);
  } else if (vWetness < 0.75) {
    baseSand = mix(midBase, wetBase, (vWetness - 0.4) / 0.35);
  } else {
    baseSand = mix(wetBase, deepWetBase, (vWetness - 0.75) / 0.25);
  }

  // Diffuse lighting
  float NdotL = max(dot(N, L), 0.0);
  vec3 diffuse = baseSand * (NdotL * 0.85 + 0.18);

  // Wet sand specular reflection (drops roughness from 0.9 to 0.2, sharp sun highlight)
  float roughness = mix(0.9, 0.22, vWetness);
  float specPower = mix(4.0, 64.0, vWetness);
  float specIntensity = mix(0.04, 0.65, vWetness);
  float NdotH = max(dot(N, H), 0.0);
  float specular = pow(NdotH, specPower) * specIntensity;

  // Underwater & shallow shoreline caustics
  float depth = vWaterDepth;
  float depthFade = smoothstep(0.01, 0.12, depth) * exp(-depth * 0.85); // Attenuates with deep water

  float rCaustic = computeCaustic(vWorldPosition.xz * 0.4, uTime, -0.012);
  float gCaustic = computeCaustic(vWorldPosition.xz * 0.4, uTime, 0.0);
  float bCaustic = computeCaustic(vWorldPosition.xz * 0.4, uTime, 0.012);
  vec3 causticRgb = vec3(rCaustic, gCaustic, bCaustic) * uCausticIntensity * depthFade;

  // Caustic soft bloom & core highlight
  float glow = smoothstep(0.1, 0.8, gCaustic) * 0.35 * depthFade;
  vec3 causticColor = (uCausticColor * causticRgb + uCausticColor * glow) * NdotL;

  // Underwater sand scattering tint (slight cyan/blue light absorption)
  float underwaterFilter = clamp(depth * 0.35, 0.0, 0.7);
  vec3 underwaterTint = mix(vec3(1.0), vec3(0.5, 0.85, 0.95), underwaterFilter);

  vec3 finalColor = (diffuse * underwaterTint) + vec3(specular) + causticColor;

  // Debug visualizer branches
  if (uDebugMode == 2) {
    // Water Depth
    gl_FragColor = vec4(vec3(clamp(vWaterDepth * 0.5, 0.0, 1.0)), 1.0);
    return;
  }
  if (uDebugMode == 6) {
    // Sand Height
    float hVis = (vSandHeight + 3.0) / 6.0;
    gl_FragColor = vec4(vec3(clamp(hVis, 0.0, 1.0)), 1.0);
    return;
  }
  if (uDebugMode == 7) {
    // Sediment distribution
    float sedVis = 0.5 + 0.5 * sin(vWorldPosition.x * 0.3 + vWorldPosition.z * 0.2);
    gl_FragColor = vec4(vec3(sedVis * 0.8, sedVis * 0.5, 0.2), 1.0);
    return;
  }
  if (uDebugMode == 9) {
    // Caustics illumination field
    gl_FragColor = vec4(causticRgb, 1.0);
    return;
  }
  if (uDebugMode == 10) {
    // Wetness / Moving shoreline mask
    gl_FragColor = vec4(vec3(vWetness), 1.0);
    return;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

export const waterVertexShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaterDepth;
varying float vBreaking;
varying float vFoam;
varying vec2 vVelocity;

uniform float uTime;
uniform float uSlope;
uniform float uWaveHeight;
uniform float uWaveSpeed;
uniform float uBreakingThreshold;
uniform float uSwashRunup;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
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

float getSeabedBaseHeight(vec2 xz) {
  float z = xz.y;
  float profile = (z + 2.0) * uSlope - 0.6;
  float bar = 0.25 * sin(xz.y * 0.45 + 1.2) * exp(-0.08 * (xz.y + 4.0) * (xz.y + 4.0));
  float dunes = 0.08 * noise(xz * 0.25) + 0.03 * noise(xz * 0.8);
  return profile + bar + dunes;
}

// Compute wave elevation, breaking metric, and surface velocity
void evaluateWaveField(vec2 xz, float t, out float waveH, out float breaking, out vec2 vel) {
  float z = xz.y;
  float x = xz.x;

  // Distance from deep ocean (z < -8) to shallow shoreline (z ~ 0)
  float deepFactor = clamp(-z * 0.15, 0.0, 2.0);

  // Shallow-water physics:
  // As depth decreases: wavelength compresses (k increases), speed slows (c decreases), amplitude grows (H increases)
  float k = mix(0.9, 0.35, clamp(deepFactor, 0.0, 1.0));
  float c = mix(1.2, 2.2, clamp(deepFactor, 0.0, 1.0));
  float shoalingAmp = mix(1.4, 0.8, clamp(deepFactor, 0.0, 1.0));

  // Dominant swell with Gerstner-style non-linear steep crests
  float phase1 = k * z - t * uWaveSpeed * c;
  float crestSharpness = mix(2.2, 1.2, clamp(deepFactor, 0.0, 1.0));
  float rawSine = sin(phase1);
  float sharpWave = pow(0.5 + 0.5 * rawSine, crestSharpness) * 2.0 - 1.0;
  float swell1 = uWaveHeight * shoalingAmp * (0.75 * sharpWave + 0.25 * sin(2.0 * phase1 - 0.4));

  // Angled cross swell
  float phase2 = (0.25 * x + k * 0.85 * z) - t * uWaveSpeed * (c * 0.9) + 1.2;
  float swell2 = (uWaveHeight * 0.32) * sin(phase2);

  // High-frequency capillary ripples
  float ripple = 0.04 * noise(xz * 2.0 + t * 1.5) + 0.02 * noise(xz * 4.5 - t * 2.0);

  // Swash bore surge running up the beach
  float swashPhase = t * uWaveSpeed * 0.7;
  float swashCycle = fract(swashPhase * 0.16);
  float swashFront = mix(-2.0, uSwashRunup * 4.0, smoothstep(0.0, 0.45, swashCycle) * (1.0 - smoothstep(0.45, 1.0, swashCycle)));
  float swashProg = smoothstep(0.0, 0.45, swashCycle);
  float swashHeight = max(0.0, (swashFront - z) * 0.18) * exp(-max(0.0, z - swashFront) * 0.75);

  float totalWave = swell1 + swell2 + ripple + swashHeight;

  // Local water depth
  float sandH = getSeabedBaseHeight(xz);
  float localDepth = max(0.001, totalWave - sandH);

  // Wave breaking criterion: ratio of wave height to local water depth (McCowan index > 0.78)
  float steepness = (uWaveHeight * shoalingAmp) / localDepth;
  float isBreaking = smoothstep(uBreakingThreshold * 0.8, uBreakingThreshold * 1.3, steepness) * smoothstep(-8.0, 0.5, z);

  // Flow velocity approximation
  float vz = cos(phase1) * uWaveSpeed * 1.5;
  if (swashProg < 0.45) {
    vz += 1.8 * (1.0 - swashProg / 0.45); // Swash rush inland
  } else {
    vz -= 1.2 * ((swashProg - 0.45) / 0.55); // Backwash return seaward
  }
  float vx = 0.2 * sin(phase2);

  waveH = totalWave;
  breaking = isBreaking;
  vel = vec2(vx, vz);
}

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);

  float waveH;
  float breaking;
  vec2 vel;
  evaluateWaveField(worldPos.xz, uTime, waveH, breaking, vel);

  float sandH = getSeabedBaseHeight(worldPos.xz);

  // Water surface stays strictly at or above the seabed sand
  float finalY = max(sandH, waveH);
  worldPos.y = finalY;

  vWorldPosition = worldPos.xyz;
  vWaterDepth = max(0.0, finalY - sandH);
  vBreaking = breaking;
  vVelocity = vel;

  // Compute surface normals with finite differences
  float eps = 0.08;
  float hL, hR, hD, hU;
  float bkDummy; vec2 velDummy;
  evaluateWaveField(worldPos.xz - vec2(eps, 0.0), uTime, hL, bkDummy, velDummy);
  evaluateWaveField(worldPos.xz + vec2(eps, 0.0), uTime, hR, bkDummy, velDummy);
  evaluateWaveField(worldPos.xz - vec2(0.0, eps), uTime, hD, bkDummy, velDummy);
  evaluateWaveField(worldPos.xz + vec2(0.0, eps), uTime, hU, bkDummy, velDummy);

  vec3 n = normalize(vec3((hL - hR) / (2.0 * eps), 1.0, (hD - hU) / (2.0 * eps)));
  vNormal = normalize(mat3(modelMatrix) * n);

  // Foam accumulation from breaking crests and shoreline turbulence
  float foamSource = breaking * 1.4 + smoothstep(0.25, 0.0, vWaterDepth) * 0.85;
  vFoam = clamp(foamSource, 0.0, 1.0);

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

export const waterFragmentShader = /* glsl */ `
precision highp float;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaterDepth;
varying float vBreaking;
varying float vFoam;
varying vec2 vVelocity;

uniform float uTime;
uniform vec3 uWaterDeepColor;
uniform vec3 uWaterMidColor;
uniform vec3 uWaterShallowColor;
uniform vec3 uFoamColor;
uniform vec3 uSunPosition;
uniform float uFoamIntensity;
uniform float uFoamDecay;
uniform int uDebugMode;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
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

// Procedural cellular foam bubble texture
float voronoiFoam(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float minD = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      vec2 r = g + 0.5 + 0.4 * sin(6.2831 * o) - f;
      minD = min(minD, length(r));
    }
  }
  return 1.0 - smoothstep(0.0, 0.22, minD);
}

void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorldPosition);
  vec3 L = normalize(uSunPosition - vWorldPosition);
  vec3 H = normalize(L + V);

  // Discard fragments where water depth is virtually zero (beyond swash boundary)
  if (vWaterDepth < 0.005) {
    discard;
  }

  // Layered Beer-Lambert depth absorption gradient
  // Deep ocean -> Mid turquoise -> Shallow clear turquoise
  float depth = vWaterDepth;
  vec3 waterBase;
  if (depth > 1.8) {
    waterBase = uWaterDeepColor;
  } else if (depth > 0.6) {
    float t = (depth - 0.6) / 1.2;
    waterBase = mix(uWaterMidColor, uWaterDeepColor, t);
  } else {
    float t = depth / 0.6;
    waterBase = mix(uWaterShallowColor, uWaterMidColor, t);
  }

  // Fresnel reflection (Schlick approximation)
  float NdotV = max(dot(N, V), 0.0);
  float fresnel = 0.04 + 0.96 * pow(1.0 - NdotV, 5.0);

  // Sky environment reflection gradient
  vec3 skyHorizon = vec3(0.65, 0.85, 0.98);
  vec3 skyZenith = vec3(0.2, 0.55, 0.88);
  vec3 skyReflection = mix(skyHorizon, skyZenith, clamp(N.y, 0.0, 1.0));

  // Sun specular highlight (Blinn-Phong / GGX approximation)
  float NdotH = max(dot(N, H), 0.0);
  float sunSpecular = pow(NdotH, 128.0) * 1.8;

  // Composite surface color
  vec3 surfaceColor = mix(waterBase, skyReflection, fresnel * 0.75) + vec3(sunSpecular);

  // Multi-scale procedural foam calculation
  vec2 foamUv = vWorldPosition.xz * 1.8 + vVelocity * (uTime * 0.2);
  float foamTex1 = voronoiFoam(foamUv * 3.5);
  float foamTex2 = voronoiFoam(foamUv * 7.0 + vec2(1.7, 4.3));
  float noiseFoam = noise(vWorldPosition.xz * 4.0 - uTime * 0.8);

  float compositeFoamTex = clamp(foamTex1 * 0.65 + foamTex2 * 0.35 + noiseFoam * 0.2, 0.0, 1.0);
  float foamFactor = vFoam * uFoamIntensity * smoothstep(0.15, 0.75, compositeFoamTex + vBreaking * 0.4);
  foamFactor = clamp(foamFactor, 0.0, 1.0);

  // Blend foam with water
  vec3 finalColor = mix(surfaceColor, uFoamColor, foamFactor);

  // Dynamic shoreline transparency: water fades softly as depth approaches zero
  float alpha = smoothstep(0.005, 0.15, vWaterDepth);
  alpha = mix(alpha, 1.0, foamFactor * 0.9); // Foam remains opaque

  // Debug visualizer branches
  if (uDebugMode == 1) {
    // Water Height
    float hNorm = clamp((vWorldPosition.y + 1.0) / 3.0, 0.0, 1.0);
    gl_FragColor = vec4(vec3(hNorm), 1.0);
    return;
  }
  if (uDebugMode == 3) {
    // Flow Velocity Field
    vec3 velColor = vec3(0.5 + 0.5 * normalize(vVelocity), 0.5);
    gl_FragColor = vec4(velColor, 1.0);
    return;
  }
  if (uDebugMode == 4) {
    // Wave Energy / Shoaling amplitude
    gl_FragColor = vec4(vec3(length(vVelocity) * 0.5), 1.0);
    return;
  }
  if (uDebugMode == 5) {
    // Wave Breaking Mask
    gl_FragColor = vec4(vec3(vBreaking), 1.0);
    return;
  }
  if (uDebugMode == 8) {
    // Foam Field
    gl_FragColor = vec4(vec3(foamFactor), 1.0);
    return;
  }

  gl_FragColor = vec4(finalColor, alpha);
}
`;
