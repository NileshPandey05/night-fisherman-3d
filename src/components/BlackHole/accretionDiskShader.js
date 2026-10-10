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
    // Orbital velocity unit vector (left side x < 0 approaches the observer at z > 0)
    vec3 vOrbital = vec3(sin(phi), 0.0, -cos(phi));
    // Photon emission direction towards observer is -normalize(rayDir)
    float cosAlpha = dot(vOrbital, -normalize(rayDir));

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

  // Procedural Deep-Sky Galaxy Stars & Cosmic Nebula Background
  // Sampled by escaping null geodesics to render physical gravitational lensing of background stars
  vec3 sampleGalaxyStars(vec3 dir, float time, float galaxyBrightness) {
    if (galaxyBrightness <= 0.001) return vec3(0.0);

    // 1. Cosmic Milky Way / Galactic Band
    // Galactic equator tilted ~28 degrees around X and Z
    vec3 galDir = vec3(
      dir.x * 0.866 - dir.z * 0.5,
      dir.y * 0.92 + dir.z * 0.38,
      dir.x * 0.5 + dir.z * 0.866
    );
    float galLat = abs(galDir.y);
    float galDisk = exp(-galLat * 3.6); // Concentrated in galactic disk

    // Turbulent interstellar dust clouds
    float dust1 = fbmPlasma(galDir.xz * 2.4 + vec2(1.5, 3.2));
    float dust2 = fbmPlasma(galDir.xy * 3.2 + vec2(time * 0.004, 0.0));
    float nebulaDust = galDisk * (0.35 + 0.65 * dust1 * dust2);

    // Cosmic nebula palette: deep midnight blue, galactic violet, celestial teal
    vec3 nebColor = mix(
      vec3(0.015, 0.028, 0.068),
      vec3(0.068, 0.024, 0.098),
      clamp(galDir.x * 0.5 + 0.5, 0.0, 1.0)
    );
    nebColor += vec3(0.018, 0.048, 0.082) * clamp(dust2, 0.0, 1.0);
    vec3 nebulaGlow = nebColor * nebulaDust * 1.7;

    // 2. High-Density Multi-Magnitude Starfield
    vec3 stars = vec3(0.0);

    // Layer 1: Bright Primary Guide Stars (intense, colorful: blue-white, gold, red giant)
    vec3 p1 = dir * 140.0;
    vec3 ip1 = floor(p1);
    vec3 fp1 = fract(p1);
    float h1 = hash1(ip1.xy + ip1.z * 71.3);
    if (h1 > 0.988) {
      float d1 = length(fp1 - 0.5);
      float starCore = smoothstep(0.18, 0.01, d1);
      vec3 starColor = mix(
        vec3(0.72, 0.88, 1.0),
        mix(vec3(1.0, 0.94, 0.72), vec3(1.0, 0.52, 0.32), fract(h1 * 93.1)),
        fract(h1 * 47.7)
      );
      stars += starCore * starColor * (h1 - 0.988) * 95.0;
    }

    // Layer 2: Medium Field Stars
    vec3 p2 = dir * 280.0;
    vec3 ip2 = floor(p2);
    vec3 fp2 = fract(p2);
    float h2 = hash1(ip2.xy + ip2.z * 113.7);
    if (h2 > 0.978) {
      float d2 = length(fp2 - 0.5);
      float starCore = smoothstep(0.22, 0.02, d2);
      vec3 starColor = mix(vec3(0.85, 0.92, 1.0), vec3(1.0, 0.88, 0.68), fract(h2 * 31.9));
      stars += starCore * starColor * (h2 - 0.978) * 42.0;
    }

    // Layer 3: Faint Cosmic Stellar Dust
    vec3 p3 = dir * 520.0;
    vec3 ip3 = floor(p3);
    vec3 fp3 = fract(p3);
    float h3 = hash1(ip3.xy + ip3.z * 227.1);
    if (h3 > 0.965) {
      float d3 = length(fp3 - 0.5);
      float starCore = smoothstep(0.28, 0.05, d3);
      stars += starCore * vec3(0.88, 0.94, 1.0) * (h3 - 0.965) * 15.0;
    }

    stars *= (0.5 + 1.1 * galDisk);

    return (nebulaGlow + stars) * galaxyBrightness;
  }
`;
