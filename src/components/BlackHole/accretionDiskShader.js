// accretionDiskShader.js
// Physical emission, Novikov-Thorne temperature profile, and turbulent Keplerian filament GLSL functions

export const accretionDiskGLSL = `
  #define PI 3.14159265359

  // Simplex / hash noise helpers for procedural plasma filaments
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return fract(sin(p) * 43758.5453123);
  }

  float hash1(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // 2D Value Noise with smooth hermite interpolation
  float vNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    return mix(
      mix(hash1(i + vec2(0.0, 0.0)), hash1(i + vec2(1.0, 0.0)), u.x),
      mix(hash1(i + vec2(0.0, 1.0)), hash1(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  // Multi-octave domain-warped fractional Brownian motion for plasma filaments
  float fbmPlasma(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));

    for (int i = 0; i < 4; ++i) {
      v += a * vNoise(p);
      p = rot * p * 2.15 + shift;
      a *= 0.5;
    }
    return v;
  }

  // Thermal blackbody color ramp matching the reference image
  // Maps normalized temperature [0, 1] to incandescent fire colors
  vec3 blackbodyPalette(float temp) {
    // 0.0 = deep crimson void extinction
    // 0.25 = glowing dark amber
    // 0.55 = vibrant fiery orange
    // 0.80 = radiant gold
    // 1.00 = white-hot core
    vec3 c0 = vec3(0.08, 0.01, 0.005);  // Deep burnt extinction
    vec3 c1 = vec3(0.85, 0.12, 0.02);   // Deep ruby / crimson
    vec3 c2 = vec3(1.0, 0.42, 0.04);    // Incandescent fiery orange
    vec3 c3 = vec3(1.0, 0.78, 0.22);    // Radiant gold
    vec3 c4 = vec3(1.0, 0.96, 0.85);    // White-hot core

    if (temp < 0.2) {
      return mix(c0, c1, temp / 0.2);
    } else if (temp < 0.5) {
      return mix(c1, c2, (temp - 0.2) / 0.3);
    } else if (temp < 0.8) {
      return mix(c2, c3, (temp - 0.5) / 0.3);
    } else {
      return mix(c3, c4, (temp - 0.8) / 0.2);
    }
  }

  // Physical accretion disk emissivity function E(r, phi, t)
  // Evaluates emission and opacity when a light ray pierces the equatorial plane z = 0
  vec4 sampleAccretionDisk(
    vec3 pos,
    vec3 rayDir,
    float rs,
    float rIn,
    float rOut,
    float time,
    float rotationSpeed,
    float dopplerGain,
    float temperatureScale
  ) {
    float r = length(pos.xz);
    if (r < rIn || r > rOut) {
      return vec4(0.0);
    }

    // 1. Relativistic Keplerian angular frequency Omega(r) = sqrt(GM / r^3) ∝ r^-1.5
    float omega = sqrt(rs * 0.5 / max(pow(r, 3.0), 0.01)) * 3.2 * rotationSpeed;
    float phi = atan(pos.z, pos.x);

    // Coordinate angle advected by differential Keplerian rotation
    float advectedPhi = phi - omega * time;

    // 2. Shakura-Sunyaev / Novikov-Thorne Temperature Profile
    // T(r) ∝ r^(-3/4) * (1 - sqrt(rIn / r))^(1/4)
    float rNorm = rIn / r;
    float zeroTorqueTerm = pow(max(0.001, 1.0 - sqrt(rNorm)), 0.25);
    float tempProfile = pow(rNorm, 0.75) * zeroTorqueTerm * 3.0 * temperatureScale;
    float baseTemp = clamp(tempProfile, 0.0, 1.0);

    // 3. Fine Turbulent Filamentary Plasma Structure
    // Polar coordinates mapped into stretched logarithmic spiral bands
    float logR = log(r / rIn + 0.1) * 8.0;
    vec2 uvPlasma = vec2(logR * 1.5, advectedPhi * 2.8);
    float filaments = fbmPlasma(uvPlasma + fbmPlasma(uvPlasma * 1.8));

    // Secondary fine azimuthal streaks (concentric nested bands)
    float fineBands = sin(logR * 14.0 + advectedPhi * 1.5) * 0.5 + 0.5;
    fineBands = pow(fineBands, 2.5);

    // Combine base temperature with turbulent filaments
    float modulation = 0.65 + 0.55 * filaments + 0.35 * fineBands;
    float effectiveTemp = clamp(baseTemp * modulation, 0.0, 1.0);

    // 4. Relativistic Doppler Beaming
    // Orbital velocity unit vector: v = (-sin(phi), 0, cos(phi))
    vec3 vOrbital = vec3(-sin(phi), 0.0, cos(phi));
    // Line-of-sight velocity projection against incoming light ray
    float cosAlpha = dot(vOrbital, normalize(rayDir));

    // Relativistic velocity beta = v/c ≈ sqrt(Rs / (2r))
    float beta = clamp(sqrt(rs / (2.0 * max(r, rs))), 0.0, 0.68);
    float gamma = 1.0 / sqrt(max(0.01, 1.0 - beta * beta));
    // Doppler shift factor delta = 1 / (gamma * (1 - beta * cosAlpha))
    float deltaDoppler = 1.0 / (gamma * (1.0 - beta * cosAlpha));
    float dopplerBoost = pow(clamp(deltaDoppler, 0.3, 3.5), 3.2);

    // 5. Gravitational Redshift factor: g = sqrt(1 - Rs / r)
    float gravRedshift = clamp(sqrt(max(0.01, 1.0 - rs / r)), 0.1, 1.0);

    // Apply Doppler and redshift to color and emission
    float finalTemp = clamp(effectiveTemp * gravRedshift, 0.0, 1.0);
    vec3 color = blackbodyPalette(finalTemp);

    // Apply relativistic brightness beaming
    float beamingFactor = mix(1.0, dopplerBoost, dopplerGain);
    color *= beamingFactor * 2.4;

    // Smooth boundary fade at inner ISCO edge and outer disk rim
    float innerFade = smoothstep(rIn, rIn + 0.25, r);
    float outerFade = smoothstep(rOut, rOut - 1.8, r);
    float opacity = innerFade * outerFade * clamp(modulation * 0.95, 0.05, 1.0);

    return vec4(color, opacity);
  }
`
