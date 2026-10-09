import React, { useRef, useEffect } from 'react'
import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { EventHorizon } from './EventHorizon'
import { PhotonRing } from './PhotonRing'
import { AccretionDiskParticles } from './AccretionDiskParticles'
import { GravitationalLensingBackdrop } from './GravitationalLensingBackdrop'
import { RelativisticJets } from './RelativisticJets'
import { BloomPass } from '../NightFisherman/BloomPass'

export function BlackHoleScene({
  mass = 1.0,
  particleCount = 50000,
  driftSpeed = 0.85,
  diskTilt = 0.32,
  dopplerStrength = 1.0,
  photonRingEnabled = true,
  photonRingIntensity = 2.4,
  lensingEnabled = true,
  lensingStrength = 1.0,
  jetsEnabled = true,
  bloomEnabled = true,
  cameraPreset = 'cinematic'
}) {
  const controlsRef = useRef()
  const { camera } = useThree()

  // Camera presets
  useEffect(() => {
    if (!controlsRef.current) return

    if (cameraPreset === 'cinematic') {
      camera.position.set(0, 4.2, 11.5)
      controlsRef.current.target.set(0, 0, 0)
    } else if (cameraPreset === 'edge_on') {
      camera.position.set(0, 0.4, 13.5)
      controlsRef.current.target.set(0, 0, 0)
    } else if (cameraPreset === 'polar') {
      camera.position.set(0, 14.5, 0.01)
      controlsRef.current.target.set(0, 0, 0)
    } else if (cameraPreset === 'horizon_closeup') {
      camera.position.set(0, 1.8, 5.2)
      controlsRef.current.target.set(0, 0, 0)
    }
    controlsRef.current.update()
  }, [cameraPreset, camera])

  return (
    <>
      <color attach="background" args={['#010308']} />

      {/* Relativistic Gravitational Lensing & Background Starfield */}
      <GravitationalLensingBackdrop
        mass={mass}
        lensingStrength={lensingStrength}
        diskTilt={diskTilt}
        enabled={lensingEnabled}
      />

      {/* Central Black Hole Event Horizon */}
      <EventHorizon mass={mass} />

      {/* Razor-Sharp Relativistic Photon Ring */}
      <PhotonRing
        mass={mass}
        intensity={photonRingIntensity}
        dopplerIntensity={dopplerStrength}
        enabled={photonRingEnabled}
      />

      {/* 50,000 - 100,000 GPU-Accelerated Accretion Disk Particles */}
      <AccretionDiskParticles
        particleCount={particleCount}
        mass={mass}
        driftSpeed={driftSpeed}
        diskTilt={diskTilt}
        dopplerStrength={dopplerStrength}
      />

      {/* Relativistic Polar Jets */}
      <RelativisticJets enabled={jetsEnabled} />

      {/* Smooth OrbitControls */}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={2.5}
        maxDistance={35}
        rotateSpeed={0.8}
      />

      {/* Half-Resolution UnrealBloomPass Post-Processing */}
      {bloomEnabled && (
        <BloomPass
          enabled={true}
          strength={0.45}
          radius={0.65}
          threshold={0.62}
        />
      )}
    </>
  )
}
