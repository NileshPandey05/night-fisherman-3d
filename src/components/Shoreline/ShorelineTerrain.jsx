import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { SandMaterial } from './materials/SandMaterial'

export function ShorelineTerrain({
  slope = 0.18,
  waveHeight = 0.65,
  waveSpeed = 0.85,
  swashRunup = 1.2,
  erosionRate = 0.05,
  depositionRate = 0.05,
  causticIntensity = 1.8,
  causticScale = 4.5,
  causticSpeed = 0.6,
  sandDryColor = '#D8B27A',
  sandMidColor = '#C69A62',
  sandWetColor = '#92704B',
  sandDeepWetColor = '#70563E',
  causticColor = '#BFFAFF',
  debugMode = 0,
  planeSize = [30, 30],
  resolution = 180,
  ...meshProps
}) {
  const materialRef = useRef()

  const [material] = useState(() => {
    return new SandMaterial({
      slope,
      waveHeight,
      waveSpeed,
      swashRunup,
      erosionRate,
      depositionRate,
      causticIntensity,
      causticScale,
      causticSpeed,
      sandDryColor,
      sandMidColor,
      sandWetColor,
      sandDeepWetColor,
      causticColor,
      debugMode,
    })
  })

  useEffect(() => {
    if (!materialRef.current) return
    const mat = materialRef.current
    mat.slope = slope
    mat.waveHeight = waveHeight
    mat.waveSpeed = waveSpeed
    mat.swashRunup = swashRunup
    mat.erosionRate = erosionRate
    mat.depositionRate = depositionRate
    mat.causticIntensity = causticIntensity
    mat.causticScale = causticScale
    mat.causticSpeed = causticSpeed
    mat.sandDryColor = sandDryColor
    mat.sandMidColor = sandMidColor
    mat.sandWetColor = sandWetColor
    mat.sandDeepWetColor = sandDeepWetColor
    mat.causticColor = causticColor
    mat.debugMode = debugMode
  }, [
    slope, waveHeight, waveSpeed, swashRunup, erosionRate, depositionRate,
    causticIntensity, causticScale, causticSpeed, sandDryColor, sandMidColor,
    sandWetColor, sandDeepWetColor, causticColor, debugMode
  ])

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.time = clock.getElapsedTime()
    }
  })

  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow {...meshProps}>
      <planeGeometry args={[planeSize[0], planeSize[1], resolution, resolution]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  )
}
