import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * CinematicCameraController
 * 
 * Provides smooth, multi-frequency continuous micro-motion and triggerable
 * impulse cues (e.g. proximity flyby, thruster fire, accretion flare).
 * 
 * Uses a delta-subtraction pattern so that Drei's OrbitControls never
 * accumulates positional or rotational drift.
 */
export const CinematicCameraController = forwardRef(function CinematicCameraController({
  controlsRef,
  enabled = true,
  intensity = 0.5,
  frequency = 1.0,
  maxDisplacement = 0.25
}, ref) {
  const { camera } = useThree()
  const timeRef = useRef(0)

  // Track previous frame offsets to cancel before OrbitControls updates
  const prevPosOffset = useRef(new THREE.Vector3(0, 0, 0))
  const prevRotOffset = useRef(new THREE.Euler(0, 0, 0))

  // Dynamic impulse event state
  const impulseState = useRef({
    active: false,
    startTime: 0,
    duration: 2.2,
    amplitude: 0.25,
    decay: 2.0,
    freq: 4.5,
    heading: new THREE.Vector3(0, 1, 0)
  })

  // Imperative handle to trigger cinematic events from HUD or user interactions
  useImperativeHandle(ref, () => ({
    triggerFlyby: (options = {}) => {
      impulseState.current = {
        active: true,
        startTime: timeRef.current,
        duration: options.duration || 2.4,
        amplitude: (options.amplitude || 0.35) * intensity,
        decay: options.decay || 1.8,
        freq: options.freq || 4.2,
        heading: options.heading || new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.5 + 0.5,
          (Math.random() - 0.5) * 0.6
        ).normalize()
      }
    }
  }))

  useFrame((_, delta) => {
    // 1. Remove previous frame's offset before OrbitControls runs
    if (prevPosOffset.current.lengthSq() > 0) {
      camera.position.sub(prevPosOffset.current)
      camera.rotation.x -= prevRotOffset.current.x
      camera.rotation.y -= prevRotOffset.current.y
      camera.rotation.z -= prevRotOffset.current.z
      prevPosOffset.current.set(0, 0, 0)
      prevRotOffset.current.set(0, 0, 0)
    }

    // 2. Allow OrbitControls to perform its standard damped update
    if (controlsRef && controlsRef.current) {
      controlsRef.current.update()
    }

    if (!enabled || intensity <= 0.001) return

    // 3. Advance time deterministically (delta-time independent)
    const dt = Math.min(delta, 0.1)
    timeRef.current += dt * frequency
    const t = timeRef.current

    // 4. Smooth multi-frequency harmonic continuous idle motion
    // Uses 3 incommensurate irrational frequencies to avoid repetitive loops
    const f1 = 0.85
    const f2 = 1.93
    const f3 = 3.41

    const baseAmp = 0.035 * intensity

    // Positional multi-octave synthesis
    const nx = 0.55 * Math.sin(f1 * 2 * Math.PI * t) +
               0.30 * Math.sin(f2 * 2 * Math.PI * t + 1.25) +
               0.15 * Math.sin(f3 * 2 * Math.PI * t + 2.71)

    const ny = 0.50 * Math.cos(f1 * 2 * Math.PI * t * 0.92) +
               0.35 * Math.cos(f2 * 2 * Math.PI * t * 1.12 + 0.82) +
               0.15 * Math.cos(f3 * 2 * Math.PI * t * 1.34 + 1.94)

    const nz = 0.45 * Math.sin(f1 * 2 * Math.PI * t * 1.15 + 0.55) +
               0.35 * Math.sin(f2 * 2 * Math.PI * t * 0.88 + 2.15) +
               0.20 * Math.cos(f3 * 2 * Math.PI * t + 0.42)

    let posX = nx * baseAmp
    let posY = ny * baseAmp
    let posZ = nz * baseAmp

    // Rotational micro-perturbations (pitch, yaw, roll)
    const rotAmp = 0.004 * intensity
    let rotX = (0.6 * Math.sin(f1 * 2 * Math.PI * t * 1.1) + 0.4 * Math.cos(f2 * 2 * Math.PI * t)) * rotAmp
    let rotY = (0.55 * Math.cos(f1 * 2 * Math.PI * t * 0.95) + 0.45 * Math.sin(f2 * 2 * Math.PI * t * 1.2)) * rotAmp
    let rotZ = (0.5 * Math.sin(f1 * 2 * Math.PI * t * 1.3 + 0.7)) * rotAmp

    // 5. Evaluate dynamic impulse envelope if active (e.g. proximity flyby cue)
    const imp = impulseState.current
    if (imp.active) {
      const elapsedImp = timeRef.current - imp.startTime
      if (elapsedImp >= imp.duration) {
        imp.active = false
      } else {
        // Exponentially decaying sinusoidal impulse envelope: A * exp(-γ * t) * sin(ω * t)
        const envelope = Math.exp(-imp.decay * elapsedImp)
        const wave = Math.sin(imp.freq * 2 * Math.PI * elapsedImp)
        const impulseMag = imp.amplitude * envelope * wave

        posX += imp.heading.x * impulseMag
        posY += imp.heading.y * impulseMag
        posZ += imp.heading.z * impulseMag

        const impRotFactor = 0.02 * envelope
        rotX += Math.sin(imp.freq * 2.5 * Math.PI * elapsedImp) * impRotFactor
        rotZ += Math.cos(imp.freq * 2.1 * Math.PI * elapsedImp) * impRotFactor
      }
    }

    // 6. Enforce strict maximum displacement bounds
    const maxD = Math.max(0.01, maxDisplacement)
    posX = THREE.MathUtils.clamp(posX, -maxD, maxD)
    posY = THREE.MathUtils.clamp(posY, -maxD, maxD)
    posZ = THREE.MathUtils.clamp(posZ, -maxD, maxD)

    // 7. Apply to camera and store for next frame cancellation
    prevPosOffset.current.set(posX, posY, posZ)
    prevRotOffset.current.set(rotX, rotY, rotZ)

    camera.position.add(prevPosOffset.current)
    camera.rotation.x += rotX
    camera.rotation.y += rotY
    camera.rotation.z += rotZ
  })

  // Cleanup on unmount or disable
  useEffect(() => {
    return () => {
      if (prevPosOffset.current.lengthSq() > 0) {
        camera.position.sub(prevPosOffset.current)
        camera.rotation.x -= prevRotOffset.current.x
        camera.rotation.y -= prevRotOffset.current.y
        camera.rotation.z -= prevRotOffset.current.z
        prevPosOffset.current.set(0, 0, 0)
        prevRotOffset.current.set(0, 0, 0)
      }
    }
  }, [camera])

  return null
})
