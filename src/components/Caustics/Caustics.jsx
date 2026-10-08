import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { CausticsMaterial } from './CausticsMaterial'

/**
 * Procedural Caustics Component for React Three Fiber
 *
 * @param {Object} props
 * @param {number} [props.scale=5.0] Frequency of the caustic patterns
 * @param {number} [props.speed=0.6] Animation velocity of fluid wave deformation
 * @param {number} [props.intensity=2.0] Brightness multiplier for concentrated light rays
 * @param {number} [props.distortion=0.4] Amplitude of the continuous domain warping
 * @param {number} [props.edgeWidth=0.09] Width threshold of caustic light ridges
 * @param {number} [props.sharpness=3.0] Exponential focusing power of light lines
 * @param {number} [props.glow=0.35] Soft optical scattering illumination
 * @param {number} [props.dispersion=0.012] Chromatic dispersion RGB split
 * @param {string|THREE.Color} [props.color='#8DEBFF'] Caustic highlight color
 * @param {string|THREE.Color} [props.baseColor='#06263F'] Deep water base color
 * @param {number} [props.debugMode=0] 0: Beauty, 1: F1, 2: F2-F1, 3: Warp, 4: Edge, 5: Composite
 * @param {Array<number>} [props.planeSize=[20, 20]] Geometry size for the mesh [width, height]
 */
export function Caustics({
  scale = 5.0,
  speed = 0.6,
  intensity = 2.0,
  distortion = 0.4,
  edgeWidth = 0.09,
  sharpness = 3.0,
  glow = 0.35,
  dispersion = 0.012,
  color = '#8DEBFF',
  baseColor = '#06263F',
  debugMode = 0,
  planeSize = [20, 20],
  ...meshProps
}) {
  const materialRef = useRef()

  // Stable material instance (uniforms updated in useEffect to avoid recompiling shader program)
  const [material] = useState(() => {
    return new CausticsMaterial({
      scale,
      speed,
      intensity,
      distortion,
      edgeWidth,
      sharpness,
      glow,
      dispersion,
      color,
      baseColor,
      debugMode,
    })
  })

  // Synchronize uniforms when props update
  useEffect(() => {
    if (!materialRef.current) return
    const mat = materialRef.current
    mat.scale = scale
    mat.speed = speed
    mat.intensity = intensity
    mat.distortion = distortion
    mat.edgeWidth = edgeWidth
    mat.sharpness = sharpness
    mat.glow = glow
    mat.dispersion = dispersion
    mat.color = color
    mat.baseColor = baseColor
    mat.debugMode = debugMode
  }, [scale, speed, intensity, distortion, edgeWidth, sharpness, glow, dispersion, color, baseColor, debugMode])

  // Continuous real-time animation
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.time = clock.getElapsedTime()
    }
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      material.dispose()
    }
  }, [material])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} {...meshProps}>
      <planeGeometry args={planeSize} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  )
}

export { CausticsMaterial }
export default Caustics
