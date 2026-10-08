import { useEffect, useMemo } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

export function BloomPass({ enabled = true, strength = 0.32, radius = 0.5, threshold = 0.72 }) {
  const { gl, scene, camera, size } = useThree()

  const composer = useMemo(() => {
    const comp = new EffectComposer(gl)
    const renderPass = new RenderPass(scene, camera)
    comp.addPass(renderPass)

    // Render bloom at half resolution for 75% fill-rate savings (standard AAA technique)
    const bloomRes = new THREE.Vector2(
      Math.max(256, Math.floor(size.width * 0.5)),
      Math.max(256, Math.floor(size.height * 0.5))
    )
    const bloomPass = new UnrealBloomPass(
      bloomRes,
      strength,
      radius,
      threshold
    )
    comp.addPass(bloomPass)

    const outputPass = new OutputPass()
    comp.addPass(outputPass)

    return { comp, bloomPass }
  }, [gl, scene, camera, size.width, size.height, strength, radius, threshold])

  useEffect(() => {
    composer.bloomPass.strength = strength
    composer.bloomPass.radius = radius
    composer.bloomPass.threshold = threshold
  }, [composer, strength, radius, threshold])

  useEffect(() => {
    composer.comp.setSize(size.width, size.height)
  }, [composer, size])

  useFrame(() => {
    if (enabled) {
      gl.autoClear = false
      gl.clear()
      composer.comp.render()
    }
  }, 1)

  return null
}
