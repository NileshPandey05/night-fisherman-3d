import React, { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { accretionDiskGLSL } from "./accretionDiskShader";

const raymarchVertexShader = `
  uniform mat4 uProjectionMatrixInverse;
  uniform mat4 uCameraWorldMatrix;

  varying vec2 vUv;
  varying vec3 vRayDir;
  varying vec3 vCameraPos;

  void main() {
    vUv = uv;
    vCameraPos = cameraPosition;

    // Unproject quad clip-space coords [-1, 1] to world-space ray direction
    vec4 clipPos = vec4(position.xy, 1.0, 1.0);
    vec4 viewPos = uProjectionMatrixInverse * clipPos;
    vec3 worldRay = (uCameraWorldMatrix * vec4(viewPos.xyz, 0.0)).xyz;
    vRayDir = normalize(worldRay);

    gl_Position = vec4(position.xy, 0.9999, 1.0);
  }
`;

const raymarchFragmentShader = `
  precision highp float;

  uniform float uTime;
  uniform float uMass;
  uniform float uRIn;
  uniform float uROut;
  uniform float uDriftSpeed;
  uniform float uRotationSpeed;
  uniform float uDopplerGain;
  uniform float uTemperatureScale;
  uniform float uDiskTilt;
  uniform float uGalaxyBrightness;
  uniform int uMaxSteps;
  uniform vec3 uCameraPos;

  varying vec2 vUv;
  varying vec3 vRayDir;
  varying vec3 vCameraPos;

  // Insert modular accretion disk emission & blackbody functions
  ${accretionDiskGLSL}

  void main() {
    float rs = 1.0 * uMass;
    float rIn = uRIn * rs;       // ISCO = 3.0 * Rs
    float rOut = uROut * rs;     // Outer disk rim ≈ 16.0 * Rs
    float rHorizon = 1.01 * rs;  // Event horizon boundary
    float rMaxBound = rOut * 1.5;

    // Camera ray origin and direction
    vec3 rayPos = vCameraPos;
    vec3 rayDir = normalize(vRayDir);

    // Initial conserved angular momentum vector L = x × v
    vec3 Lvec = cross(rayPos, rayDir);
    float L2 = dot(Lvec, Lvec);

    // If ray starts far away and doesn't point towards the black hole, early exit
    float b = sqrt(L2); // Impact parameter
    float bCrit = 2.598076 * rs; // sqrt(27)/2 * Rs critical shadow radius

    // Rotation matrix for disk tilt around X-axis
    float cosTilt = cos(uDiskTilt);
    float sinTilt = sin(uDiskTilt);
    mat3 tiltRot = mat3(
      1.0, 0.0, 0.0,
      0.0, cosTilt, -sinTilt,
      0.0, sinTilt, cosTilt
    );
    mat3 invTiltRot = mat3(
      1.0, 0.0, 0.0,
      0.0, cosTilt, sinTilt,
      0.0, -sinTilt, cosTilt
    );

    // Radiance accumulation
    vec3 accumColor = vec3(0.0);
    float accumOpacity = 0.0;
    bool hitHorizon = false;

    // Bounding sphere acceleration: advance ray to outer bounding sphere if outside
    float rCam = length(rayPos);
    if (rCam > rMaxBound) {
      float bSph = dot(rayPos, rayDir);
      float cSph = rCam * rCam - rMaxBound * rMaxBound;
      float dSph = bSph * bSph - cSph;
      if (dSph < 0.0 || bSph > 0.0) {
        // Misses bounding sphere entirely: sample undeflected galaxy starfield
        vec3 bgStars = sampleGalaxyStars(rayDir, uTime, uGalaxyBrightness);
        vec3 mappedBg = (bgStars * (2.51 * bgStars + 0.03)) / (bgStars * (2.43 * bgStars + 0.59) + 0.14);
        gl_FragColor = vec4(clamp(mappedBg, 0.0, 1.0), 1.0);
        return;
      }
      float tEnter = -bSph - sqrt(dSph);
      if (tEnter > 0.0) {
        rayPos = rayPos + rayDir * tEnter;
      }
    }

    vec3 pCurr = rayPos;
    vec3 vCurr = rayDir;

    // Previous disk-space position for plane-crossing detection
    vec3 pDiskPrev = invTiltRot * pCurr;

    // Null Geodesic Raymarching Loop
    for (int step = 0; step < 80; step++) {
      if (step >= uMaxSteps) break;

      float r = length(pCurr);

      // Event Horizon Capture: ray falls into the black hole
      if (r <= rHorizon) {
        hitHorizon = true;
        break;
      }

      // Ray escapes beyond gravitational boundary and moving away
      if (r > rMaxBound && dot(pCurr, vCurr) > 0.0) {
        break;
      }

      // Adaptive step size: ultra-fine near photon sphere (1.5 - 3.0 Rs), larger far out
      float stepSize = clamp(0.12 * (r - rs * 0.95), 0.028, 0.42);

      // Schwarzschild Null Geodesic Acceleration: a = -1.5 * Rs * x * L^2 / r^5
      vec3 aCurr = -1.5 * rs * pCurr * (L2 / max(pow(r, 5.0), 0.001));

      // Velocity-Verlet step
      vec3 pNext = pCurr + vCurr * stepSize + 0.5 * aCurr * (stepSize * stepSize);
      float rNext = length(pNext);
      vec3 aNext = -1.5 * rs * pNext * (L2 / max(pow(rNext, 5.0), 0.001));
      vec3 vNext = vCurr + 0.5 * (aCurr + aNext) * stepSize;

      // Transform into tilted accretion disk frame
      vec3 pDiskNext = invTiltRot * pNext;

      // Check for Equatorial Plane Crossing (y changes sign across disk plane)
      if (pDiskPrev.y * pDiskNext.y <= 0.0 && abs(pDiskNext.y - pDiskPrev.y) > 0.0001) {
        // Linear interpolation to exact plane crossing (y = 0)
        float tFrac = -pDiskPrev.y / (pDiskNext.y - pDiskPrev.y);
        vec3 pCross = mix(pDiskPrev, pDiskNext, clamp(tFrac, 0.0, 1.0));
        vec3 vCross = mix(vCurr, vNext, tFrac);
        vec3 vDiskCross = invTiltRot * vCross;

        // Sample continuous physical disk emission field
        vec4 emission = sampleAccretionDisk(
          pCross,
          vDiskCross,
          rs,
          rIn,
          rOut,
          uTime,
          uRotationSpeed,
          uDopplerGain,
          uTemperatureScale
        );

        if (emission.a > 0.001) {
          // Front-to-back alpha blending
          accumColor += emission.rgb * emission.a * (1.0 - accumOpacity);
          accumOpacity += emission.a * (1.0 - accumOpacity);

          if (accumOpacity >= 0.98) {
            break;
          }
        }
      }

      // Advance to next step
      pCurr = pNext;
      vCurr = vNext;
      pDiskPrev = pDiskNext;
    }

    // If ray hit the event horizon without intersecting an opaque foreground emission,
    // the remaining radiance is 0 (pure pitch-black shadow silhouette)
    if (hitHorizon) {
      accumColor *= accumOpacity;
    } else {
      // Ray escaped to infinity!
      // Sample procedural deep space galaxy stars along the physically deflected ray direction
      vec3 lensedDir = normalize(vCurr);
      vec3 galaxyStars = sampleGalaxyStars(lensedDir, uTime, uGalaxyBrightness);
      accumColor += galaxyStars * (1.0 - accumOpacity);
    }

    // Tonemapping & contrast enhancement matching the fiery reference image
    // ACES-style gentle curve
    vec3 x = accumColor;
    vec3 mapped = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14);
    mapped = clamp(mapped, 0.0, 1.0);

    // Deep black background: if hit horizon, pure black absorber; if escaped, fully opaque
    float finalAlpha = 1.0;

    gl_FragColor = vec4(mapped, finalAlpha);
  }
`;

export function RelativisticLensingRaymarcher({
  mass = 1.0,
  rIn = 3.0,
  rOut = 15.5,
  driftSpeed = 0.85,
  rotationSpeed = 1.0,
  dopplerGain = 1.0,
  temperatureScale = 1.15,
  diskTilt = 0.12, // ~83° nearly edge-on default inclination
  galaxyBrightness = 1.0,
  qualityPreset = "high",
  isPaused = false,
}) {
  const meshRef = useRef();
  const timeRef = useRef(0);
  const { camera } = useThree();

  // Step budget based on quality preset
  const maxSteps = useMemo(() => {
    if (qualityPreset === "ultra") return 72;
    if (qualityPreset === "high") return 56;
    if (qualityPreset === "medium") return 38;
    return 26; // low
  }, [qualityPreset]);

  const uniforms = useMemo(
    () => ({
      uProjectionMatrixInverse: { value: new THREE.Matrix4() },
      uCameraWorldMatrix: { value: new THREE.Matrix4() },
      uTime: { value: 0 },
      uMass: { value: mass },
      uRIn: { value: rIn },
      uROut: { value: rOut },
      uDriftSpeed: { value: driftSpeed },
      uRotationSpeed: { value: rotationSpeed },
      uDopplerGain: { value: dopplerGain },
      uTemperatureScale: { value: temperatureScale },
      uDiskTilt: { value: diskTilt },
      uGalaxyBrightness: { value: galaxyBrightness },
      uMaxSteps: { value: maxSteps },
      uCameraPos: { value: new THREE.Vector3() },
    }),
    [
      mass,
      rIn,
      rOut,
      driftSpeed,
      rotationSpeed,
      dopplerGain,
      temperatureScale,
      diskTilt,
      galaxyBrightness,
      maxSteps,
    ],
  );

  useFrame((_, delta) => {
    if (meshRef.current) {
      if (!isPaused) {
        timeRef.current += delta;
      }
      uniforms.uProjectionMatrixInverse.value.copy(
        camera.projectionMatrixInverse,
      );
      uniforms.uCameraWorldMatrix.value.copy(camera.matrixWorld);
      uniforms.uTime.value = timeRef.current;
      uniforms.uMass.value = mass;
      uniforms.uRIn.value = rIn;
      uniforms.uROut.value = rOut;
      uniforms.uDriftSpeed.value = driftSpeed;
      uniforms.uRotationSpeed.value = rotationSpeed;
      uniforms.uDopplerGain.value = dopplerGain;
      uniforms.uTemperatureScale.value = temperatureScale;
      uniforms.uDiskTilt.value = diskTilt;
      uniforms.uGalaxyBrightness.value = galaxyBrightness;
      uniforms.uMaxSteps.value = maxSteps;
      uniforms.uCameraPos.value.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      {/* Fullscreen camera-aligned quad */}
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={raymarchVertexShader}
        fragmentShader={raymarchFragmentShader}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}
