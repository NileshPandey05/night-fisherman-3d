import React, { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { RelativisticLensingRaymarcher } from './RelativisticLensingRaymarcher'
import { GeodesicRayTracers } from './GeodesicRayTracers'
import { CinematicCameraController } from './CinematicCameraController'
import { BloomPass } from '../NightFisherman/BloomPass'

export function BlackHoleScene({
  mass = 1.0,
  rIn = 3.0,
  rOut = 15.5,
  driftSpeed = 0.85,
  rotationSpeed = 1.0,
  dopplerGain = 0.85,
  temperatureScale = 1.15,
  diskTilt = 0.1, // ~84° inclination
  qualityPreset = 'high',
  bloomEnabled = true,
  isPaused = false,
  cameraPreset = 'edge_on',
  raysEnabled = true,
  rayPattern = 'all',
  rayDensity = 'medium',
  rayColorPreset = 'amber',
  raySpeed = 1.0,
  streamlineGlow = 0.16,
  glowIntensity = 2.2,
  shakeEnabled = true,
  shakeIntensity = 0.45,
  galaxyBrightness = 1.0,
  cameraControllerRef = null
}) {
  const controlsRef = useRef()
  const { camera } = useThree()

  // Camera presets matching the cinematic reference
  useEffect(() => {
    if (!controlsRef.current) return

    if (cameraPreset === 'edge_on') {
      // Matches the reference image: nearly edge-on with horizontal foreground disk and huge upper arch
      camera.position.set(0, 0.85, 11.2)
      controlsRef.current.target.set(0, 0, 0)
    } else if (cameraPreset === 'slight_tilt') {
      camera.position.set(0, 2.2, 11.0)
      controlsRef.current.target.set(0, 0, 0)
    } else if (cameraPreset === 'oblique') {
      camera.position.set(0, 6.8, 9.2)
      controlsRef.current.target.set(0, 0, 0)
    } else if (cameraPreset === 'polar') {
      camera.position.set(0, 13.5, 0.01)
      controlsRef.current.target.set(0, 0, 0)
    }
    controlsRef.current.update()
  }, [cameraPreset, camera])

  return (
    <>
      {/* Pure Deep Space Void */}
      <color attach="background" args={['#000000']} />

      {/* Relativistic Null-Geodesic Lensing Raymarcher */}
      <RelativisticLensingRaymarcher
        mass={mass}
        rIn={rIn}
        rOut={rOut}
        driftSpeed={driftSpeed}
        rotationSpeed={rotationSpeed}
        dopplerGain={dopplerGain}
        temperatureScale={temperatureScale}
        diskTilt={diskTilt}
        galaxyBrightness={galaxyBrightness}
        qualityPreset={qualityPreset}
        isPaused={isPaused}
      />

      {/* Relativistic Null-Geodesic Light Ray Tracers & Moving Photon Pulses */}
      <GeodesicRayTracers
        mass={mass}
        enabled={raysEnabled}
        rayPattern={rayPattern}
        density={rayDensity}
        colorPreset={rayColorPreset}
        speed={raySpeed}
        streamlineGlow={streamlineGlow}
        glowIntensity={glowIntensity}
        diskTilt={diskTilt}
        isPaused={isPaused}
      />

      {/* OrbitControls with damping */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={3.5}
        maxDistance={28}
        rotateSpeed={0.7}
      />

      {/* Cinematic Camera Controller: smooth multi-frequency micro-motion & flyby cues */}
      <CinematicCameraController
        ref={cameraControllerRef}
        controlsRef={controlsRef}
        enabled={shakeEnabled}
        intensity={shakeIntensity}
      />

      {/* Half-Resolution Post-Processing Bloom tuned for fiery filaments */}
      {bloomEnabled && (
        <BloomPass
          enabled={true}
          strength={0.55}
          radius={0.65}
          threshold={0.72} // Strict threshold preserves pitch-black event horizon silhouette
        />
      )}
    </>
  )
}
