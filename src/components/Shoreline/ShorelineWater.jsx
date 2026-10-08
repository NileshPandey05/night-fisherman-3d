import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { WaterMaterial } from './materials/WaterMaterial'

export function ShorelineWater({
  slope = 0.18,
  waveHeight = 0.65,
  waveSpeed = 0.85,
  breakingThreshold = 0.68,
  swashRunup = 1.2,
  foamIntensity = 1.2,
  foamDecay = 0.4,
  waterDeepColor = '#0B5263',
  waterMidColor = '#087F8C',
  waterShallowColor = '#19A9A0',
  foamColor = '#DDFBFA',
  debugMode = 0,
  planeSize = [30, 30],
  resolution = 180,
  ...meshProps
}) {
  const materialRef = useRef()

  const [material] = useState(() => {
    return new WaterMaterial({
      slope,
      waveHeight,
      waveSpeed,
      breakingThreshold,
      swashRunup,
      foamIntensity,
      foamDecay,
      waterDeepColor,
      waterMidColor,
      waterShallowColor,
      foamColor,
      debugMode,
    })
  })

  useEffect(() => {
    if (!materialRef.current) return
    const mat = materialRef.current
    mat.slope = slope
    mat.waveHeight = waveHeight
    mat.waveSpeed = waveSpeed
    mat.breakingThreshold = breakingThreshold
    mat.swashRunup = swashRunup
    mat.foamIntensity = foamIntensity
    mat.foamDecay = foamDecay
    mat.waterDeepColor = waterDeepColor
    mat.waterMidColor = waterMidColor
    mat.waterShallowColor = waterShallowColor
    mat.foamColor = foamColor
    mat.debugMode = debugMode
  }, [
    slope, waveHeight, waveSpeed, breakingThreshold, swashRunup,
    foamIntensity, foamDecay, waterDeepColor, waterMidColor,
    waterShallowColor, foamColor, debugMode
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
    <mesh rotation={[-Math.PI / 2, 0, 0]} {...meshProps}>
      <planeGeometry args={[planeSize[0], planeSize[1], resolution, resolution]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  )
}
