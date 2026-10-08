import * as THREE from 'three'
import { sandVertexShader, sandFragmentShader } from '../shaders/shorelineShaders'

export class SandMaterial extends THREE.ShaderMaterial {
  constructor(parameters = {}) {
    const uniforms = {
      uTime: { value: 0.0 },
      uSlope: { value: parameters.slope ?? 0.18 },
      uWaveHeight: { value: parameters.waveHeight ?? 0.65 },
      uWaveSpeed: { value: parameters.waveSpeed ?? 0.85 },
      uSwashRunup: { value: parameters.swashRunup ?? 1.2 },
      uErosionRate: { value: parameters.erosionRate ?? 0.05 },
      uDepositionRate: { value: parameters.depositionRate ?? 0.05 },
      uCausticIntensity: { value: parameters.causticIntensity ?? 1.8 },
      uCausticScale: { value: parameters.causticScale ?? 4.5 },
      uCausticSpeed: { value: parameters.causticSpeed ?? 0.6 },
      uSandDryColor: { value: new THREE.Color(parameters.sandDryColor ?? '#D8B27A') },
      uSandMidColor: { value: new THREE.Color(parameters.sandMidColor ?? '#C69A62') },
      uSandWetColor: { value: new THREE.Color(parameters.sandWetColor ?? '#92704B') },
      uSandDeepWetColor: { value: new THREE.Color(parameters.sandDeepWetColor ?? '#70563E') },
      uCausticColor: { value: new THREE.Color(parameters.causticColor ?? '#BFFAFF') },
      uSunPosition: { value: new THREE.Vector3(12, 18, 10) },
      uDebugMode: { value: parameters.debugMode ?? 0 },
    }

    super({
      vertexShader: sandVertexShader,
      fragmentShader: sandFragmentShader,
      uniforms,
      side: THREE.DoubleSide,
      depthWrite: true,
    })
  }

  get time() { return this.uniforms.uTime.value }
  set time(v) { this.uniforms.uTime.value = v }
  get slope() { return this.uniforms.uSlope.value }
  set slope(v) { this.uniforms.uSlope.value = v }
  get waveHeight() { return this.uniforms.uWaveHeight.value }
  set waveHeight(v) { this.uniforms.uWaveHeight.value = v }
  get waveSpeed() { return this.uniforms.uWaveSpeed.value }
  set waveSpeed(v) { this.uniforms.uWaveSpeed.value = v }
  get swashRunup() { return this.uniforms.uSwashRunup.value }
  set swashRunup(v) { this.uniforms.uSwashRunup.value = v }
  get erosionRate() { return this.uniforms.uErosionRate.value }
  set erosionRate(v) { this.uniforms.uErosionRate.value = v }
  get depositionRate() { return this.uniforms.uDepositionRate.value }
  set depositionRate(v) { this.uniforms.uDepositionRate.value = v }
  get causticIntensity() { return this.uniforms.uCausticIntensity.value }
  set causticIntensity(v) { this.uniforms.uCausticIntensity.value = v }
  get causticScale() { return this.uniforms.uCausticScale.value }
  set causticScale(v) { this.uniforms.uCausticScale.value = v }
  get causticSpeed() { return this.uniforms.uCausticSpeed.value }
  set causticSpeed(v) { this.uniforms.uCausticSpeed.value = v }
  get sandDryColor() { return this.uniforms.uSandDryColor.value }
  set sandDryColor(v) { this.uniforms.uSandDryColor.value.set(v) }
  get sandMidColor() { return this.uniforms.uSandMidColor.value }
  set sandMidColor(v) { this.uniforms.uSandMidColor.value.set(v) }
  get sandWetColor() { return this.uniforms.uSandWetColor.value }
  set sandWetColor(v) { this.uniforms.uSandWetColor.value.set(v) }
  get sandDeepWetColor() { return this.uniforms.uSandDeepWetColor.value }
  set sandDeepWetColor(v) { this.uniforms.uSandDeepWetColor.value.set(v) }
  get causticColor() { return this.uniforms.uCausticColor.value }
  set causticColor(v) { this.uniforms.uCausticColor.value.set(v) }
  get debugMode() { return this.uniforms.uDebugMode.value }
  set debugMode(v) { this.uniforms.uDebugMode.value = v }
  get sunPosition() { return this.uniforms.uSunPosition.value }
  set sunPosition(v) { this.uniforms.uSunPosition.value.copy(v) }
}
